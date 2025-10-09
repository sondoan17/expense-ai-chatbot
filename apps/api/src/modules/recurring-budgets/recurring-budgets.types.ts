import { Currency, Prisma, RecurringFreq } from '@prisma/client';

import { RecurringBudgetRuleWithCategory } from './recurring-budgets.prisma';

export interface RecurringBudgetScheduleSnapshot {
  freq: RecurringFreq;
  dayOfMonth?: number | null;
  weekday?: number | null;
  timeOfDay?: string | null;
}

export interface CreateRecurringBudgetRuleOptions {
  preferUpdate?: boolean;
}

export interface FindExistingRecurringBudgetRuleOptions {
  preferUpdate?: boolean;
  noteTokens?: string[];
  schedule?: RecurringBudgetScheduleSnapshot;
}

export interface ExistingRecurringBudgetRuleCriteria {
  categoryId: string | null;
  currency: Currency;
  note?: string | null;
  amount: Prisma.Decimal;
}

export interface CreateRecurringBudgetRuleInput {
  freq: RecurringFreq;
  dayOfMonth?: number | null;
  weekday?: number | null;
  timeOfDay?: string | null;
  timezone?: string | null;
  startDate: Date;
  endDate?: Date | null;
  amount: number;
  currency?: Currency;
  categoryId?: string | null;
  note?: string | null;
}

export type RecurringBudgetRuleMutationResult = {
  rule: RecurringBudgetRuleWithCategory;
  action: 'created' | 'updated';
};
