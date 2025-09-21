import { DateTime } from "luxon";
import { TimePeriod, TimePeriodEnum } from "@expense-ai/shared";

export interface ResolveDateRangeInput {
  period?: TimePeriod;
  dateFrom?: string;
  dateTo?: string;
  timezone?: string;
  now?: Date;
}

export interface ResolvedDateRange {
  start?: Date;
  end?: Date;
}

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

export function resolveDateRange(params: ResolveDateRangeInput): ResolvedDateRange {
  const { period, dateFrom, dateTo, timezone = DEFAULT_TIMEZONE, now = new Date() } = params;

  if (!period && !dateFrom && !dateTo) {
    return {};
  }

  const current = DateTime.fromJSDate(now, { zone: timezone });

  if (dateFrom || dateTo) {
    const start = dateFrom ? DateTime.fromISO(dateFrom, { zone: timezone }) : undefined;
    const end = dateTo ? DateTime.fromISO(dateTo, { zone: timezone }) : undefined;

    return {
      start: start?.isValid ? start.toJSDate() : undefined,
      end: end?.isValid ? end.toJSDate() : undefined,
    };
  }

  if (!period) {
    return {};
  }

  switch (period) {
    case TimePeriodEnum.Today: {
      const start = current.startOf("day");
      const end = current.endOf("day");
      return { start: start.toJSDate(), end: end.toJSDate() };
    }
    case TimePeriodEnum.Yesterday: {
      const start = current.minus({ days: 1 }).startOf("day");
      const end = current.minus({ days: 1 }).endOf("day");
      return { start: start.toJSDate(), end: end.toJSDate() };
    }
    case TimePeriodEnum.ThisWeek: {
      const start = current.startOf("week");
      const end = current.endOf("week");
      return { start: start.toJSDate(), end: end.toJSDate() };
    }
    case TimePeriodEnum.ThisMonth: {
      const start = current.startOf("month");
      const end = current.endOf("month");
      return { start: start.toJSDate(), end: end.toJSDate() };
    }
    case TimePeriodEnum.LastMonth: {
      const start = current.minus({ months: 1 }).startOf("month");
      const end = current.minus({ months: 1 }).endOf("month");
      return { start: start.toJSDate(), end: end.toJSDate() };
    }
    case TimePeriodEnum.ThisYear: {
      const start = current.startOf("year");
      const end = current.endOf("year");
      return { start: start.toJSDate(), end: end.toJSDate() };
    }
    default:
      return {};
  }
}
