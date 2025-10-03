import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { ChatBubble } from './components/ChatBubble';
import { ChatComposer } from './components/ChatComposer';
import { AgentChatResponse, ChatMessageDto, ChatHistoryResponse } from '../../api/types';
import { AgentActionOption } from '@expense-ai/shared';

import { apiClient, extractErrorMessage, isNetworkError } from '../../api/client';
import { enqueueAgentMessage } from '../../offline/offlineQueue';
import { useOfflineAgentSync } from '../../offline/useOfflineAgentSync';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import './components/chat.css';

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status: 'sent' | 'pending' | 'queued' | 'error';
  localOnly?: boolean;
  actions?: AgentActionOption[];
  actionProcessing?: boolean;
}
const SUGGESTIONS = [
  'Xem báo cáo chi tiêu tháng này',
  'Đặt nguồn ngân sách ăn uống 2.000.000 VND cho tháng này',
  'Ghi nhận khoản thu 25.000.000 VND trong tháng này',
  'Tôi đã chi bao nhiêu cho di chuyển tuần này?',
];

function createMessage(
  role: 'user' | 'assistant',
  content: string,
  status: ChatMessageItem['status'] = 'sent',
  overrides: Partial<ChatMessageItem> = {},
): ChatMessageItem {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    role,
    content,
    status,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function mapServerMessage(message: ChatMessageDto): ChatMessageItem {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    status: message.status,
    timestamp: message.createdAt,
  };
}

