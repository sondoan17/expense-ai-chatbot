import { useEffect } from 'react';
import { dequeueAgentMessages, peekAgentMessages } from './offlineQueue';
import { apiClient, extractErrorMessage } from '../api/client';
import { AgentChatResponse } from '../api/types';

type SyncCallback = (options: {
  messageId: string;
  response?: AgentChatResponse;
  error?: string;
}) => void;

export function useOfflineAgentSync(onSynced: SyncCallback) {
  useEffect(() => {
    const flush = async () => {
      const queue = await peekAgentMessages();
      if (!queue.length || navigator.onLine === false) return;

      const pending = await dequeueAgentMessages();
      for (const item of pending) {
        try {
          const { data } = await apiClient.post<AgentChatResponse>('/agent/chat', {
            message: item.message,
          });
          onSynced({ messageId: item.id, response: data });
        } catch (error) {
          onSynced({
            messageId: item.id,
            error: extractErrorMessage(error, 'Không thể gửi khi mất kết nối'),
          });
        }
      }
    };

    const onlineHandler = () => {
      if (navigator.onLine) {
        flush();
      }
    };

    window.addEventListener('online', onlineHandler);
    flush();

    return () => {
      window.removeEventListener('online', onlineHandler);
    };
  }, [onSynced]);
}
