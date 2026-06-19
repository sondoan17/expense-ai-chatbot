import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { BudgetStatusResponse, OverviewResponse, SummaryResponse } from '../../api/types';

type DashboardCurrency = 'VND' | 'USD';

const REFRESH_OPTIONS = {
  staleTime: 0,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: 'always' as const,
};

export function useSummary(period: string, currency: DashboardCurrency = 'VND') {
  return useQuery({
    queryKey: ['transactions-summary', period, currency],
    queryFn: async () => {
      const { data } = await apiClient.get<SummaryResponse>('/transactions/summary', {
        params: { period, currency },
      });
      return data;
    },
    ...REFRESH_OPTIONS,
  });
}

export function useOverview(currency: DashboardCurrency = 'VND') {
  return useQuery({
    queryKey: ['reports-overview', 'this_month', currency],
    queryFn: async () => {
      const { data } = await apiClient.get<OverviewResponse>('/reports/overview', {
        params: { period: 'this_month', recent: 10, currency },
      });
      return data;
    },
    ...REFRESH_OPTIONS,
  });
}

export function useBudgetStatus() {
  return useQuery({
    queryKey: ['budgets-status'],
    queryFn: async () => {
      const { data: budgets } = await apiClient.get<BudgetStatusResponse['budget'][]>('/budgets');
      if (!budgets.length) {
        return [] as BudgetStatusResponse[];
      }
      const statuses = await Promise.all(
        budgets.map(async (budget) => {
          const { data } = await apiClient.get<BudgetStatusResponse>(
            `/budgets/${budget.id}/status`,
          );
          return data;
        }),
      );
      return statuses;
    },
    ...REFRESH_OPTIONS,
  });
}
