import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChatBubble } from "./components/ChatBubble";
import { ChatComposer } from "./components/ChatComposer";
import { AgentChatResponse } from "../../api/types";
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
}

const SUGGESTIONS = [
  'Ghi lại khoản trà sữa 55k chiều nay',
  'Xem báo cáo chi tiêu tháng này',
  'Đặt ngân sách ăn uống 2.000.000 VND cho tháng này',
  'Ghi nhận khoản thu 25.000.000 VND trong tháng này',
  'Tôi đã chi bao nhiêu cho di chuyển tuần này?',
];

function createMessage(
  role: "user" | "assistant",
  content: string,
  status: ChatMessageItem["status"] = "sent",
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
  };
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    const cached = localStorage.getItem("expense-ai-chat-log");
    if (!cached) return [];
    try {
      return JSON.parse(cached) as ChatMessageItem[];
    } catch (error) {
      console.warn("Failed to parse cached chat log", error);
      return [];
    }
  });
  const listRef = useRef<HTMLDivElement | null>(null);
  const online = useOnlineStatus();

  useEffect(() => {
    localStorage.setItem("expense-ai-chat-log", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const updateMessage = useCallback((id: string, updater: (msg: ChatMessageItem) => ChatMessageItem) => {
    setMessages((prev) => prev.map((msg) => (msg.id === id ? updater(msg) : msg)));
  }, []);

  const addMessage = useCallback((msg: ChatMessageItem) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const { mutateAsync: sendToAgent, isPending } = useMutation({
    mutationFn: async (payload: { message: string }) => {
      const { data } = await apiClient.post<AgentChatResponse>("/agent/chat", payload);
      return data;
    },
  });

  useOfflineAgentSync(({ messageId, response, error }) => {
    if (response) {
      updateMessage(messageId, (msg) => ({ ...msg, status: "sent" }));
      addMessage(createMessage("assistant", response.reply));
    } else if (error) {
      updateMessage(messageId, (msg) => ({ ...msg, status: "error" }));
      addMessage(createMessage("assistant", error, "error"));
    }
  });

  const handleSend = useCallback(
    async (text: string) => {
      const outgoing = createMessage("user", text, "pending");
      addMessage(outgoing);

      if (!online) {
        await enqueueAgentMessage({ id: outgoing.id, message: text, createdAt: new Date().toISOString() });
        updateMessage(outgoing.id, (msg) => ({ ...msg, status: "queued" }));
        addMessage(createMessage("assistant", "Đã lưu tin nhắn, mình sẽ xử lý khi bạn trực tuyến lại.", "queued"));
        return;
      }

      try {
        const response = await sendToAgent({ message: text });
        updateMessage(outgoing.id, (msg) => ({ ...msg, status: "sent" }));
        addMessage(createMessage("assistant", response.reply));
      } catch (error) {
        const offlineError = isNetworkError(error) || navigator.onLine === false;
        if (offlineError) {
          await enqueueAgentMessage({ id: outgoing.id, message: text, createdAt: new Date().toISOString() });
          updateMessage(outgoing.id, (msg) => ({ ...msg, status: "queued" }));
          addMessage(createMessage("assistant", "Đã lưu tin nhắn, mình sẽ xử lý khi bạn trực tuyến lại.", "queued"));
        } else {
          const message = extractErrorMessage(error, "Không thể gửi tin nhắn.");
          updateMessage(outgoing.id, (msg) => ({ ...msg, status: "error" }));
          addMessage(createMessage("assistant", message, "error"));
        }
      }
    },
    [addMessage, online, sendToAgent, updateMessage],
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
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
            Bắt đầu bằng câu “Ghi lại khoản trà sữa 55k” để xem trợ lý ghi nhận giao dịch.
          </div>
        ) : (
          messages.map((message) => (
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

