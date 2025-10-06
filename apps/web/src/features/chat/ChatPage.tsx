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

/** ---- Dedupe helpers: fingerprint + time-window (15s) ---- */
function normalizeText(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}
function fp(role: 'user' | 'assistant', content: string) {
  return `${role}|${normalizeText(content)}`;
}
function toMs(ts: string) {
  return new Date(ts).getTime();
}
function isNear(a: number, b: number, windowMs = 15_000) {
  return Math.abs(a - b) <= windowMs;
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
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    staleTime: 30000,
  });

  const historyMessages = useMemo(() => {
    if (!historyData?.pages) return [];
    return historyData.pages.flatMap((page) => page.data.map(mapServerMessage));
  }, [historyData]);

  /** ------- Dedupe theo fingerprint + cửa sổ thời gian ------- */
  const combinedMessages = useMemo(() => {
    // server index: fp -> list of timestamps (ms)
    const serverByFpTimes = new Map<string, number[]>();
    const byId = new Map<string, ChatMessageItem>();

    for (const m of historyMessages) {
      byId.set(m.id, m);
      const key = fp(m.role, m.content);
      const arr = serverByFpTimes.get(key) ?? [];
      arr.push(toMs(m.timestamp));
      serverByFpTimes.set(key, arr);
    }

    for (const m of pendingMessages) {
      const key = fp(m.role, m.content);
      const localMs = toMs(m.timestamp);
      const times = serverByFpTimes.get(key) ?? [];
      const hasNear = times.some((t) => isNear(t, localMs));
      if (hasNear) continue; // đã có bản server tương ứng gần về thời gian -> bỏ local
      byId.set(m.id, m);
    }

    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [historyMessages, pendingMessages]);

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      const element = listRef.current;
      element.scrollTop = element.scrollHeight;
      setShowScrollButton(false);
    }
  }, []);

  const scrollToBottomWithRetry = useCallback(() => {
    const scroll = () => {
      if (listRef.current) {
        const element = listRef.current;
        element.scrollTop = element.scrollHeight;
        setShowScrollButton(false);
      }
    };
    scroll();
    setTimeout(scroll, 50);
    setTimeout(scroll, 150);
  }, []);

  // Auto-scroll to bottom only on initial load
  useEffect(() => {
    if (!listRef.current) return;
    if (!hasInitiallyLoaded.current && !historyLoading && historyData && !isFetchingNextPage) {
      hasInitiallyLoaded.current = true;
      const scrollNow = () => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      };
      scrollNow();
      setTimeout(scrollNow, 50);
      setTimeout(scrollNow, 150);
      setTimeout(scrollNow, 300);
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

      setShowScrollButton(!isNearBottom);

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
    if (!listRef.current || !scrollPositionRef.current || !hasInitiallyLoaded.current) return;

    const listElement = listRef.current;
    const { height: oldHeight, top: oldTop } = scrollPositionRef.current;
    const newHeight = listElement.scrollHeight;
    const newTop = oldTop + (newHeight - oldHeight);

    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = newTop;
    });

    scrollPositionRef.current = null;
  }, [historyData]);

  // Auto-scroll to bottom when new local pending (user/assistant) appears
  useEffect(() => {
    if (!listRef.current || !hasInitiallyLoaded.current) return;
    const hasNewPending = pendingMessages.some(
      (msg) => msg.localOnly && (msg.status === 'pending' || msg.status === 'queued'),
    );
    if (hasNewPending) {
      const el = listRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [pendingMessages]);

  /** ------- Cleanup pending dựa vào fingerprint + thời gian ------- */
  useEffect(() => {
    if (!historyFetching && historyMessages.length > 0) {
      // server index: fp -> list timestamps (ms)
      const serverByFpTimes = new Map<string, number[]>();
      for (const h of historyMessages) {
        const key = fp(h.role, h.content);
        const arr = serverByFpTimes.get(key) ?? [];
        arr.push(toMs(h.timestamp));
        serverByFpTimes.set(key, arr);
      }

      setPendingMessages((prev) =>
        prev.filter((msg) => {
          if (!msg.localOnly) return true; // không phải local thì giữ
          const key = fp(msg.role, msg.content);
          const times = serverByFpTimes.get(key) ?? [];
          const localMs = toMs(msg.timestamp);
          const hasNear = times.some((t) => isNear(t, localMs));
          return !hasNear; // có bản server “gần” -> bỏ local
        }),
      );
    }
  }, [historyFetching, historyMessages]);

  // Auto-scroll to bottom when very recent server messages arrive
  useEffect(() => {
    if (!listRef.current || !hasInitiallyLoaded.current || historyFetching) return;

    const latestPage = historyData?.pages?.[historyData.pages.length - 1];
    if (latestPage?.data?.length) {
      const latestMessage = latestPage.data[latestPage.data.length - 1];
      const messageTime = new Date(latestMessage.createdAt).getTime();
      const now = Date.now();
      if (now - messageTime < 10_000) {
        scrollToBottomWithRetry();
      }
    }
  }, [historyData, historyFetching, scrollToBottomWithRetry]);

  const addPendingMessage = useCallback((msg: ChatMessageItem) => {
    setPendingMessages((prev) => [...prev, msg]);
  }, []);

  const updatePendingMessage = useCallback(
    (id: string, updater: (msg: ChatMessageItem) => ChatMessageItem) => {
      setPendingMessages((prev) => prev.map((msg) => (msg.id === id ? updater(msg) : msg)));
    },
    [],
  );

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
        // Chỉ echo assistant local khi có actions; nếu không, đợi history
        if (response.actions?.length) {
          addPendingMessage(
            createMessage('assistant', response.reply, 'sent', {
              localOnly: true,
              actions: response.actions ?? undefined,
            }),
          );
        } else {
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
      // 1) Hiển thị ngay bong bóng user local
      const outgoing = createMessage('user', text, online ? 'pending' : 'queued', {
        localOnly: true,
      });
      addPendingMessage(outgoing);

      // 2) Nếu offline: xếp hàng & báo lại
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

      // 3) Online: gửi server
      try {
        const response = await sendToAgent({ message: text });
        updatePendingMessage(outgoing.id, (msg) => ({ ...msg, status: 'sent' }));

        // Không xoá bong bóng user local tại đây!
        // Nếu có actions -> echo assistant local; nếu không -> chỉ refetch history
        if (response.actions?.length) {
          addPendingMessage(
            createMessage('assistant', response.reply, 'sent', {
              localOnly: true,
              actions: response.actions,
            }),
          );
        } else {
          await refetchHistory();
          scrollToBottomWithRetry();
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
    [addPendingMessage, online, refetchHistory, sendToAgent, updatePendingMessage, scrollToBottomWithRetry],
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

        if (data.actions?.length) {
          addPendingMessage(
            createMessage('assistant', data.reply, 'sent', {
              localOnly: true,
              actions: data.actions,
            }),
          );
        } else {
          await refetchHistory();
          scrollToBottomWithRetry();
        }
      } catch (error) {
        const message = extractErrorMessage(error, 'Không thể xử lý yêu cầu ngay lúc này.');
        updatePendingMessage(userActionMessage.id, (msg) => ({ ...msg, status: 'error' }));
        updatePendingMessage(sourceMessageId, (msg) => ({ ...msg, actionProcessing: false }));
        addPendingMessage(createMessage('assistant', message, 'error', { localOnly: true }));
      }
    },
    [addPendingMessage, online, refetchHistory, updatePendingMessage, scrollToBottomWithRetry],
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
    <div className="grid h-[calc(100vh-120px)] grid-rows-[auto_1fr_auto] overflow-hidden rounded-3xl border border-slate-800/40 bg-slate-900/40 backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-slate-700/40 px-5 py-4">
        <div>
          <h1 className="m-0 text-xl font-semibold tracking-tight">Trò chuyện với trợ lý chi tiêu</h1>
          <p className="m-0 mt-1 text-sm text-slate-400">
            Ghi chép chi tiêu, theo dõi nguồn ngân sách và yêu cầu báo cáo ngay trong trò chuyện.
          </p>
        </div>
      </header>
      <div className="relative flex flex-col gap-4 overflow-y-auto bg-gradient-to-b from-slate-900/80 to-slate-900/60 p-5" ref={listRef}>
        {isFetchingNextPage && (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
            Đang tải thêm tin nhắn...
          </div>
        )}
        {isEmpty ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
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
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {message.actions.map((action) => (
                    <button
                      key={`${message.id}-${action.id}`}
                      className="rounded-xl bg-indigo-400/20 px-3 py-1 text-sm text-slate-100 transition hover:bg-indigo-400/30 disabled:opacity-60 disabled:cursor-not-allowed"
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
            className="fixed bottom-[120px] right-8 z-10 grid h-12 w-12 place-items-center rounded-full border border-slate-700/40 bg-slate-900/90 text-lg font-bold text-slate-100 shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-indigo-400/20"
            onClick={scrollToBottom}
            title="Xuống tin nhắn mới nhất"
          >
            ↓
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-700/40 bg-gradient-to-b from-slate-900/90 to-slate-900/80 px-5 py-4">
        <div className="flex flex-wrap gap-2">{suggestionButtons}</div>
        <ChatComposer onSend={handleSend} disabled={isPending} />
      </div>
    </div>
  );
}
