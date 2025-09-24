import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DateTime } from "luxon";
import { Currency, Prisma, RecurringFrequency } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { DEFAULT_TIMEZONE } from "../common/constants/timezone.constants";
import { TransactionsService } from "../transactions/transactions.service";
import { CreateRecurringTransactionDto } from "./dto/create-recurring-transaction.dto";
import { CreateTransactionDto } from "../transactions/dto/create-transaction.dto";

const MAX_CATCH_UP_OCCURRENCES = 24;

type RecurringWithCategory = Prisma.RecurringTransactionGetPayload<{
  include: { category: true };
}>;

type ScheduleConfig = {
  frequency: RecurringFrequency;
  interval: number;
  dayOfMonth?: number | null;
  weekday?: number | null;
};

@Injectable()
export class RecurringTransactionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecurringTransactionsService.name);
  private schedulerHandle: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async onModuleInit() {
    await this.safeProcessDueOccurrences("startup");
    this.schedulerHandle = setInterval(() => {
      void this.safeProcessDueOccurrences("interval");
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.schedulerHandle) {
      clearInterval(this.schedulerHandle);
      this.schedulerHandle = null;
    }
  }

  async create(userId: string, dto: CreateRecurringTransactionDto) {
    const timezone = this.resolveTimezone(dto.timezone);
    const startDate = this.parseDate(dto.startDate, timezone, "startDate");
    const endDate = dto.endDate ? this.parseDate(dto.endDate, timezone, "endDate") : null;

    if (endDate && endDate < startDate) {
      throw new BadRequestException("endDate must be greater than or equal to startDate");
    }

    const interval = dto.interval ?? 1;
    const schedule: ScheduleConfig = {
      frequency: dto.frequency,
      interval,
      dayOfMonth:
        dto.frequency === RecurringFrequency.MONTHLY
          ? dto.dayOfMonth ?? startDate.day
          : undefined,
      weekday:
        dto.frequency === RecurringFrequency.WEEKLY ? dto.weekday ?? startDate.weekday : undefined,
    };

    if (schedule.frequency === RecurringFrequency.MONTHLY && !schedule.dayOfMonth) {
      throw new BadRequestException("dayOfMonth is required for monthly recurring transactions");
    }

    if (schedule.frequency === RecurringFrequency.WEEKLY && !schedule.weekday) {
      throw new BadRequestException("weekday is required for weekly recurring transactions");
    }

    const firstOccurrence = this.resolveInitialOccurrence(startDate, schedule);

    if (endDate && firstOccurrence > endDate) {
      throw new BadRequestException("startDate is after the specified endDate");
    }

    const record = await this.prisma.recurringTransaction.create({
      data: {
        userId,
        type: dto.type,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency ?? Currency.VND,
        note: dto.note,
        categoryId: dto.categoryId,
        frequency: schedule.frequency,
        interval: schedule.interval,
        dayOfMonth: schedule.dayOfMonth ?? null,
        weekday: schedule.weekday ?? null,
        startDate: firstOccurrence.toUTC().toJSDate(),
        endDate: endDate ? endDate.toUTC().toJSDate() : null,
        timezone,
        nextRunAt: firstOccurrence.toUTC().toJSDate(),
      },
      include: { category: true },
    });

    return this.toResponse(record);
  }

  async list(userId: string) {
    const items = await this.prisma.recurringTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });

    return items.map((item) => this.toResponse(item));
  }

  async cancel(userId: string, id: string) {
    const existing = await this.prisma.recurringTransaction.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException("Recurring transaction not found");
    }

    await this.prisma.recurringTransaction.update({
      where: { id },
      data: {
        isActive: false,
        nextRunAt: null,
      },
    });

    return { success: true };
  }

  async processDueOccurrences(nowInput?: Date | DateTime) {
    const now = nowInput
      ? nowInput instanceof DateTime
        ? nowInput
        : DateTime.fromJSDate(nowInput)
      : DateTime.utc();

    const due = await this.prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now.toJSDate() },
      },
      orderBy: { nextRunAt: "asc" },
      take: 50,
      include: { category: true },
    });

    for (const recurrence of due) {
      try {
        await this.processSingleRecurrence(recurrence, now);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to process recurring transaction ${recurrence.id}: ${message}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private async processSingleRecurrence(recurrence: RecurringWithCategory, nowUtc: DateTime) {
    const timezone = this.resolveTimezone(recurrence.timezone);
    const endDate = recurrence.endDate
      ? DateTime.fromJSDate(recurrence.endDate).setZone(timezone)
      : null;
    const schedule: ScheduleConfig = {
      frequency: recurrence.frequency,
      interval: recurrence.interval,
      dayOfMonth: recurrence.dayOfMonth ?? undefined,
      weekday: recurrence.weekday ?? undefined,
    };

    let nextOccurrence = recurrence.nextRunAt
      ? DateTime.fromJSDate(recurrence.nextRunAt).setZone(timezone)
      : this.resolveInitialOccurrence(
          DateTime.fromJSDate(recurrence.startDate).setZone(timezone),
          schedule,
        );
    const nowZoned = nowUtc.setZone(timezone);

    const occurrences: DateTime[] = [];
    let iterations = 0;

    while (
      nextOccurrence <= nowZoned &&
      (!endDate || nextOccurrence <= endDate) &&
      iterations < MAX_CATCH_UP_OCCURRENCES
    ) {
      occurrences.push(nextOccurrence);
      nextOccurrence = this.computeNextOccurrence(nextOccurrence, schedule);
      iterations += 1;
    }

    const lastOccurrence = occurrences[occurrences.length - 1];
    const withinEndWindow = !endDate || nextOccurrence <= endDate;
    const shouldContinue = withinEndWindow && nextOccurrence.isValid;
    const reachedCatchUpLimit =
      iterations >= MAX_CATCH_UP_OCCURRENCES && nextOccurrence <= nowZoned && shouldContinue;

    for (const occurrence of occurrences) {
      await this.createOccurrenceTransaction(recurrence, occurrence);
    }

    const updateData: Prisma.RecurringTransactionUpdateInput = {};

    if (lastOccurrence) {
      updateData.lastRunAt = lastOccurrence.toUTC().toJSDate();
    }

    if (shouldContinue) {
      updateData.nextRunAt = nextOccurrence.toUTC().toJSDate();

      if (reachedCatchUpLimit) {
        this.logger.debug(
          `Recurring transaction ${recurrence.id} still has pending occurrences after reaching processing limit; will continue on next cycle.`,
        );
      }
    } else {
      updateData.nextRunAt = null;
      updateData.isActive = false;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.recurringTransaction.update({
        where: { id: recurrence.id },
        data: updateData,
      });
    }
  }

  private async createOccurrenceTransaction(
    recurrence: RecurringWithCategory,
    occurrence: DateTime,
  ): Promise<void> {
    try {
      const dto: CreateTransactionDto = {
        type: recurrence.type,
        amount: recurrence.amount.toNumber(),
        currency: recurrence.currency,
        note: recurrence.note ?? undefined,
        categoryId: recurrence.categoryId ?? undefined,
        occurredAt: occurrence.toUTC().toISO(),
      };

      await this.transactionsService.create(recurrence.userId, dto, {
        scheduledFor: occurrence.toUTC().toJSDate(),
        recurringTransactionId: recurrence.id,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        this.logger.debug(
          `Skipping duplicate occurrence for recurring transaction ${recurrence.id} at ${occurrence.toISO()}`,
        );
        return;
      }

      throw error;
    }
  }

  private resolveInitialOccurrence(startDate: DateTime, schedule: ScheduleConfig): DateTime {
    switch (schedule.frequency) {
      case RecurringFrequency.MONTHLY: {
        const day = schedule.dayOfMonth ?? startDate.day;
        return this.resolveMonthlyOccurrence(startDate, day);
      }
      case RecurringFrequency.WEEKLY: {
        const weekday = schedule.weekday ?? startDate.weekday;
        return this.resolveWeeklyOccurrence(startDate, weekday);
      }
      default:
        return startDate;
    }
  }

  private computeNextOccurrence(previous: DateTime, schedule: ScheduleConfig): DateTime {
    switch (schedule.frequency) {
      case RecurringFrequency.MONTHLY: {
        const nextBase = previous.plus({ months: schedule.interval });
        const day = schedule.dayOfMonth ?? nextBase.day;
        return this.resolveMonthlyOccurrence(nextBase, day);
      }
      case RecurringFrequency.WEEKLY:
        return previous.plus({ weeks: schedule.interval });
      case RecurringFrequency.DAILY:
      default:
        return previous.plus({ days: schedule.interval });
    }
  }

  private resolveMonthlyOccurrence(base: DateTime, targetDay: number): DateTime {
    let candidate = base.set({ day: Math.min(targetDay, base.endOf("month").day) });

    if (candidate < base) {
      const nextMonth = base.plus({ months: 1 });
      candidate = nextMonth.set({ day: Math.min(targetDay, nextMonth.endOf("month").day) });
    }

    return candidate;
  }

  private resolveWeeklyOccurrence(base: DateTime, targetWeekday: number): DateTime {
    const normalized = ((targetWeekday - 1) % 7) + 1;
    const diff = (normalized - base.weekday + 7) % 7;
    return diff === 0 ? base : base.plus({ days: diff });
  }

  private parseDate(value: string, timezone: string, field: string): DateTime {
    const parsed = DateTime.fromISO(value, { zone: timezone });
    if (!parsed.isValid) {
      throw new BadRequestException(`${field} is not a valid ISO date`);
    }
    return parsed;
  }

  private resolveTimezone(timezone?: string | null): string {
    const candidate = timezone ?? this.configService.get<string>("APP_TIMEZONE") ?? DEFAULT_TIMEZONE;
    const test = DateTime.now().setZone(candidate);
    if (!test.isValid) {
      throw new BadRequestException("Invalid timezone");
    }
    return candidate;
  }

  private toResponse(recurrence: RecurringWithCategory) {
    return {
      id: recurrence.id,
      type: recurrence.type,
      amount: recurrence.amount.toNumber(),
      currency: recurrence.currency,
      note: recurrence.note,
      category: recurrence.category
        ? { id: recurrence.category.id, name: recurrence.category.name }
        : null,
      frequency: recurrence.frequency,
      interval: recurrence.interval,
      dayOfMonth: recurrence.dayOfMonth,
      weekday: recurrence.weekday,
      startDate: recurrence.startDate.toISOString(),
      endDate: recurrence.endDate?.toISOString() ?? null,
      timezone: recurrence.timezone,
      nextRunAt: recurrence.nextRunAt?.toISOString() ?? null,
      lastRunAt: recurrence.lastRunAt?.toISOString() ?? null,
      isActive: recurrence.isActive,
      createdAt: recurrence.createdAt.toISOString(),
      updatedAt: recurrence.updatedAt.toISOString(),
    };
  }

  private async safeProcessDueOccurrences(trigger: string) {
    if (this.isProcessing) {
      this.logger.debug(
        `Recurring transaction processor is already running; skipping trigger "${trigger}" to avoid overlap.`,
      );
      return;
    }

    this.isProcessing = true;

    try {
      await this.processDueOccurrences();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Processing recurring transactions failed (${trigger}): ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isProcessing = false;
    }
  }
}
