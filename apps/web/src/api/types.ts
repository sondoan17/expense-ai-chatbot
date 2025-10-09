import { AgentActionOption, Currency, TxnType } from '@expense-ai/shared';

export interface UserDto {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserDto;
  accessToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}

export interface TransactionDto {
  id: string;
  type: TxnType;
  amount: number;
  currency: Currency;
  note?: string | null;
  occurredAt: string;
  category: { id: string; name: string } | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SummaryResponse {
  totals: {
    expense: number;
    income: number;
    net: number;
  };
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
  }>;
  // Analytics metrics
  transactionCount: number;
  activeDays: number;
  noSpendDays: number;
  avgExpensePerTransaction: number;
  topCategory: {
    name: string;
    amount: number;
  } | null;
  maxExpenseDay: {
    date: string;
    amount: number;
  } | null;
  range?: {
    start?: string;
    end?: string;
  };
}

export interface OverviewResponse {
  totals: {
    expense: number;
    income: number;
    net: number;
  };
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
  }>;
  recent: Array<{
    id: string;
    type: TxnType;
    amount: number;
    currency: Currency;
    note?: string | null;
    occurredAt: string;
    category: { id: string; name: string } | null;
    createdAt: string;
  }>;
  range?: {
    start?: string;
    end?: string;
  };
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
  range?: {
    start?: string;
    end?: string;
  };
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

export interface AgentChatResponse {
  reply: string;
  intent: string;
  data?: unknown;
  parsed?: unknown;
  meta?: unknown;
  actions?: AgentActionOption[];
  error?: string;
}
