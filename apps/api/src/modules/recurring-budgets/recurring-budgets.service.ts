import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Currency, Prisma, RecurringBudgetRule } from '@prisma/client';
import { DateTime } from 'luxon';

import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRecurringBudgetRuleInput,
  CreateRecurringBudgetRuleOptions,
  ExistingRecurringBudgetRuleCriteria,
  RecurringBudgetRuleMutationResult,
  RecurringBudgetScheduleSnapshot,
} from './recurring-budgets.types';
import {
  recurringBudgetRuleInclude,
  RecurringBudgetRuleWithCategory,
} from './recurring-budgets.prisma';
import {
  NormalizedRecurringBudgetRuleContext,
  calculateNextRun,
  formatTimeOfDay,
  normalizeTimeOfDay,
  normalizeTimezone,
  parseTimeOfDay,
} from './recurring-budgets.schedule';
import { extractNoteTokens, findExistingRecurringBudgetRule } from './recurring-budgets.matcher';

export type { CreateRecurringBudgetRuleInput } from './recurring-budgets.types';

@Injectable()
export class RecurringBudgetsService {
  private readonly logger = new Logger(RecurringBudgetsService.name);

  private readonly ruleInclude = recurringBudgetRuleInclude;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createRule(
    userId: string,
    input: CreateRecurringBudgetRuleInput,
    options: CreateRecurringBudgetRuleOptions = {},
  ): Promise<RecurringBudgetRuleMutationResult> {
    const appTimezone = this.configService.get<string>('APP_TIMEZONE');
    const prepared = this.prepareRuleData(input, appTimezone);

    const schedule: RecurringBudgetScheduleSnapshot = {
      freq: input.freq,
      dayOfMonth: input.dayOfMonth ?? null,
      weekday: input.weekday ?? null,
      timeOfDay:
        typeof prepared.sharedData.timeOfDay === 'string'
          ? (prepared.sharedData.timeOfDay as string)
          : null,
    };

    const noteTokens = extractNoteTokens(prepared.note ?? input.note ?? null);

    const criteria: ExistingRecurringBudgetRuleCriteria = {
      categoryId: prepared.categoryId,
      currency: prepared.currency,
      note: prepared.note,
      amount: prepared.amount,
    };

    const existing = await findExistingRecurringBudgetRule(this.prisma, userId, criteria, {
      preferUpdate: options.preferUpdate ?? false,
      noteTokens,
      schedule,
    });

    if (existing) {
      const updated = await this.prisma.recurringBudgetRule.update({
        where: { id: existing.id },
        data: prepared.sharedData,
        include: this.ruleInclude,
      });

      return { rule: updated, action: 'updated' };
    }

    const created = await this.prisma.recurringBudgetRule.create({
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
    const rules = await this.prisma.recurringBudgetRule.findMany({
      where: { enabled: true, nextRunAt: { lte: now } },
      orderBy: { nextRunAt: 'asc' },
      take: limit,
    });

    for (const rule of rules) {
      await this.executeRule(rule);
    }
  }

  private async executeRule(rule: RecurringBudgetRule & { categoryId?: string | null }) {
    const appTimezone = this.configService.get<string>('APP_TIMEZONE');
    const timezone = normalizeTimezone(appTimezone, rule.timezone);
    const timeOfDay = parseTimeOfDay(rule.timeOfDay);
    const start = DateTime.fromJSDate(rule.startDate)
      .setZone(timezone)
      .startOf('day')
      .set({ hour: timeOfDay.hour, minute: timeOfDay.minute, second: 0, millisecond: 0 });
    const end = rule.endDate
      ? DateTime.fromJSDate(rule.endDate).setZone(timezone).endOf('day')
      : undefined;

    const context: NormalizedRecurringBudgetRuleContext = {
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
      recurringBudgetRuleId: rule.id,
      occurredDate: occurrenceDate.toUTC().toJSDate(),
    };

    try {
      await this.prisma.$transaction(async (tx) => {
        const existingLog = await tx.recurringBudgetRunLog.findUnique({
          where: { recurringBudgetRuleId_occurredDate: logKey },
        });

        if (existingLog) {
          if (nextRun) {
            await tx.recurringBudgetRule.update({
              where: { id: rule.id },
              data: { lastRunAt: rule.nextRunAt, nextRunAt: nextRun.toUTC().toJSDate() },
            });
          } else {
            await tx.recurringBudgetRule.update({
              where: { id: rule.id },
              data: { enabled: false, lastRunAt: rule.nextRunAt },
            });
          }
          return;
        }

        // Tạo budget cho tháng hiện tại
        const budgetMonth = currentRun.month;
        const budgetYear = currentRun.year;

        // Kiểm tra xem budget đã tồn tại chưa
        const existingBudget = await tx.budget.findFirst({
          where: {
            userId: rule.userId,
            year: budgetYear,
            month: budgetMonth,
            categoryId: rule.categoryId ?? null,
          },
        });

        let budgetId: string | null = null;

        if (!existingBudget) {
          const budget = await tx.budget.create({
            data: {
              userId: rule.userId,
              year: budgetYear,
              month: budgetMonth,
              categoryId: rule.categoryId ?? null,
              limitAmount: rule.amount,
              currency: rule.currency,
            },
          });
          budgetId = budget.id;
        } else {
          // Cập nhật budget hiện tại nếu cần
          const updatedBudget = await tx.budget.update({
            where: { id: existingBudget.id },
            data: {
              limitAmount: rule.amount,
              currency: rule.currency,
            },
          });
          budgetId = updatedBudget.id;
        }

        await tx.recurringBudgetRunLog.create({
          data: {
            ...logKey,
            budgetId,
            status: 'SUCCESS',
            message: null,
          },
        });

        await tx.recurringBudgetRule.update({
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
        `Failed to execute recurring budget rule ${rule.id}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.prisma.recurringBudgetRunLog.upsert({
        where: { recurringBudgetRuleId_occurredDate: logKey },
        update: { status: 'ERROR', message },
        create: {
          recurringBudgetRuleId: rule.id,
          occurredDate: occurrenceDate.toUTC().toJSDate(),
          status: 'ERROR',
          message,
        },
      });
    }
  }

  private prepareRuleData(input: CreateRecurringBudgetRuleInput, appTimezone?: string) {
    const timezone = normalizeTimezone(appTimezone, input.timezone);
    const timeOfDay = normalizeTimeOfDay(input.timeOfDay);

    const start = DateTime.fromJSDate(input.startDate)
      .setZone(timezone)
      .startOf('day')
      .set({ hour: timeOfDay.hour, minute: timeOfDay.minute, second: 0, millisecond: 0 });

    const end = input.endDate
      ? DateTime.fromJSDate(input.endDate).setZone(timezone).endOf('day')
      : undefined;

    const context: NormalizedRecurringBudgetRuleContext = {
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
      throw new Error('Unable to determine next run time for recurring budget rule');
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
      amount,
      currency,
      categoryId,
      note,
      nextRunAt: nextRun.toUTC().toJSDate(),
    } satisfies Prisma.RecurringBudgetRuleUncheckedUpdateInput;

    return {
      sharedData,
      amount,
      categoryId,
      currency,
      note,
    };
  }

  async findAll(userId: string) {
    const rules = await this.prisma.recurringBudgetRule.findMany({
      where: { userId },
      include: this.ruleInclude,
      orderBy: { createdAt: 'desc' },
    });

    return rules.map((rule: RecurringBudgetRuleWithCategory) => this.toResponse(rule));
  }

  async findOne(userId: string, ruleId: string) {
    const rule = await this.prisma.recurringBudgetRule.findFirst({
      where: { id: ruleId, userId },
      include: this.ruleInclude,
    });

    if (!rule) {
      throw new Error('Recurring budget rule not found');
    }

    return this.toResponse(rule);
  }

  async remove(userId: string, ruleId: string) {
    const rule = await this.prisma.recurringBudgetRule.findFirst({
      where: { id: ruleId, userId },
    });

    if (!rule) {
      throw new Error('Recurring budget rule not found');
    }

    await this.prisma.recurringBudgetRule.delete({
      where: { id: ruleId },
    });

    return { success: true };
  }

  private toResponse(rule: RecurringBudgetRuleWithCategory) {
    return {
      id: rule.id,
      enabled: rule.enabled,
      freq: rule.freq,
      dayOfMonth: rule.dayOfMonth,
      weekday: rule.weekday,
      timeOfDay: rule.timeOfDay,
      timezone: rule.timezone,
      startDate: rule.startDate.toISOString(),
      endDate: rule.endDate?.toISOString() ?? null,
      amount: rule.amount.toNumber(),
      currency: rule.currency,
      category: rule.category ? { id: rule.category.id, name: rule.category.name } : null,
      note: rule.note,
      nextRunAt: rule.nextRunAt.toISOString(),
      lastRunAt: rule.lastRunAt?.toISOString() ?? null,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  private async disableRule(ruleId: string, message: string) {
    await this.prisma.recurringBudgetRule.update({
      where: { id: ruleId },
      data: { enabled: false },
    });
    this.logger.log(`Recurring budget rule ${ruleId} disabled: ${message}`);
  }
}
