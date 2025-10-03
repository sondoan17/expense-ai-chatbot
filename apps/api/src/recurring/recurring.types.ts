import { Currency, Prisma, RecurringFreq, TxnType } from '@prisma/client';

import { RecurringRuleWithCategory } from './recurring.prisma';

export interface RecurringScheduleSnapshot {
  freq: RecurringFreq;
  dayOfMonth?: number | null;
  weekday?: number | null;
  timeOfDay?: string | null;
}

export interface CreateRuleOptions {
  preferUpdate?: boolean;
}

export interface FindExistingRuleOptions {
  preferUpdate?: boolean;
  noteTokens?: string[];
  schedule?: RecurringScheduleSnapshot;
}

export interface ExistingRuleCriteria {
  type: TxnType;
  categoryId: string | null;
  currency: Currency;
  note?: string | null;
  amount: Prisma.Decimal;
}

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

export type RecurringRuleMutationResult = {
  rule: RecurringRuleWithCategory;
  action: 'created' | 'updated';
};
