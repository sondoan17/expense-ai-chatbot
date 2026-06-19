import { useEffect } from 'react';
import {
  deadLetterAgentMessage,
  incrementAgentMessageAttempts,
  peekAgentMessages,
  removeAgentMessage,
} from './offlineQueue';
import { apiClient, extractErrorMessage, isNetworkError } from '../api/client';
import { AgentChatResponse } from '../api/types';

const MAX_NETWORK_RETRIES = 5;

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

      const pending = [...queue];
      for (const item of pending) {
        try {
          const { data } = await apiClient.post<AgentChatResponse>('/agent/chat', {
            message: item.message,
          });
          await removeAgentMessage(item.id);
          onSynced({ messageId: item.id, response: data });
        } catch (error) {
          const message = extractErrorMessage(error, 'Không thể gửi khi mất kết nối');

          if (isNetworkError(error) && (item.attempts ?? 0) < MAX_NETWORK_RETRIES) {
            await incrementAgentMessageAttempts(item.id);
          } else {
            await deadLetterAgentMessage(item, message);
          }

          onSynced({
            messageId: item.id,
            error: message,
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
