import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  ExistingRecurringBudgetRuleCriteria,
  FindExistingRecurringBudgetRuleOptions,
} from './recurring-budgets.types';
import { RecurringBudgetRuleWithCategory } from './recurring-budgets.prisma';

export function extractNoteTokens(note: string | null): string[] {
  if (!note || note.trim().length === 0) {
    return [];
  }

  return note
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 5);
}

export async function findExistingRecurringBudgetRule(
  prisma: PrismaService,
  userId: string,
  criteria: ExistingRecurringBudgetRuleCriteria,
  options: FindExistingRecurringBudgetRuleOptions = {},
): Promise<RecurringBudgetRuleWithCategory | null> {
  const where: Prisma.RecurringBudgetRuleWhereInput = {
    userId,
    categoryId: criteria.categoryId,
    currency: criteria.currency,
    amount: criteria.amount,
  };

  if (criteria.note && criteria.note.trim().length > 0) {
    where.note = criteria.note;
  }

  const existing = await prisma.recurringBudgetRule.findFirst({
    where,
    include: {
      category: true,
    },
  });

  if (!existing) {
    return null;
  }

  if (options.preferUpdate) {
    return existing;
  }

  if (options.schedule) {
    const scheduleMatches =
      existing.freq === options.schedule.freq &&
      existing.dayOfMonth === (options.schedule.dayOfMonth ?? null) &&
      existing.weekday === (options.schedule.weekday ?? null);

    if (scheduleMatches) {
      return existing;
    }
  }

  if (options.noteTokens && options.noteTokens.length > 0) {
    const existingTokens = extractNoteTokens(existing.note);
    const hasCommonTokens = options.noteTokens.some((token) =>
      existingTokens.includes(token),
    );

    if (hasCommonTokens) {
      return existing;
    }
  }

  return null;
}
