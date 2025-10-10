import type { BudgetsService } from '../../budgets/budgets.service';
import type { TransactionsService } from '../../transactions/transactions.service';
import type { AgentLanguage } from '../agent.constants';

export type TransactionResult = Awaited<ReturnType<TransactionsService['create']>>;
export type BudgetStatusResult = Awaited<ReturnType<BudgetsService['status']>>;

export interface InsightResult {
  type: 'anomaly' | 'trend' | 'recommendation';
  severity: 'info' | 'warning' | 'critical';
  category?: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface AIResponseContext {
  intent: string;
  language: AgentLanguage;
  userData: unknown;
  insights: InsightResult[];
  recentMessages: Array<{ role: string; content: string }>;
}

export interface SpendingTrendData {
  category: string;
  currentAmount: number;
  previousAmount: number;
  percentageChange: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface AnomalyDetectionResult {
  category: string;
  anomalyType: 'spike' | 'drop' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedAction?: string;
}

export interface BudgetRecommendation {
  category: string;
  suggestedAmount: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}
