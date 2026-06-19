import { FormEvent, useMemo, useState } from 'react';

import { AgentActionOption, ChatMessageDto } from '../api/types';
import { extractErrorMessage, isNetworkError } from '../api/client';
import { enqueueAgentMessage } from '../offline/offlineQueue';
import { useActionHandler, useChatHistory, useSendMessage } from '../hooks/api';
import { makeId } from '../utils/format';

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status: 'sent' | 'pending' | 'queued' | 'error';
  actions?: AgentActionOption[];
}

const suggestions = ['Ăn phở 50k', 'Xem chi tiêu tháng này', 'Đặt ngân sách ăn uống 2 triệu'];

function mapServerMessage(message: ChatMessageDto): ChatMessageItem {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.createdAt,
    status: message.status,
  };
}

export function ChatPage() {
  const [text, setText] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessageItem[]>([]);
  const history = useChatHistory();
  const sendMessage = useSendMessage();
  const actionHandler = useActionHandler();

  const messages = useMemo(() => {
    const server =
      history.data?.pages.reduce<ChatMessageItem[]>(
        (items, page) => [...items, ...page.data.map(mapServerMessage)],
        [],
      ) ?? [];
    return [...server, ...localMessages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [history.data, localMessages]);

  const submitMessage = async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed) return;
    setText('');
    const userMessage: ChatMessageItem = {
      id: makeId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    setLocalMessages((items) => [...items, userMessage]);
    try {
      const response = await sendMessage.mutateAsync({ message: trimmed });
      setLocalMessages((items) => [
        ...items.map((item): ChatMessageItem =>
          item.id === userMessage.id ? { ...item, status: 'sent' } : item,
        ),
        {
          id: makeId(),
          role: 'assistant',
          content: response.reply,
          timestamp: new Date().toISOString(),
          status: response.error ? 'error' : 'sent',
          actions: response.actions,
        },
      ]);
      void history.refetch();
    } catch (error) {
      if (isNetworkError(error)) {
        await enqueueAgentMessage({ id: userMessage.id, message: trimmed, createdAt: userMessage.timestamp });
        setLocalMessages((items) =>
          items.map((item): ChatMessageItem =>
            item.id === userMessage.id ? { ...item, status: 'queued' } : item,
          ),
        );
        return;
      }
      setLocalMessages((items) => [
        ...items.map((item): ChatMessageItem =>
          item.id === userMessage.id ? { ...item, status: 'error' } : item,
        ),
        {
          id: makeId(),
          role: 'assistant',
          content: extractErrorMessage(error, 'Không thể gửi tin nhắn'),
          timestamp: new Date().toISOString(),
          status: 'error',
        },
      ]);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void submitMessage(text);
  };

  const runAction = async (action: AgentActionOption) => {
    const response = await actionHandler.mutateAsync({
      actionId: action.id,
      label: action.label,
      payload: action.payload,
    });
    setLocalMessages((items) => [
      ...items,
      { id: makeId(), role: 'assistant', content: response.reply, timestamp: new Date().toISOString(), status: 'sent', actions: response.actions },
    ]);
  };

  return (
    <section className="mimi-screen mimi-chat-screen">
      <div className="mimi-section-title"><span>Expense bot</span><strong>Chat với Mimi</strong></div>
      <div className="mimi-suggestions">
        {suggestions.map((item) => <button key={item} onClick={() => void submitMessage(item)} type="button">{item}</button>)}
      </div>
      <div className="mimi-chat-list">
        {history.isLoading ? <div className="mimi-muted">Đang tải lịch sử...</div> : null}
        {messages.map((message) => (
          <article key={message.id} className={`mimi-bubble ${message.role}`}>
            <p>{message.content}</p>
            <small>{message.status === 'queued' ? 'Đã xếp hàng offline' : message.status}</small>
            {message.actions?.length ? (
              <div className="mimi-action-row">
                {message.actions.map((action) => <button key={action.id} onClick={() => void runAction(action)} type="button">{action.label}</button>)}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      <form className="mimi-composer" onSubmit={submit}>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Nhắn Mimi: cà phê 45k..." />
        <button className="mimi-button primary" disabled={sendMessage.isPending} type="submit">Gửi</button>
      </form>
    </section>
  );
}
