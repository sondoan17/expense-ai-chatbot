import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Currency,
  Prisma,
  RecurringFreq,
  RecurringRule,
  TxnType,
} from '@prisma/client';
import { DateTime } from 'luxon';

import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_TIME_OF_DAY = '07:00';
const MAX_ITERATIONS = 500;

export interface CreateRecurringRuleInput {
  freq: RecurringFreq;
  dayOfMonth?: number | null;
  weekday?: number | null;
  timeOfDay?: string | null;
  timezone?: string | null;
  startDate: Date;
  endDate?: Date | null;
  type: TxnType;
  amount: number;
  currency?: Currency;
  categoryId?: string | null;
  note?: string | null;
}

interface NormalizedRuleContext {
  freq: RecurringFreq;
  dayOfMonth?: number | null;
  weekday?: number | null;
  hour: number;
  minute: number;
  timezone: string;
  start: DateTime;
  end?: DateTime | null;
}

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  private readonly ruleInclude = { category: true } as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createRule(
    userId: string,
    input: CreateRecurringRuleInput,
  ): Promise<Prisma.RecurringRuleGetPayload<{ include: typeof this.ruleInclude }>> {
    const timezone = this.normalizeTimezone(input.timezone);
    const timeOfDay = this.normalizeTimeOfDay(input.timeOfDay);

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

    const nextRun = this.calculateNextRun(context, DateTime.now().setZone(timezone));

    if (!nextRun) {
      throw new Error('Unable to determine next run time for recurring rule');
    }

    const rule = await this.prisma.recurringRule.create({
      data: {
        userId,
        enabled: true,
        freq: input.freq,
        dayOfMonth: input.dayOfMonth ?? null,
        weekday: input.weekday ?? null,
        timeOfDay: this.formatTimeOfDay(timeOfDay.hour, timeOfDay.minute),
        timezone,
        startDate: start.toUTC().toJSDate(),
        endDate: end ? end.toUTC().toJSDate() : null,
        type: input.type,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency ?? Currency.VND,
        categoryId: input.categoryId ?? null,
        note: input.note ?? null,
        nextRunAt: nextRun.toUTC().toJSDate(),
      },
      include: this.ruleInclude,
    });

    return rule;
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
    const timezone = this.normalizeTimezone(rule.timezone);
    const timeOfDay = this.parseTimeOfDay(rule.timeOfDay);
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

    const nextRun = this.calculateNextRun(context, currentRun.plus({ minutes: 1 }));

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

  private normalizeTimezone(input?: string | null): string {
    if (input && input.trim().length > 0) {
      return input.trim();
    }
    return this.configService.get<string>('APP_TIMEZONE') ?? DEFAULT_TIMEZONE;
  }

  private normalizeTimeOfDay(input?: string | null): { hour: number; minute: number } {
    if (input) {
      return this.parseTimeOfDay(input);
    }
    return this.parseTimeOfDay(DEFAULT_TIME_OF_DAY);
  }

  private parseTimeOfDay(value: string | null): { hour: number; minute: number } {
    if (!value) {
      return { hour: 7, minute: 0 };
    }

    const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
    const match = normalized.match(/^(\d{1,2})(?::|h)?(\d{1,2})?$/);

    if (match) {
      const hour = Math.min(Math.max(Number(match[1]), 0), 23);
      const minute = match[2] ? Math.min(Math.max(Number(match[2]), 0), 59) : 0;
      return { hour, minute };
    }

    return { hour: 7, minute: 0 };
  }

  private formatTimeOfDay(hour: number, minute: number): string {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  private calculateNextRun(context: NormalizedRuleContext, after: DateTime): DateTime | null {
    const reference = after < context.start ? context.start : after;
    let cursor = reference;

    for (let iterations = 0; iterations < MAX_ITERATIONS; iterations += 1) {
      const occurrence = this.buildOccurrence(cursor, context);
      if (!occurrence) {
        return null;
      }

      if (occurrence < context.start) {
        cursor = this.incrementCursor(context, occurrence);
        continue;
      }

      if (occurrence <= reference) {
        cursor = this.incrementCursor(context, occurrence);
        continue;
      }

      if (context.end && occurrence > context.end) {
        return null;
      }

      return occurrence;
    }

    return null;
  }

  private buildOccurrence(cursor: DateTime, context: NormalizedRuleContext): DateTime | null {
    switch (context.freq) {
      case RecurringFreq.DAILY:
        return cursor.set({
          hour: context.hour,
          minute: context.minute,
          second: 0,
          millisecond: 0,
        });
      case RecurringFreq.WEEKLY: {
        const base = cursor.set({
          hour: context.hour,
          minute: context.minute,
          second: 0,
          millisecond: 0,
        });
        const targetWeekday = this.normalizeWeekday(context.weekday, context.start.weekday);
        const diff = (targetWeekday + 7 - base.weekday) % 7;
        return base.plus({ days: diff });
      }
      case RecurringFreq.MONTHLY: {
        const monthAnchor = cursor
          .startOf('month')
          .set({ hour: context.hour, minute: context.minute, second: 0, millisecond: 0 });
        const day = this.resolveDayOfMonth(context.dayOfMonth, monthAnchor, context.start.day);
        return monthAnchor.set({ day });
      }
      case RecurringFreq.YEARLY: {
        const baseMonth = context.start.month;
        const baseDay = context.start.day;
        const anchor = cursor
          .set({ month: baseMonth })
          .startOf('month')
          .set({ hour: context.hour, minute: context.minute, second: 0, millisecond: 0 });
        const day = Math.min(baseDay, anchor.daysInMonth);
        return anchor.set({ day });
      }
      default:
        return null;
    }
  }

  private incrementCursor(context: NormalizedRuleContext, occurrence: DateTime): DateTime {
    switch (context.freq) {
      case RecurringFreq.DAILY:
        return occurrence.plus({ days: 1 });
      case RecurringFreq.WEEKLY:
        return occurrence.plus({ weeks: 1 });
      case RecurringFreq.MONTHLY:
        return occurrence.plus({ months: 1 }).startOf('month');
      case RecurringFreq.YEARLY:
        return occurrence.plus({ years: 1 }).startOf('year');
      default:
        return occurrence.plus({ days: 1 });
    }
  }

  private normalizeWeekday(weekday: number | null | undefined, fallback: number): number {
    if (typeof weekday === 'number') {
      if (weekday === 0) {
        return 7;
      }
      return Math.min(Math.max(weekday, 1), 7);
    }
    return Math.min(Math.max(fallback, 1), 7);
  }

  private resolveDayOfMonth(
    dayOfMonth: number | null | undefined,
    reference: DateTime,
    fallbackDay: number,
  ): number {
    const base = typeof dayOfMonth === 'number' ? dayOfMonth : fallbackDay;
    const target = Math.min(Math.max(base, 1), 31);
    return Math.min(target, reference.daysInMonth);
  }

  private async disableRule(ruleId: string, message: string) {
    await this.prisma.recurringRule.update({
      where: { id: ruleId },
      data: { enabled: false },
    });
    this.logger.log(`Recurring rule ${ruleId} disabled: ${message}`);
  }
}
