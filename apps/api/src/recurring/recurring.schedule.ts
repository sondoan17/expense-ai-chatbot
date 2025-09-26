import { RecurringFreq } from '@prisma/client';
import { DateTime } from 'luxon';

import {
  DEFAULT_TIME_OF_DAY,
  DEFAULT_TIMEZONE,
  MAX_ITERATIONS,
} from './recurring.constants';

export interface TimeOfDay {
  hour: number;
  minute: number;
}

export interface NormalizedRuleContext {
  freq: RecurringFreq;
  dayOfMonth?: number | null;
  weekday?: number | null;
  hour: number;
  minute: number;
  timezone: string;
  start: DateTime;
  end?: DateTime | null;
}

export function normalizeTimezone(
  appTimezone: string | undefined,
  input?: string | null,
): string {
  if (input && input.trim().length > 0) {
    return input.trim();
  }

  return appTimezone ?? DEFAULT_TIMEZONE;
}

export function parseTimeOfDay(value?: string | null): TimeOfDay {
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

export function normalizeTimeOfDay(value?: string | null): TimeOfDay {
  if (value) {
    return parseTimeOfDay(value);
  }

  return parseTimeOfDay(DEFAULT_TIME_OF_DAY);
}

export function formatTimeOfDay(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function calculateNextRun(
  context: NormalizedRuleContext,
  after: DateTime,
): DateTime | null {
  const reference = after < context.start ? context.start : after;
  let cursor = reference;

  for (let iterations = 0; iterations < MAX_ITERATIONS; iterations += 1) {
    const occurrence = buildOccurrence(cursor, context);
    if (!occurrence) {
      return null;
    }

    if (occurrence < context.start) {
      cursor = incrementCursor(context, occurrence);
      continue;
    }

    if (occurrence <= reference) {
      cursor = incrementCursor(context, occurrence);
      continue;
    }

    if (context.end && occurrence > context.end) {
      return null;
    }

    return occurrence;
  }

  return null;
}

function buildOccurrence(cursor: DateTime, context: NormalizedRuleContext): DateTime | null {
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
      const targetWeekday = normalizeWeekday(context.weekday, context.start.weekday);
      const diff = (targetWeekday + 7 - base.weekday) % 7;
      return base.plus({ days: diff });
    }
    case RecurringFreq.MONTHLY: {
      const monthAnchor = cursor
        .startOf('month')
        .set({ hour: context.hour, minute: context.minute, second: 0, millisecond: 0 });
      const day = resolveDayOfMonth(context.dayOfMonth, monthAnchor, context.start.day);
      return monthAnchor.set({ day });
    }
    case RecurringFreq.YEARLY: {
      const baseMonth = context.start.month;
      const baseDay = context.start.day;
      const anchor = cursor
        .set({ month: baseMonth })
        .startOf('month')
        .set({ hour: context.hour, minute: context.minute, second: 0, millisecond: 0 });
      const anchorDaysInMonth = anchor.daysInMonth ?? 31;
      const day = Math.min(baseDay, anchorDaysInMonth);
      return anchor.set({ day });
    }
    default:
      return null;
  }
}

function incrementCursor(context: NormalizedRuleContext, occurrence: DateTime): DateTime {
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

function normalizeWeekday(weekday: number | null | undefined, fallback: number): number {
  if (typeof weekday === 'number') {
    if (weekday === 0) {
      return 7;
    }
    return Math.min(Math.max(weekday, 1), 7);
  }
  return Math.min(Math.max(fallback, 1), 7);
}

function resolveDayOfMonth(
  dayOfMonth: number | null | undefined,
  reference: DateTime,
  fallbackDay: number,
): number {
  const base = typeof dayOfMonth === 'number' ? dayOfMonth : fallbackDay;
  const target = Math.min(Math.max(base, 1), 31);
  const daysInMonth = reference.daysInMonth ?? 31;
  return Math.min(target, daysInMonth);
}
