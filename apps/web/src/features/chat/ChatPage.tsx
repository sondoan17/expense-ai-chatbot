import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChatBubble } from "./components/ChatBubble";
import { ChatComposer } from "./components/ChatComposer";
import { AgentChatResponse, ChatMessageDto } from "../../api/types";
import { apiClient, extractErrorMessage, isNetworkError } from "../../api/client";
import { enqueueAgentMessage } from "../../offline/offlineQueue";
import { useOfflineAgentSync } from "../../offline/useOfflineAgentSync";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import "./components/chat.css";

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  status: "sent" | "pending" | "queued" | "error";
  localOnly?: boolean;
}

const SUGGESTIONS = [
  "Ghi lại khoản trà sữa 55k chiều nay",
  "Xem báo cáo chi tiêu tháng này",
  "Đặt ngân sách ăn uống 2.000.000 VND cho tháng này",
  "Ghi nhận khoản thu 25.000.000 VND trong tháng này",
  "Tôi đã chi bao nhiêu cho di chuyển tuần này?",
];

function createMessage(
  role: "user" | "assistant",
  content: string,
  status: ChatMessageItem["status"] = "sent",
  overrides: Partial<ChatMessageItem> = {},
): ChatMessageItem {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
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
  const listRef = useRef<HTMLDivElement | null>(null);
  const online = useOnlineStatus();

  const {
    data: historyData,
    isLoading: historyLoading,
    isFetching: historyFetching,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["chat-history"],
    queryFn: async () => {
      const { data } = await apiClient.get<ChatMessageDto[]>("/agent/history", {
        params: { limit: 200 },
      });
      return data;
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: "always",
  });

  const historyMessages = useMemo(
    () => (historyData ?? []).map(mapServerMessage),
    [historyData],
  );

  const combinedMessages = useMemo(
    () => [...historyMessages, ...pendingMessages],
    [historyMessages, pendingMessages],
  );

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [combinedMessages]);

  useEffect(() => {
    if (!historyFetching) {
      setPendingMessages((prev) =>
        prev.filter((msg) => !(msg.localOnly && msg.status === "sent")),
      );
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

  const handleOfflineSync = useCallback(
    ({ messageId, response, error }: { messageId: string; response?: AgentChatResponse; error?: string }) => {
      if (response) {
        updatePendingMessage(messageId, (msg) => ({ ...msg, status: "sent" }));
        setPendingMessages((prev) =>
          prev.filter((msg) => !(msg.localOnly && msg.role === "assistant" && msg.status === "queued")),
        );
        addPendingMessage(createMessage("assistant", response.reply, "sent", { localOnly: true }));
        void refetchHistory();
      } else if (error) {
        updatePendingMessage(messageId, (msg) => ({ ...msg, status: "error" }));
        addPendingMessage(createMessage("assistant", error, "error", { localOnly: true }));
      }
    },
    [addPendingMessage, refetchHistory, updatePendingMessage],
  );

  useOfflineAgentSync(handleOfflineSync);

  const { mutateAsync: sendToAgent, isPending } = useMutation({
    mutationFn: async (payload: { message: string }) => {
      const { data } = await apiClient.post<AgentChatResponse>("/agent/chat", payload);
      return data;
    },
  });

  const handleSend = useCallback(
    async (text: string) => {
      const outgoing = createMessage("user", text, online ? "pending" : "queued", {
        localOnly: true,
      });
      addPendingMessage(outgoing);

      if (!online) {
        await enqueueAgentMessage({ id: outgoing.id, message: text, createdAt: new Date().toISOString() });
        updatePendingMessage(outgoing.id, (msg) => ({ ...msg, status: "queued" }));
        addPendingMessage(
          createMessage(
            "assistant",
            "Đã lưu tin nhắn, mình sẽ xử lý khi bạn trực tuyến lại.",
            "queued",
            { localOnly: true },
          ),
        );
        return;
      }

      try {
        const response = await sendToAgent({ message: text });
        updatePendingMessage(outgoing.id, (msg) => ({ ...msg, status: "sent" }));
        addPendingMessage(createMessage("assistant", response.reply, "sent", { localOnly: true }));
        await refetchHistory();
      } catch (error) {
        const offlineError = isNetworkError(error) || navigator.onLine === false;
        if (offlineError) {
          await enqueueAgentMessage({ id: outgoing.id, message: text, createdAt: new Date().toISOString() });
          updatePendingMessage(outgoing.id, (msg) => ({ ...msg, status: "queued" }));
          addPendingMessage(
            createMessage(
              "assistant",
              "Đã lưu tin nhắn, mình sẽ xử lý khi bạn trực tuyến lại.",
              "queued",
              { localOnly: true },
            ),
          );
        } else {
          const message = extractErrorMessage(error, "Không thể gửi tin nhắn.");
          updatePendingMessage(outgoing.id, (msg) => ({ ...msg, status: "error" }));
          addPendingMessage(createMessage("assistant", message, "error", { localOnly: true }));
        }
      }
    },
    [addPendingMessage, online, refetchHistory, sendToAgent, updatePendingMessage],
  );

  const suggestionButtons = useMemo(
    () =>
      SUGGESTIONS.map((item) => (
        <button key={item} className="quick-action" onClick={() => handleSend(item)} disabled={isPending}>
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
          <p className="chat-subtitle">Ghi chép chi tiêu, theo dõi ngân sách và yêu cầu báo cáo ngay trong cuộc trò chuyện.</p>
        </div>
        <div className="chat-status-pill" data-online={online}>
          <span className="dot" /> {online ? "Trực tuyến" : "Ngoại tuyến"}
        </div>
      </header>
      <div className="chat-messages" ref={listRef}>
        {isEmpty ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
            {historyLoading ? "Đang tải lịch sử hội thoại..." : "Bắt đầu bằng câu “Ghi lại khoản trà sữa 55k” để xem trợ lý ghi nhận giao dịch."}
          </div>
        ) : (
          combinedMessages.map((message) => (
            <ChatBubble
              key={message.id}
              role={message.role}
              status={message.status}
              timestamp={new Date(message.timestamp).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            >
              {message.content}
            </ChatBubble>
          ))
        )}
      </div>
      <div className="chat-input-area">
        <div className="quick-actions">{suggestionButtons}</div>
        <ChatComposer onSend={handleSend} disabled={isPending} />
      </div>
    </div>
  );
}