export function ChatPage() {
  const [pendingMessages, setPendingMessages] = useState<ChatMessageItem[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<{ height: number; top: number } | null>(null);
  const hasInitiallyLoaded = useRef(false);
  const online = useOnlineStatus();

  // Reset initial load flag when component mounts (for reload)
  useEffect(() => {
    hasInitiallyLoaded.current = false;
  }, []);

  const {
    data: historyData,
    isLoading: historyLoading,
    isFetching: historyFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchHistory,
  } = useInfiniteQuery({
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
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const historyMessages = useMemo(() => {
    if (!historyData?.pages) return [];
    return historyData.pages.flatMap((page) => page.data.map(mapServerMessage));
  }, [historyData]);

  const combinedMessages = useMemo(
    () => [...historyMessages, ...pendingMessages],
    [historyMessages, pendingMessages],
  );

  // Auto-scroll to bottom only on initial load
  useEffect(() => {
    if (!listRef.current) return;

    // Scroll to bottom on initial load - wait for all data to be loaded
    if (!hasInitiallyLoaded.current && !historyLoading && historyData && !isFetchingNextPage) {
      hasInitiallyLoaded.current = true;

      // Use multiple attempts to ensure we scroll to the very bottom
      const scrollToBottom = () => {
        if (listRef.current) {
          const element = listRef.current;
          element.scrollTop = element.scrollHeight;
        }
      };

      // Immediate scroll
      scrollToBottom();

      // Additional attempts with longer delays
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 150);
      setTimeout(scrollToBottom, 300);
    }
  }, [historyLoading, historyData, isFetchingNextPage]);

  // Handle infinite scroll and scroll button visibility
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = listElement;
      const isNearTop = scrollTop < 100;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

      // Show scroll button when user is not near bottom
      setShowScrollButton(!isNearBottom);

      // Only trigger infinite scroll if we've initially loaded and user is scrolling up
      if (isNearTop && hasNextPage && !isFetchingNextPage && hasInitiallyLoaded.current) {
        // Store current scroll position before fetching
        scrollPositionRef.current = {
          height: listElement.scrollHeight,
          top: listElement.scrollTop,
        };

        fetchNextPage();
      }
    };

    listElement.addEventListener('scroll', handleScroll);
    return () => listElement.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Restore scroll position after history is loaded
  useEffect(() => {
    if (!listRef.current || !scrollPositionRef.current) return;

    const listElement = listRef.current;
    const { height: oldHeight, top: oldTop } = scrollPositionRef.current;

    // Calculate new scroll position
    const newHeight = listElement.scrollHeight;
    const heightDifference = newHeight - oldHeight;
    const newTop = oldTop + heightDifference;

    listElement.scrollTop = newTop;
    scrollPositionRef.current = null; // Reset after use
  }, [historyData]);

  // Only scroll to bottom on initial load, not when loading more history
  useEffect(() => {
    if (!listRef.current || !hasInitiallyLoaded.current) return;

    // Only scroll to bottom if we just finished initial load and have pending messages
    const hasNewPendingMessages = pendingMessages.some(
      (msg) => msg.localOnly && (msg.status === 'pending' || msg.status === 'queued'),
    );

    if (hasNewPendingMessages) {
      const scrollToBottom = () => {
        if (listRef.current) {
          const element = listRef.current;
          element.scrollTop = element.scrollHeight;
        }
      };

      // Immediate scroll
      scrollToBottom();

      // Additional attempt to ensure we reach the bottom
      setTimeout(scrollToBottom, 50);
    }
  }, [pendingMessages]);

  useEffect(() => {
    if (!historyFetching) {
      setPendingMessages((prev) => prev.filter((msg) => !(msg.localOnly && msg.status === 'sent')));
    }
  }, [historyFetching, historyData]);

  const addPendingMessage = useCallback((msg: ChatMessageItem) => {
    setPendingMessages((prev) => [...prev, msg]);
  }, []);

  const updatePendingMessage = useCallback(
    (id: string, updater: (msg: ChatMessageItem) => ChatMessageItem) => {
      setPendingMessages((prev) => prev.map((msg) => (msg.id === id ? updater(msg) : msg)));
    },
    [],
  );

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      const element = listRef.current;
      element.scrollTop = element.scrollHeight;
      setShowScrollButton(false);
    }
  }, []);

  const handleOfflineSync = useCallback(
    ({
      messageId,
      response,
      error,
    }: {
      messageId: string;
      response?: AgentChatResponse;
      error?: string;
    }) => {
      if (response) {
        updatePendingMessage(messageId, (msg) => ({ ...msg, status: 'sent' }));
        setPendingMessages((prev) =>
          prev.filter(
            (msg) => !(msg.localOnly && msg.role === 'assistant' && msg.status === 'queued'),
          ),
        );
        addPendingMessage(
          createMessage('assistant', response.reply, 'sent', {
            localOnly: true,
            actions: response.actions ?? undefined,
          }),
        );
        if (!response.actions?.length) {
          void refetchHistory();
        }
      } else if (error) {
        updatePendingMessage(messageId, (msg) => ({ ...msg, status: 'error' }));
        addPendingMessage(createMessage('assistant', error, 'error', { localOnly: true }));
      }
    },
    [addPendingMessage, refetchHistory, updatePendingMessage],
  );

  useOfflineAgentSync(handleOfflineSync);

  const { mutateAsync: sendToAgent, isPending } = useMutation({
    mutationFn: async (payload: { message: string }) => {
      const { data } = await apiClient.post<AgentChatResponse>('/agent/chat', payload);
      return data;
    },
  });

  const handleSend = useCallback(
    async (text: string) => {
      const outgoing = createMessage('user', text, online ? 'pending' : 'queued', {
        localOnly: true,
      });
      addPendingMessage(outgoing);

      if (!online) {
        await enqueueAgentMessage({
          id: outgoing.id,
          message: text,
          createdAt: new Date().toISOString(),
        });
        updatePendingMessage(outgoing.id, (msg) => ({ ...msg, status: 'queued' }));
        addPendingMessage(
          createMessage(
            'assistant',
            'Đã lưu tin nhắn, mình sẽ xử lý khi bạn trực tuyến lại.',
            'queued',
            { localOnly: true },
          ),
        );
        return;
      }

      try {
        const response = await sendToAgent({ message: text });
        updatePendingMessage(outgoing.id, (msg) => ({ ...msg, status: 'sent' }));
        addPendingMessage(
          createMessage('assistant', response.reply, 'sent', {
            localOnly: true,
            actions: response.actions ?? undefined,
          }),
        );
        if (!response.actions?.length) {
          await refetchHistory();
        }
      } catch (error) {
        const offlineError = isNetworkError(error) || navigator.onLine === false;
        if (offlineError) {
          await enqueueAgentMessage({
            id: outgoing.id,
            message: text,
            createdAt: new Date().toISOString(),
          });
          updatePendingMessage(outgoing.id, (msg) => ({ ...msg, status: 'queued' }));
          addPendingMessage(
            createMessage(
              'assistant',
              'Đã lưu tin nhắn, mình sẽ xử lý khi bạn trực tuyến lại.',
              'queued',
              { localOnly: true },
            ),
          );
        } else {
          const message = extractErrorMessage(error, 'Không thể gửi tin nhắn.');
          updatePendingMessage(outgoing.id, (msg) => ({ ...msg, status: 'error' }));
          addPendingMessage(createMessage('assistant', message, 'error', { localOnly: true }));
        }
      }
    },
    [addPendingMessage, online, refetchHistory, sendToAgent, updatePendingMessage],
  );

  const handleActionClick = useCallback(
    async (sourceMessageId: string, action: AgentActionOption) => {
      updatePendingMessage(sourceMessageId, (msg) => ({ ...msg, actionProcessing: true }));

      const userActionMessage = createMessage('user', action.label, 'pending', { localOnly: true });
      addPendingMessage(userActionMessage);

      if (!online) {
        updatePendingMessage(userActionMessage.id, (msg) => ({ ...msg, status: 'error' }));
        updatePendingMessage(sourceMessageId, (msg) => ({ ...msg, actionProcessing: false }));
        addPendingMessage(
          createMessage('assistant', 'Không thể xử lý khi đang ngoại tuyến.', 'error', {
            localOnly: true,
          }),
        );
        return;
      }

      try {
        const { data } = await apiClient.post<AgentChatResponse>('/agent/action', {
          actionId: action.id,
          label: action.label,
          payload: action.payload,
        });

        updatePendingMessage(userActionMessage.id, (msg) => ({ ...msg, status: 'sent' }));
        updatePendingMessage(sourceMessageId, (msg) => ({
          ...msg,
          actions: [],
          actionProcessing: false,
        }));
        addPendingMessage(
          createMessage('assistant', data.reply, 'sent', {
            localOnly: true,
            actions: data.actions ?? undefined,
          }),
        );

        if (!data.actions?.length) {
          await refetchHistory();
        }
      } catch (error) {
        const message = extractErrorMessage(error, 'Không thể xử lý yêu cầu ngay lúc này.');
        updatePendingMessage(userActionMessage.id, (msg) => ({ ...msg, status: 'error' }));
        updatePendingMessage(sourceMessageId, (msg) => ({ ...msg, actionProcessing: false }));
        addPendingMessage(createMessage('assistant', message, 'error', { localOnly: true }));
      }
    },
    [addPendingMessage, online, refetchHistory, updatePendingMessage],
  );
  const suggestionButtons = useMemo(
    () =>
      SUGGESTIONS.map((item) => (
        <button
          key={item}
          className="quick-action"
          onClick={() => handleSend(item)}
          disabled={isPending}
        >
          {item}
        </button>
      )),
    [handleSend, isPending],
  );

  const isEmpty = combinedMessages.length === 0;

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div>
          <h1>Trò chuyện với trợ lý chi tiêu</h1>
          <p className="chat-subtitle">
            Ghi chép chi tiêu, theo dõi nguồn ngân sách và yêu cầu báo cáo ngay trong trò chuyện.
          </p>
        </div>
      </header>
      <div className="chat-messages" ref={listRef}>
        {isFetchingNextPage && (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
            Đang tải thêm tin nhắn...
          </div>
        )}
        {isEmpty ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            {historyLoading
              ? 'Đang tải lịch sử hội thoại...'
              : 'Bắt đầu bằng câu "Ghi lại khoản trách nhiệm 55k" để xem trợ lý ghi nhận giao dịch.'}
          </div>
        ) : (
          combinedMessages.map((message) => (
            <ChatBubble
              key={message.id}
              role={message.role}
              status={message.status}
              timestamp={new Date(message.timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            >
              <div>{message.content}</div>
              {message.actions?.length ? (
                <div className="chat-bubble-actions">
                  {message.actions.map((action) => (
                    <button
                      key={`${message.id}-${action.id}`}
                      className="chat-action-button"
                      onClick={() => handleActionClick(message.id, action)}
                      disabled={message.actionProcessing || !online || message.status !== 'sent'}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </ChatBubble>
          ))
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            className="scroll-to-bottom-button"
            onClick={scrollToBottom}
            title="Xuống tin nhắn mới nhất"
          >
            ↓
          </button>
        )}
      </div>
      <div className="chat-input-area">
        <div className="quick-actions">{suggestionButtons}</div>
        <ChatComposer onSend={handleSend} disabled={isPending} />
      </div>
    </div>
  );
}
