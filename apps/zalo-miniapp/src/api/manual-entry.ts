import { apiClient } from './client';
import {
  BudgetDto,
  CreateBudgetRequest,
  CreateRecurringRuleRequest,
  CreateTransactionRequest,
  RecurringRuleDto,
  TransactionDto,
} from './types';

export async function createTransaction(data: CreateTransactionRequest): Promise<TransactionDto> {
  const response = await apiClient.post<TransactionDto>('/transactions', data);
  return response.data;
}

export async function createBudget(data: CreateBudgetRequest): Promise<BudgetDto> {
  const response = await apiClient.post<BudgetDto>('/budgets', data);
  return response.data;
}

export async function createRecurringRule(
  data: CreateRecurringRuleRequest,
): Promise<RecurringRuleDto> {
  const response = await apiClient.post<RecurringRuleDto>('/recurring', data);
  return response.data;
}
