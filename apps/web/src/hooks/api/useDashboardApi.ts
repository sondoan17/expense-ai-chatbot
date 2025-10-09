import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { BudgetStatusResponse, OverviewResponse, SummaryResponse } from '../../api/types';

const REFRESH_OPTIONS = {
  staleTime: 0,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: 'always' as const,
};

export function useSummary(period: string) {
  return useQuery({
    queryKey: ['transactions-summary', period],
    queryFn: async () => {
      const { data } = await apiClient.get<SummaryResponse>('/transactions/summary', {
        params: { period },
      });
      return data;
    },
    ...REFRESH_OPTIONS,
  });
}

export function useOverview() {
  return useQuery({
    queryKey: ['reports-overview', 'this_month'],
    queryFn: async () => {
      const { data } = await apiClient.get<OverviewResponse>('/reports/overview', {
        params: { period: 'this_month', recent: 10 },
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
