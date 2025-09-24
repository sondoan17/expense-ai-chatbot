import type { BudgetsService } from '../../budgets/budgets.service';
import type { TransactionsService } from '../../transactions/transactions.service';

export type TransactionResult = Awaited<ReturnType<TransactionsService['create']>>;
export type BudgetStatusResult = Awaited<ReturnType<BudgetsService['status']>>;
