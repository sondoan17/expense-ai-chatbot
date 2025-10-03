import { normalizeText } from '@expense-ai/shared';
import { RecurringFreq } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  FUZZY_NOTE_MATCH_MIN_COMMON,
  FUZZY_NOTE_MATCH_THRESHOLD,
  MAX_FUZZY_NOTE_CANDIDATES,
  UPDATE_NOTE_KEYWORDS,
} from './recurring.constants';
import {
  ExistingRuleCriteria,
  FindExistingRuleOptions,
} from './recurring.types';
import { RecurringRuleWithCategory, recurringRuleInclude } from './recurring.prisma';

const WHITESPACE_REGEX = /\s+/g;

export async function findExistingRecurringRule(
  prisma: PrismaService,
  userId: string,
  criteria: ExistingRuleCriteria,
  options: FindExistingRuleOptions = {},
): Promise<RecurringRuleWithCategory | null> {
  const trimmedNote = criteria.note?.trim();

  if (trimmedNote) {
    const noteMatch = await prisma.recurringRule.findFirst({
      where: {
        userId,
        type: criteria.type,
        currency: criteria.currency,
        categoryId: criteria.categoryId,
        note: { equals: trimmedNote, mode: 'insensitive' },
      },
      orderBy: { updatedAt: 'desc' },
      include: recurringRuleInclude,
    });

    if (noteMatch) {
      return noteMatch;
    }
  }

  const amountMatch = await prisma.recurringRule.findFirst({
    where: {
      userId,
      type: criteria.type,
      currency: criteria.currency,
      categoryId: criteria.categoryId,
      amount: criteria.amount,
    },
    orderBy: { updatedAt: 'desc' },
    include: recurringRuleInclude,
  });

  if (amountMatch) {
    return amountMatch;
  }

  if (!options.preferUpdate) {
    return null;
  }

  const approximate = await findApproximateRule(prisma, userId, criteria, options);
  return approximate;
}

export function extractNoteTokens(note?: string | null): string[] {
  if (!note) {
    return [];
  }

  const sanitized = sanitizeNoteForMatching(note);
  if (!sanitized) {
    return [];
  }

  const tokens = sanitized
    .split(WHITESPACE_REGEX)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  return Array.from(new Set(tokens));
}

function sanitizeNoteForMatching(note: string): string {
  let normalized = normalizeText(note);
  if (!normalized) {
    return '';
  }

  for (const keyword of UPDATE_NOTE_KEYWORDS) {
    normalized = normalized.split(keyword).join(' ');
  }

  return normalized.replace(WHITESPACE_REGEX, ' ').trim();
}

async function findApproximateRule(
  prisma: PrismaService,
  userId: string,
  criteria: ExistingRuleCriteria,
  options: FindExistingRuleOptions,
): Promise<RecurringRuleWithCategory | null> {
  const noteTokens = options.noteTokens ?? extractNoteTokens(criteria.note);
  if (!noteTokens.length) {
    return null;
  }

  const candidates = await prisma.recurringRule.findMany({
    where: {
      userId,
      type: criteria.type,
      currency: criteria.currency,
      categoryId: criteria.categoryId,
    },
    orderBy: { updatedAt: 'desc' },
    take: MAX_FUZZY_NOTE_CANDIDATES,
    include: recurringRuleInclude,
  });

  let best: RecurringRuleWithCategory | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const candidateTokens = extractNoteTokens(candidate.note ?? null);
    if (!candidateTokens.length) {
      continue;
    }

    const { common, score } = calculateNoteSimilarity(noteTokens, candidateTokens);
    if (common < FUZZY_NOTE_MATCH_MIN_COMMON) {
      continue;
    }

    let adjustedScore = score;

    if (options.schedule) {
      if (candidate.freq === options.schedule.freq) {
        adjustedScore += 0.1;
      }
      if (
        options.schedule.freq === RecurringFreq.MONTHLY &&
        candidate.dayOfMonth === options.schedule.dayOfMonth
      ) {
        adjustedScore += 0.1;
      }
      if (
        options.schedule.freq === RecurringFreq.WEEKLY &&
        candidate.weekday === options.schedule.weekday
      ) {
        adjustedScore += 0.1;
      }
      if (
        candidate.timeOfDay &&
        options.schedule.timeOfDay &&
        candidate.timeOfDay === options.schedule.timeOfDay
      ) {
        adjustedScore += 0.05;
      }
    }

    if (adjustedScore > bestScore && adjustedScore >= FUZZY_NOTE_MATCH_THRESHOLD) {
      best = candidate;
      bestScore = adjustedScore;
    }
  }

  return best;
}

function calculateNoteSimilarity(
  targetTokens: string[],
  candidateTokens: string[],
): { common: number; score: number } {
  if (!targetTokens.length || !candidateTokens.length) {
    return { common: 0, score: 0 };
  }

  const targetSet = new Set(targetTokens);
  const candidateSet = new Set(candidateTokens);

  let common = 0;
  for (const token of targetSet) {
    if (candidateSet.has(token)) {
      common += 1;
    }
  }

  if (common === 0) {
    return { common: 0, score: 0 };
  }

  const ratioTarget = common / targetSet.size;
  const ratioCandidate = common / candidateSet.size;
  const unionSize = new Set([...targetSet, ...candidateSet]).size || 1;
  const jaccard = common / unionSize;

  const score = ratioTarget * 0.6 + ratioCandidate * 0.2 + jaccard * 0.2;

  return { common, score };
}
