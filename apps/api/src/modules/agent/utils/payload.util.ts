import { Logger } from '@nestjs/common';
import { AgentPayload, AgentPayloadSchema } from '@expense-ai/shared';
import { DateTime } from 'luxon';

export function logRawCompletion(logger: Logger, raw: string): void {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  const preview = cleaned.length > 1000 ? `${cleaned.slice(0, 1000)}...` : cleaned;
  logger.debug(`Hyperbolic raw response preview: ${preview}`);
}

export function parseAgentPayload(logger: Logger, raw: string): AgentPayload {
  const jsonString = extractJsonString(raw);

  try {
    const parsed = JSON.parse(jsonString);
    return AgentPayloadSchema.parse(normalizeAgentPayload(parsed));
  } catch (error) {
    const fallback = findJsonObject(raw);
    if (fallback) {
      try {
        const parsedFallback = JSON.parse(fallback);
        return AgentPayloadSchema.parse(normalizeAgentPayload(parsedFallback));
      } catch (innerError) {
        logger.warn('Failed to parse JSON snippet from LLM response', innerError);
      }
    }
    throw error;
  }
}

function extractJsonString(raw: string): string {
  const withoutThinking = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const channelRegex =
    /<\|channel\|>([a-zA-Z0-9_]+)<\|message\|>([\s\S]*?)(?=(<\|channel\|>[a-zA-Z0-9_]+<\|message\|>)|$)/g;

  let finalContent: string | undefined;
  let fallbackContent: string | undefined;

  for (const match of withoutThinking.matchAll(channelRegex)) {
    const channel = match[1];
    const content = match[2].trim();

    if (channel === 'final') {
      finalContent = content;
      break;
    }

    if (!fallbackContent) {
      const candidate = findJsonObject(content);
      if (candidate) {
        fallbackContent = candidate;
      }
    }
  }

  const target = finalContent ?? fallbackContent ?? withoutThinking;
  const json = findJsonObject(target);

  if (!json) {
    throw new Error('No JSON object found in LLM response');
  }

  return json;
}

function findJsonObject(text: string): string | undefined {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : undefined;
}

function normalizeAgentPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const clone: Record<string, unknown> = { ...(payload as Record<string, unknown>) };

  // Convert null values to undefined for Zod schema compatibility
  for (const key in clone) {
    if (clone[key] === null) {
      delete clone[key];
    }
  }
  const occurredAt = clone.occurred_at;

  if (typeof occurredAt === 'string' && occurredAt.trim().length > 0) {
    const parsed = DateTime.fromISO(occurredAt, { setZone: true });
    if (parsed.isValid) {
      clone.occurred_at = parsed.toUTC().toISO();
    } else {
      const parsedUTC = DateTime.fromISO(occurredAt);
      if (parsedUTC.isValid) {
        clone.occurred_at = parsedUTC.toUTC().toISO();
      }
    }
  }

  const rawBudgetMonth = clone.budget_month;
  if (typeof rawBudgetMonth === 'string' && rawBudgetMonth.trim().length > 0) {
    const numericMonth = Number(rawBudgetMonth);
    clone.budget_month = Number.isFinite(numericMonth) ? numericMonth : rawBudgetMonth;
  }

  if (typeof clone.budget_month === 'number') {
    if (clone.budget_month < 1 || clone.budget_month > 12) {
      delete clone.budget_month;
    } else {
      clone.budget_month = Math.trunc(clone.budget_month);
    }
  }

  const rawBudgetYear = clone.budget_year;
  if (typeof rawBudgetYear === 'string' && rawBudgetYear.trim().length > 0) {
    const numericYear = Number(rawBudgetYear);
    clone.budget_year = Number.isFinite(numericYear) ? numericYear : rawBudgetYear;
  }

  if (typeof clone.budget_year === 'number') {
    if (clone.budget_year < 1900 || clone.budget_year > 3000) {
      delete clone.budget_year;
    } else {
      clone.budget_year = Math.trunc(clone.budget_year);
    }
  }

  const recurringStart = clone.recurring_start_date;
  if (typeof recurringStart === 'string' && recurringStart.trim().length > 0) {
    const parsed = DateTime.fromISO(recurringStart, { setZone: true });
    if (parsed.isValid) {
      clone.recurring_start_date = parsed.toUTC().toISO();
    }
  }

  const recurringEnd = clone.recurring_end_date;
  if (typeof recurringEnd === 'string' && recurringEnd.trim().length > 0) {
    const parsed = DateTime.fromISO(recurringEnd, { setZone: true });
    if (parsed.isValid) {
      clone.recurring_end_date = parsed.toUTC().toISO();
    }
  }

  const rawRecurringWeekday = clone.recurring_weekday;
  if (typeof rawRecurringWeekday === 'string' && rawRecurringWeekday.trim().length > 0) {
    const numericWeekday = Number(rawRecurringWeekday);
    clone.recurring_weekday = Number.isFinite(numericWeekday)
      ? numericWeekday
      : rawRecurringWeekday;
  }

  if (typeof clone.recurring_weekday === 'number') {
    if (clone.recurring_weekday < 0 || clone.recurring_weekday > 6) {
      delete clone.recurring_weekday;
    } else {
      clone.recurring_weekday = Math.trunc(clone.recurring_weekday);
    }
  }

  const rawRecurringDay = clone.recurring_day_of_month;
  if (typeof rawRecurringDay === 'string' && rawRecurringDay.trim().length > 0) {
    const numericDay = Number(rawRecurringDay);
    clone.recurring_day_of_month = Number.isFinite(numericDay) ? numericDay : rawRecurringDay;
  }

  if (typeof clone.recurring_day_of_month === 'number') {
    if (clone.recurring_day_of_month < 1 || clone.recurring_day_of_month > 31) {
      delete clone.recurring_day_of_month;
    } else {
      clone.recurring_day_of_month = Math.trunc(clone.recurring_day_of_month);
    }
  }

  const rawTimeOfDay = clone.recurring_time_of_day;
  if (typeof rawTimeOfDay === 'string' && rawTimeOfDay.trim().length > 0) {
    const normalized = normalizeTimeOfDay(rawTimeOfDay);
    if (normalized) {
      clone.recurring_time_of_day = normalized;
    }
  }

  return clone;
}

function normalizeTimeOfDay(value: string): string | undefined {
  const sanitized = value.trim().toLowerCase().replace(/\s+/g, '');
  const match = sanitized.match(/^(\d{1,2})(?::|h)?(\d{1,2})?$/);
  if (!match) {
    return undefined;
  }

  const hour = Math.min(Math.max(Number(match[1]), 0), 23);
  const minute = match[2] ? Math.min(Math.max(Number(match[2]), 0), 59) : 0;

  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
