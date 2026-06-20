export type Currency = 'VND' | 'USD';
export type TxnType = 'EXPENSE' | 'INCOME';
export type AiPersonality =
  | 'FRIENDLY'
  | 'PROFESSIONAL'
  | 'CASUAL'
  | 'HUMOROUS'
  | 'INSULTING'
  | 'ENTHUSIASTIC';

export interface UserDto {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageResponse {
  message: string;
}

export interface AuthResponse {
  user: UserDto;
  accessToken: string;
}

export interface TransactionDto {
  id: string;
  type: TxnType;
  amount: number;
  currency: Currency;
  note?: string | null;
  occurredAt: string;
  category: { id: string; name: string } | null;
  createdAt: string;
}

export interface SummaryResponse {
  totals: { expense: number; income: number; net: number };
  byCategory: Array<{ categoryId: string; categoryName: string; amount: number }>;
  transactionCount: number;
  activeDays: number;
  noSpendDays: number;
  avgExpensePerTransaction: number;
  topCategory: { name: string; amount: number } | null;
  maxExpenseDay: { date: string; amount: number } | null;
}

export interface OverviewResponse {
  totals: { expense: number; income: number; net: number };
  byCategory: Array<{ categoryId: string; categoryName: string; amount: number }>;
  recent: TransactionDto[];
}

export interface BudgetDto {
  id: string;
  month: number;
  year: number;
  limitAmount: number;
  currency: Currency;
  category: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetStatusResponse {
  budget: BudgetDto;
  spent: number;
  remaining: number;
  overBudget: boolean;
  overspent: number;
  percentage: number;
}

export interface ChatMessageDto {
  id: string;
  role: 'user' | 'assistant';
  status: 'sent' | 'error';
  content: string;
  createdAt: string;
}

export interface ChatHistoryResponse {
  data: ChatMessageDto[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface AgentActionOption {
  id: string;
  label: string;
  payload?: unknown;
}

export interface AgentChatResponse {
  reply: string;
  intent: string;
  data?: unknown;
  parsed?: unknown;
  meta?: unknown;
  actions?: AgentActionOption[];
  error?: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  aiPersonality: AiPersonality;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringRuleDto {
  id: string;
  freq: string;
  startDate: string;
  type: TxnType;
  amount: number;
  currency: Currency;
  enabled: boolean;
  nextRunAt: string;
}

export interface CreateTransactionRequest {
  type: TxnType;
  amount: number;
  currency?: Currency;
  note?: string;
  occurredAt?: string;
  categoryId?: string;
}

export interface CreateBudgetRequest {
  month: number;
  year: number;
  limitAmount: number;
  currency?: Currency;
  categoryId?: string;
}

export interface CreateRecurringRuleRequest {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  dayOfMonth?: number;
  weekday?: number;
  timeOfDay?: string;
  timezone?: string;
  startDate: string;
  endDate?: string;
  type: TxnType;
  amount: number;
  currency?: Currency;
  categoryId?: string;
  note?: string;
}
