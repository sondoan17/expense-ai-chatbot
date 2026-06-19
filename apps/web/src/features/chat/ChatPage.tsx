import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, PiggyBank, ReceiptText, Sparkles, Target, WalletCards } from 'lucide-react';
import { ChatBubble } from './components/ChatBubble';
import { ChatComposer } from './components/ChatComposer';
import { AgentChatResponse, ChatMessageDto } from '../../api/types';
import { AgentActionOption } from '@expense-ai/shared';

import { extractErrorMessage, isNetworkError } from '../../api/client';
import { enqueueAgentMessage } from '../../offline/offlineQueue';
import { useOfflineAgentSync } from '../../offline/useOfflineAgentSync';
import { useOnlineStatus } from '../../hooks/utils/useOnlineStatus';
import { useChatHistory, useSendMessage, useActionHandler } from '../../hooks/api/useChatApi';
import { useToast } from '../../contexts/ToastContext';
import { ActionButton } from '../../components/ui';

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

const QUICK_ACTION_LABELS = ['Báo cáo tháng', 'Ngân sách ăn uống', 'Ghi nhận thu nhập'];

const ASSISTANT_GUIDES = [
  {
    title: 'Ghi thu chi tức thì',
    description: 'Nhắn tự nhiên như “Ăn phở 50k” để Mimi tự hiểu số tiền và danh mục.',
  },
  {
    title: 'Theo dõi ngân sách',
    description: 'Đặt hạn mức theo tháng, sau đó hỏi tình trạng còn lại bất cứ lúc nào.',
  },
  {
    title: 'Hỏi báo cáo nhanh',
    description: 'Xem tổng chi tiêu, khoản thu hoặc các giao dịch gần đây bằng tiếng Việt.',
  },
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
  const toast = useToast();

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
  } = useChatHistory();

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

  const sendMessageMutation = useSendMessage();
  const actionHandlerMutation = useActionHandler();

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
        const response = await sendMessageMutation.mutateAsync({ message: text });
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
          toast.error('Lỗi gửi tin nhắn', message);
        }
      }
    },
    [
      addPendingMessage,
      online,
      refetchHistory,
      sendMessageMutation,
      updatePendingMessage,
      scrollToBottomWithRetry,
      toast,
    ],
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
        toast.warning('Ngoại tuyến', 'Không thể xử lý khi đang ngoại tuyến');
        return;
      }

      try {
        const data = await actionHandlerMutation.mutateAsync({
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
        toast.error('Lỗi xử lý', message);
      }
    },
    [
      addPendingMessage,
      online,
      refetchHistory,
      updatePendingMessage,
      scrollToBottomWithRetry,
      actionHandlerMutation,
      toast,
    ],
  );

  const suggestionButtons = useMemo(
    () =>
      SUGGESTIONS.map((item, index) => (
        <ActionButton
          key={item}
          size="sm"
          className="min-h-11 shrink-0 rounded-full border-sky-500/20 bg-sky-500/10 px-4 text-xs font-semibold text-sky-300 shadow-none hover:border-sky-500/40 hover:bg-sky-500/15 hover:text-sky-200 sm:text-sm"
          onClick={() => handleSend(item)}
          disabled={sendMessageMutation.isPending}
        >
          {QUICK_ACTION_LABELS[index]}
        </ActionButton>
      )),
    [handleSend, sendMessageMutation.isPending],
  );

  const isEmpty = combinedMessages.length === 0;

  return (
    <div className="relative h-full overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[360px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-b from-sky-500/10 via-blue-500/5 to-transparent blur-3xl" />
        <div className="absolute right-0 top-1/4 h-[280px] w-[280px] rounded-full bg-sky-300/5 blur-3xl" />
      </div>

      <div className="mx-auto flex h-full max-w-7xl flex-col px-3 py-3 sm:px-4 sm:py-4 lg:px-6 xl:px-8">
        <header className="relative z-10 mb-3 overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-surface)]/80 shadow-lg shadow-black/10 backdrop-blur-xl sm:mb-4 sm:rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-transparent to-blue-500/10" />
          <div className="relative flex items-center justify-between gap-3 p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-sky-500/25">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-base font-bold text-[var(--text-primary)] sm:text-xl">
                    Mimi tài chính
                  </h1>
                  <Sparkles className="hidden h-4 w-4 text-sky-400 sm:block" />
                </div>
                <p className="truncate text-xs text-[var(--text-muted)] sm:text-sm">
                  Ghi thu chi, hỏi ngân sách, xem báo cáo bằng tiếng Việt.
                </p>
              </div>
            </div>
            <div className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-[var(--bg-primary)]/50 px-3 text-xs font-semibold text-[var(--text-muted)]">
              <span className={`h-2 w-2 rounded-full ${online ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`} />
              <span className="hidden sm:inline">{online ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[var(--bg-surface)]/45 shadow-2xl shadow-black/10 backdrop-blur-xl">
          <div
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-4 sm:gap-4 sm:px-5 sm:py-5 lg:px-6"
            ref={listRef}
          >
          {isFetchingNextPage && (
            <div className="text-center py-4 text-[var(--text-muted)]">
              <div className="inline-flex items-center gap-2">
                <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          {isEmpty ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="px-5 py-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-sky-500/30 bg-gradient-to-br from-sky-400/20 to-blue-500/20">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white">
                    <WalletCards className="h-5 w-5" />
                  </div>
                </div>
                <p className="mx-auto max-w-sm text-sm leading-6 text-[var(--text-muted)] sm:text-base">
                  {historyLoading
                    ? 'Đang tải lịch sử hội thoại...'
                    : 'Bắt đầu trò chuyện với Mimi! Thử nói "Ăn phở 50k" hoặc "Tháng này tôi tiêu bao nhiêu?"'}
                </p>
              </div>
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
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {message.actions.map((action) => (
                      <ActionButton
                        key={`${message.id}-${action.id}`}
                        size="sm"
                        className="min-h-11 rounded-full px-3 text-xs sm:text-sm"
                        onClick={() => handleActionClick(message.id, action)}
                        disabled={message.actionProcessing || !online || message.status !== 'sent'}
                      >
                        {action.label}
                      </ActionButton>
                    ))}
                  </div>
                ) : null}
              </ChatBubble>
            ))
          )}

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              className="fixed bottom-[142px] right-4 z-20 grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-[var(--bg-surface)]/90 text-[var(--text-primary)] shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/30 hover:shadow-sky-500/10 sm:bottom-[154px] sm:right-8 sm:h-12 sm:w-12 lg:right-[calc(50%_-_18rem)] xl:right-[calc(50%_-_22rem)]"
              onClick={scrollToBottom}
              title="Xuống tin nhắn mới nhất"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
          </div>
          <div className="shrink-0 border-t border-white/10 bg-[var(--bg-surface)]/85 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-5 sm:pb-4 sm:pt-4 lg:px-6">
          <div className="mb-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Thao tác nhanh
            </p>
            <div
              className="no-scrollbar flex flex-nowrap gap-2 overflow-x-auto scroll-smooth sm:flex-wrap sm:overflow-x-visible"
              role="tablist"
              aria-label="Thao tác nhanh tài chính"
            >
              {suggestionButtons}
            </div>
          </div>

          <ChatComposer onSend={handleSend} disabled={sendMessageMutation.isPending} />
          </div>
          </div>

          <aside className="hidden min-h-0 overflow-hidden rounded-3xl border border-white/10 bg-[var(--bg-surface)]/55 shadow-2xl shadow-black/10 backdrop-blur-xl lg:flex lg:flex-col">
            <div className="relative overflow-hidden border-b border-white/10 p-5">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/15 via-transparent to-blue-500/10" />
              <div className="relative">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Trợ lý tài chính
                </div>
                <h2 className="text-xl font-bold leading-tight text-[var(--text-primary)]">
                  Bắt đầu nhanh với Mimi
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Dùng các gợi ý có sẵn hoặc nhập câu hỏi riêng để ghi nhận, kiểm tra ngân sách và xem báo cáo.
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="mb-5 rounded-2xl border border-white/10 bg-[var(--bg-primary)]/45 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <Target className="h-4 w-4 text-sky-400" />
                    Gợi ý có thể bấm
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`} />
                </div>
                <div className="grid gap-2">
                  {SUGGESTIONS.map((item, index) => (
                    <button
                      key={`desktop-${item}`}
                      type="button"
                      onClick={() => handleSend(item)}
                      disabled={sendMessageMutation.isPending}
                      className="group rounded-2xl border border-sky-500/15 bg-sky-500/10 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/35 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none"
                    >
                      <span className="block text-sm font-semibold text-sky-300 group-hover:text-sky-200">
                        {QUICK_ACTION_LABELS[index]}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{item}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                {ASSISTANT_GUIDES.map((guide) => (
                  <div
                    key={guide.title}
                    className="rounded-2xl border border-white/10 bg-[var(--bg-primary)]/35 p-4"
                  >
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                      <ReceiptText className="h-4 w-4 text-sky-400" />
                      {guide.title}
                    </div>
                    <p className="text-xs leading-5 text-[var(--text-muted)]">{guide.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
