import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Currency, Prisma, RecurringRule } from '@prisma/client';
import { DateTime } from 'luxon';

import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRecurringRuleInput,
  CreateRuleOptions,
  ExistingRuleCriteria,
  RecurringRuleMutationResult,
  RecurringScheduleSnapshot,
} from './recurring.types';
import { recurringRuleInclude } from './recurring.prisma';
import {
  NormalizedRuleContext,
  calculateNextRun,
  formatTimeOfDay,
  normalizeTimeOfDay,
  normalizeTimezone,
  parseTimeOfDay,
} from './recurring.schedule';
import { extractNoteTokens, findExistingRecurringRule } from './recurring.matcher';

export type { CreateRecurringRuleInput } from './recurring.types';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  private readonly ruleInclude = recurringRuleInclude;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createRule(
    userId: string,
    input: CreateRecurringRuleInput,
    options: CreateRuleOptions = {},
  ): Promise<RecurringRuleMutationResult> {
    const appTimezone = this.configService.get<string>('APP_TIMEZONE');
    const prepared = this.prepareRuleData(input, appTimezone);

    const schedule: RecurringScheduleSnapshot = {
      freq: input.freq,
      dayOfMonth: input.dayOfMonth ?? null,
      weekday: input.weekday ?? null,
      timeOfDay:
        typeof prepared.sharedData.timeOfDay === 'string'
          ? (prepared.sharedData.timeOfDay as string)
          : null,
    };

    const noteTokens = extractNoteTokens(prepared.note ?? input.note ?? null);

    const criteria: ExistingRuleCriteria = {
      type: input.type,
      categoryId: prepared.categoryId,
      currency: prepared.currency,
      note: prepared.note,
      amount: prepared.amount,
    };

    const existing = await findExistingRecurringRule(this.prisma, userId, criteria, {
      preferUpdate: options.preferUpdate ?? false,
      noteTokens,
      schedule,
    });

    if (existing) {
      const updated = await this.prisma.recurringRule.update({
        where: { id: existing.id },
        data: prepared.sharedData,
        include: this.ruleInclude,
      });

      return { rule: updated, action: 'updated' };
    }

    const created = await this.prisma.recurringRule.create({
      data: {
        userId,
        ...prepared.sharedData,
      },
      include: this.ruleInclude,
    });

    return { rule: created, action: 'created' };
  }

  async processDueRules(limit = 50): Promise<void> {
    const now = new Date();
    const rules = await this.prisma.recurringRule.findMany({
      where: { enabled: true, nextRunAt: { lte: now } },
      orderBy: { nextRunAt: 'asc' },
      take: limit,
    });

    for (const rule of rules) {
      await this.executeRule(rule);
    }
  }

  private async executeRule(rule: RecurringRule & { categoryId?: string | null }) {
    const appTimezone = this.configService.get<string>('APP_TIMEZONE');
    const timezone = normalizeTimezone(appTimezone, rule.timezone);
    const timeOfDay = parseTimeOfDay(rule.timeOfDay);
    const start = DateTime.fromJSDate(rule.startDate)
      .setZone(timezone)
      .startOf('day')
      .set({ hour: timeOfDay.hour, minute: timeOfDay.minute, second: 0, millisecond: 0 });
    const end = rule.endDate
      ? DateTime.fromJSDate(rule.endDate)
          .setZone(timezone)
          .endOf('day')
      : undefined;

    const context: NormalizedRuleContext = {
      freq: rule.freq,
      dayOfMonth: rule.dayOfMonth ?? null,
      weekday: rule.weekday ?? null,
      hour: timeOfDay.hour,
      minute: timeOfDay.minute,
      timezone,
      start,
      end,
    };

    const currentRun = DateTime.fromJSDate(rule.nextRunAt).setZone(timezone);
    const occurrenceDate = currentRun.startOf('day');

    if (end && currentRun > end) {
      await this.disableRule(rule.id, 'Completed all scheduled occurrences');
      return;
    }

    const nextRun = calculateNextRun(context, currentRun.plus({ minutes: 1 }));

    const logKey = {
      recurringRuleId: rule.id,
      occurredDate: occurrenceDate.toUTC().toJSDate(),
    };

    try {
      await this.prisma.$transaction(async (tx) => {
        const existingLog = await tx.recurringRunLog.findUnique({
          where: { recurringRuleId_occurredDate: logKey },
        });

        if (existingLog) {
          if (nextRun) {
            await tx.recurringRule.update({
              where: { id: rule.id },
              data: { lastRunAt: rule.nextRunAt, nextRunAt: nextRun.toUTC().toJSDate() },
            });
          } else {
            await tx.recurringRule.update({
              where: { id: rule.id },
              data: { enabled: false, lastRunAt: rule.nextRunAt },
            });
          }
          return;
        }

        const transaction = await tx.transaction.create({
          data: {
            userId: rule.userId,
            type: rule.type,
            amount: rule.amount,
            currency: rule.currency,
            note: rule.note,
            occurredAt: currentRun.toUTC().toJSDate(),
            categoryId: rule.categoryId ?? null,
            meta: {
              source: 'recurring',
              recurringRuleId: rule.id,
              occurredDate: occurrenceDate.toISO(),
            } as Prisma.InputJsonValue,
          },
        });

        await tx.recurringRunLog.create({
          data: {
            ...logKey,
            txnId: transaction.id,
            status: 'SUCCESS',
            message: null,
          },
        });

        await tx.recurringRule.update({
          where: { id: rule.id },
          data: {
            lastRunAt: rule.nextRunAt,
            nextRunAt: nextRun ? nextRun.toUTC().toJSDate() : rule.nextRunAt,
            enabled: nextRun ? rule.enabled : false,
          },
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to execute recurring rule ${rule.id}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.prisma.recurringRunLog.upsert({
        where: { recurringRuleId_occurredDate: logKey },
        update: { status: 'ERROR', message },
        create: {
          recurringRuleId: rule.id,
          occurredDate: occurrenceDate.toUTC().toJSDate(),
          status: 'ERROR',
          message,
        },
      });
    }
  }

  private prepareRuleData(input: CreateRecurringRuleInput, appTimezone?: string) {
    const timezone = normalizeTimezone(appTimezone, input.timezone);
    const timeOfDay = normalizeTimeOfDay(input.timeOfDay);

    const start = DateTime.fromJSDate(input.startDate)
      .setZone(timezone)
      .startOf('day')
      .set({ hour: timeOfDay.hour, minute: timeOfDay.minute, second: 0, millisecond: 0 });

    const end = input.endDate
      ? DateTime.fromJSDate(input.endDate)
          .setZone(timezone)
          .endOf('day')
      : undefined;

    const context: NormalizedRuleContext = {
      freq: input.freq,
      dayOfMonth: input.dayOfMonth ?? null,
      weekday: input.weekday ?? null,
      hour: timeOfDay.hour,
      minute: timeOfDay.minute,
      timezone,
      start,
      end,
    };

    const nextRun = calculateNextRun(context, DateTime.now().setZone(timezone));

    if (!nextRun) {
      throw new Error('Unable to determine next run time for recurring rule');
    }

    const amount = new Prisma.Decimal(input.amount);
    const categoryId = input.categoryId ?? null;
    const currency = input.currency ?? Currency.VND;
    const note = input.note && input.note.trim().length > 0 ? input.note.trim() : null;

    const sharedData = {
      enabled: true,
      freq: input.freq,
      dayOfMonth: input.dayOfMonth ?? null,
      weekday: input.weekday ?? null,
      timeOfDay: formatTimeOfDay(timeOfDay.hour, timeOfDay.minute),
      timezone,
      startDate: start.toUTC().toJSDate(),
      endDate: end ? end.toUTC().toJSDate() : null,
      type: input.type,
      amount,
      currency,
      categoryId,
      note,
      nextRunAt: nextRun.toUTC().toJSDate(),
    } satisfies Prisma.RecurringRuleUncheckedUpdateInput;

    return {
      sharedData,
      amount,
      categoryId,
      currency,
      note,
    };
  }

  private async disableRule(ruleId: string, message: string) {
    await this.prisma.recurringRule.update({
      where: { id: ruleId },
      data: { enabled: false },
    });
    this.logger.log(`Recurring rule ${ruleId} disabled: ${message}`);
  }
}


