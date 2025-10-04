import { Prisma } from '@prisma/client';

export const recurringBudgetRuleInclude = {
  category: true,
} as const;

export type RecurringBudgetRuleWithCategory = Prisma.RecurringBudgetRuleGetPayload<{
  include: typeof recurringBudgetRuleInclude;
}>;
