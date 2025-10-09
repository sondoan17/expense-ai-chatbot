import { useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient, extractErrorMessage } from '../../api/client';
import { AgentChatResponse, ChatHistoryResponse } from '../../api/types';

export function useChatHistory() {
  return useInfiniteQuery({
    queryKey: ['chat-history'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const { data } = await apiClient.get<ChatHistoryResponse>('/agent/history', {
        params: {
          limit: 20,
          ...(pageParam && { cursor: pageParam }),
        },
      });
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    staleTime: 30000, // 30 seconds
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: async (payload: { message: string }) => {
      const { data } = await apiClient.post<AgentChatResponse>('/agent/chat', payload);
      return data;
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error, 'Không thể gửi tin nhắn'));
    },
  });
}

export function useActionHandler() {
  return useMutation({
    mutationFn: async (payload: { actionId: string; label: string; payload: unknown }) => {
      const { data } = await apiClient.post<AgentChatResponse>('/agent/action', payload);
      return data;
    },
    onError: (error) => {
      throw new Error(extractErrorMessage(error, 'Không thể xử lý yêu cầu'));
    },
  });
}
