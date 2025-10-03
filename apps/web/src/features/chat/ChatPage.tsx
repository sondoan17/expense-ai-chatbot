import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChatBubble } from "./components/ChatBubble";
import { ChatComposer } from "./components/ChatComposer";
import { AgentChatResponse, ChatMessageDto } from "../../api/types";
import { AgentActionOption } from "@expense-ai/shared";

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
  actions?: AgentActionOption[];
  actionProcessing?: boolean;
}
const SUGGESTIONS = [
  "Xem bao cao chi tieu thang nay",
  "Dat ngan sach an uong 2.000.000 VND cho thang nay",
  "Ghi nhan khoan thu 25.000.000 VND trong thang nay",
  "Toi da chi bao nhieu cho di chuyen tuan nay?",
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
        addPendingMessage(
          createMessage("assistant", response.reply, "sent", {
            localOnly: true,
            actions: response.actions ?? undefined,
          }),
        );
        if (!response.actions?.length) {
          void refetchHistory();
        }
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
            "ÄÃ£ lÆ°u tin nháº¯n, mÃ¬nh sáº½ xá»­ lÃ½ khi báº¡n trá»±c tuyáº¿n láº¡i.",
            "queued",
            { localOnly: true },
          ),
        );
        return;
      }

      try {
        const response = await sendToAgent({ message: text });
        updatePendingMessage(outgoing.id, (msg) => ({ ...msg, status: "sent" }));
        addPendingMessage(
          createMessage("assistant", response.reply, "sent", {
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
          await enqueueAgentMessage({ id: outgoing.id, message: text, createdAt: new Date().toISOString() });
          updatePendingMessage(outgoing.id, (msg) => ({ ...msg, status: "queued" }));
          addPendingMessage(
            createMessage(
              "assistant",
              "ÄÃ£ lÆ°u tin nháº¯n, mÃ¬nh sáº½ xá»­ lÃ½ khi báº¡n trá»±c tuyáº¿n láº¡i.",
              "queued",
              { localOnly: true },
            ),
          );
        } else {
          const message = extractErrorMessage(error, "KhÃ´ng thá»ƒ gá»­i tin nháº¯n.");
          updatePendingMessage(outgoing.id, (msg) => ({ ...msg, status: "error" }));
          addPendingMessage(createMessage("assistant", message, "error", { localOnly: true }));
        }
      }
    },
    [addPendingMessage, online, refetchHistory, sendToAgent, updatePendingMessage],
  );

  const handleActionClick = useCallback(
    async (sourceMessageId: string, action: AgentActionOption) => {
      updatePendingMessage(sourceMessageId, (msg) => ({ ...msg, actionProcessing: true }));

      const userActionMessage = createMessage("user", action.label, "pending", { localOnly: true });
      addPendingMessage(userActionMessage);

      if (!online) {
        updatePendingMessage(userActionMessage.id, (msg) => ({ ...msg, status: "error" }));
        updatePendingMessage(sourceMessageId, (msg) => ({ ...msg, actionProcessing: false }));
        addPendingMessage(
          createMessage(
            "assistant",
            "Khong the xu ly khi dang ngoai tuyen.",
            "error",
            { localOnly: true },
          ),
        );
        return;
      }

      try {
        const { data } = await apiClient.post<AgentChatResponse>("/agent/action", {
          actionId: action.id,
          label: action.label,
          payload: action.payload,
        });

        updatePendingMessage(userActionMessage.id, (msg) => ({ ...msg, status: "sent" }));
        updatePendingMessage(sourceMessageId, (msg) => ({ ...msg, actions: [], actionProcessing: false }));
        addPendingMessage(
          createMessage("assistant", data.reply, "sent", {
            localOnly: true,
            actions: data.actions ?? undefined,
          }),
        );

        if (!data.actions?.length) {
          await refetchHistory();
        }
      } catch (error) {
        const message = extractErrorMessage(error, "Khong the xu ly yeu cau ngay luc nay.");
        updatePendingMessage(userActionMessage.id, (msg) => ({ ...msg, status: "error" }));
        updatePendingMessage(sourceMessageId, (msg) => ({ ...msg, actionProcessing: false }));
        addPendingMessage(createMessage("assistant", message, "error", { localOnly: true }));
      }
    },
    [addPendingMessage, online, refetchHistory, updatePendingMessage],
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
          <h1>Tro chuyen voi tro ly chi tieu</h1>
          <p className="chat-subtitle">Ghi chep chi tieu, theo doi ngan sach va yeu cau bao cao ngay trong tro chuyen.</p>
        </div>
        <div className="chat-status-pill" data-online={online}>
          <span className="dot" /> {online ? "Truc tuyen" : "Ngoai tuyen"}
        </div>
      </header>
      <div className="chat-messages" ref={listRef}>
        {isEmpty ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
            {historyLoading ? "Dang tai lich su hoi thoai..." : "Bat dau bang cau \"Ghi lai khoan tra sua 55k\" de xem tro ly ghi nhan giao dich."}
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
              <div>{message.content}</div>
              {message.actions?.length ? (
                <div className="chat-bubble-actions">
                  {message.actions.map((action) => (
                    <button
                      key={`${message.id}-${action.id}`}
                      className="chat-action-button"
                      onClick={() => handleActionClick(message.id, action)}
                      disabled={message.actionProcessing || !online || message.status !== "sent"}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
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






