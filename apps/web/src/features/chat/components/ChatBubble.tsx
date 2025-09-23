import { ReactNode } from "react";
import "./chat.css";

interface ChatBubbleProps {
  role: "user" | "assistant";
  status: "sent" | "pending" | "queued" | "error";
  children: ReactNode;
  timestamp: string;
}

export function ChatBubble({ role, status, children, timestamp }: ChatBubbleProps) {
  return (
    <div className={`chat-row chat-row-${role}`}>
      <div className={`chat-avatar chat-avatar-${role}`}>{role === "user" ? "Bạn" : "AI"}</div>
      <div className={`chat-bubble chat-bubble-${role}`} data-status={status}>
        <div className="chat-content">{children}</div>
        <div className="chat-meta">
          <span>{timestamp}</span>
          {status === "pending" ? <span className="chat-tag">đang gửi...</span> : null}
          {status === "queued" ? <span className="chat-tag">chờ xử lý</span> : null}
          {status === "error" ? <span className="chat-tag error">lỗi</span> : null}
        </div>
      </div>
    </div>
  );
}
