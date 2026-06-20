import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'zmp-ui';

import {
  apiClient,
  clearAccessToken,
  extractErrorMessage,
  getUserSettings,
  isUnauthorized,
  setAccessToken,
  updatePersonality,
} from '../api/client';
import { createBudget, createRecurringRule, createTransaction } from '../api/manual-entry';
import {
  AgentChatResponse,
  AuthResponse,
  BudgetDto,
  BudgetStatusResponse,
  ChatHistoryResponse,
  Currency,
  MessageResponse,
  OverviewResponse,
  SummaryResponse,
  UserDto,
} from '../api/types';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async (): Promise<UserDto | null> => {
      try {
        const response = await apiClient.get<AuthResponse>('/users/me');
        return response.data.user;
      } catch (error) {
        if (isUnauthorized(error)) return null;
        throw new Error(extractErrorMessage(error, 'Không thể lấy thông tin người dùng'));
      }
    },
    retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      queryClient.setQueryData(['user', 'me'], data.user);
      navigate('/chat', { replace: true });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error, 'Đăng nhập thất bại'));
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (input: { email: string; password: string; name?: string }) => {
      const response = await apiClient.post<AuthResponse>('/auth/register', input);
      return response.data;
    },
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      queryClient.setQueryData(['user', 'me'], data.user);
      navigate('/chat', { replace: true });
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error, 'Đăng ký thất bại'));
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<MessageResponse>('/auth/logout');
      return response.data;
    },
    onSettled: () => {
      clearAccessToken();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name?: string }) => {
      const response = await apiClient.patch<AuthResponse>('/users/me', input);
      return response.data.user;
    },
    onSuccess: (user) => queryClient.setQueryData(['user', 'me'], user),
  });
}

export function useChatHistory() {
  return useInfiniteQuery({
    queryKey: ['chat-history'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const response = await apiClient.get<ChatHistoryResponse>('/agent/history', {
        params: { limit: 20, ...(pageParam ? { cursor: pageParam } : {}) },
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: async (payload: { message: string }) => {
      const response = await apiClient.post<AgentChatResponse>('/agent/chat', payload);
      return response.data;
    },
  });
}

export function useActionHandler() {
  return useMutation({
    mutationFn: async (payload: { actionId: string; label: string; payload: unknown }) => {
      const response = await apiClient.post<AgentChatResponse>('/agent/action', payload);
      return response.data;
    },
  });
}

export function useSummary(period: string, currency: Currency) {
  return useQuery({
    queryKey: ['transactions-summary', period, currency],
    queryFn: async () => {
      const response = await apiClient.get<SummaryResponse>('/transactions/summary', {
        params: { period, currency },
      });
      return response.data;
    },
  });
}

export function useOverview(currency: Currency) {
  return useQuery({
    queryKey: ['reports-overview', currency],
    queryFn: async () => {
      const response = await apiClient.get<OverviewResponse>('/reports/overview', {
        params: { period: 'this_month', recent: 10, currency },
      });
      return response.data;
    },
  });
}

export function useBudgetStatus() {
  return useQuery({
    queryKey: ['budgets-status'],
    queryFn: async () => {
      const budgetResponse = await apiClient.get<BudgetDto[]>('/budgets');
      const budgets = budgetResponse.data;
      return Promise.all(
        budgets.map(async (budget) => {
          const response = await apiClient.get<BudgetStatusResponse>(`/budgets/${budget.id}/status`);
          return response.data;
        }),
      );
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['reports-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
      navigate('/dashboard', { replace: true });
    },
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets-status'] });
      navigate('/dashboard', { replace: true });
    },
  });
}

export function useCreateRecurringRule() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: createRecurringRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports-overview'] });
      navigate('/dashboard', { replace: true });
    },
  });
}

export function useUserSettings() {
  return useQuery({ queryKey: ['user-settings'], queryFn: getUserSettings });
}

export function useUpdatePersonality() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePersonality,
    onSuccess: (settings) => queryClient.setQueryData(['user-settings'], settings),
  });
}
