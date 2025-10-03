import { Prisma } from '@prisma/client';

export const recurringRuleInclude = Prisma.validator<Prisma.RecurringRuleInclude>()({
  category: true,
});

export type RecurringRuleWithCategory = Prisma.RecurringRuleGetPayload<{
  include: typeof recurringRuleInclude;
}>;
