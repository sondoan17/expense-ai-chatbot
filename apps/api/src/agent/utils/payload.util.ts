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
  const channelRegex = /<\|channel\|>([a-zA-Z0-9_]+)<\|message\|>([\s\S]*?)(?=(<\|channel\|>[a-zA-Z0-9_]+<\|message\|>)|$)/g;

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

  return clone;
}
