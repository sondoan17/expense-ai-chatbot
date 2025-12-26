import { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

interface Message {
  type: 'user' | 'ai';
  content: React.ReactNode;
}

const messages: Message[] = [
  {
    type: 'user',
    content: 'Vừa ăn phở 45k',
  },
  {
    type: 'ai',
    content: (
      <>
        <p className="mb-2">Đã ghi nhận chi tiêu:</p>
        <div className="bg-[var(--bg-surface)] rounded-xl p-3 space-y-1 text-sm">
          <p>
            <span className="text-[var(--text-muted)]">🍜 Món:</span> Phở
          </p>
          <p>
            <span className="text-[var(--text-muted)]">💰 Số tiền:</span> 45,000đ
          </p>
          <p>
            <span className="text-[var(--text-muted)]">📁 Danh mục:</span> Ăn uống
          </p>
        </div>
      </>
    ),
  },
  {
    type: 'user',
    content: 'Tháng này tôi tiêu bao nhiêu rồi?',
  },
  {
    type: 'ai',
    content: (
      <>
        <p>
          Tổng chi tiêu tháng 12: <span className="font-bold text-sky-400">2,450,000đ</span>
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-1">Ăn uống chiếm 45% tổng chi</p>
      </>
    ),
  },
];

export function ChatPreview() {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const hasStarted = useRef(false);
  const timeoutIds = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Only run once when first comes into view
    if (!isInView || hasStarted.current) return;
    hasStarted.current = true;

    // Clear any existing timeouts
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = [];

    // Reset state
    setVisibleMessages([]);
    setIsTyping(false);

    // Schedule all messages with proper timing
    const schedule = [
      { delay: 300, action: () => setVisibleMessages([0]) }, // User msg 1
      { delay: 1200, action: () => setIsTyping(true) }, // Typing starts
      {
        delay: 2000,
        action: () => {
          setIsTyping(false);
          setVisibleMessages([0, 1]);
        },
      }, // AI msg 1
      { delay: 3500, action: () => setVisibleMessages([0, 1, 2]) }, // User msg 2
      { delay: 4500, action: () => setIsTyping(true) }, // Typing starts
      {
        delay: 5300,
        action: () => {
          setIsTyping(false);
          setVisibleMessages([0, 1, 2, 3]);
        },
      }, // AI msg 2
    ];

    schedule.forEach(({ delay, action }) => {
      const id = setTimeout(action, delay);
      timeoutIds.current.push(id);
    });

    return () => {
      timeoutIds.current.forEach(clearTimeout);
    };
  }, [isInView]);

  // Auto-scroll to bottom when new messages appear
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [visibleMessages, isTyping]);

  return (
    <div ref={ref} className="relative">
      <div className="relative z-10 bg-[var(--bg-surface)]/80 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        {/* Chat Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold">Mimi</p>
            <p className="text-xs text-emerald-400">● Đang hoạt động</p>
          </div>
        </div>

        {/* Chat Messages */}
        <div
          ref={messagesContainerRef}
          className="py-6 space-y-4 h-[280px] overflow-y-auto no-scrollbar"
        >
          {messages.map((message, index) => {
            const isVisible = visibleMessages.includes(index);
            if (!isVisible) return null;

            const isUser = message.type === 'user';

            return (
              <div
                key={index}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate__animated animate__fadeInUp animate__faster`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl max-w-[80%] ${
                    isUser
                      ? 'bg-sky-500 text-white rounded-br-md'
                      : 'bg-[var(--bg-elevated)] rounded-bl-md'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start animate__animated animate__fadeIn animate__faster">
              <div className="bg-[var(--bg-elevated)] px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/10">
          <div className="flex-1 bg-[var(--bg-primary)] rounded-xl px-4 py-3 text-[var(--text-muted)]">
            Nhập tin nhắn...
          </div>
          <button className="p-3 bg-gradient-to-r from-sky-400 to-blue-600 rounded-xl cursor-pointer">
            <MessageSquare className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
