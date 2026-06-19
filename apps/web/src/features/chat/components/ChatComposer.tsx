import { FormEvent, KeyboardEvent, useRef, useState } from 'react';
import { Send } from 'lucide-react';

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const submitMessage = () => {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <form className="relative" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Nhập khoản chi, ngân sách hoặc câu hỏi..."
        disabled={disabled}
        rows={1}
        className="max-h-[200px] min-h-14 w-full resize-none overflow-y-auto rounded-2xl border border-white/10 bg-[var(--bg-primary)]/70 py-3 pl-4 pr-14 text-sm leading-6 text-[var(--text-primary)] shadow-inner shadow-black/10 backdrop-blur-sm transition placeholder:text-[var(--text-muted)] focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-65 sm:min-h-16 sm:py-3.5 sm:pl-4 sm:pr-16 sm:text-base"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:-translate-y-[calc(50%+1px)] hover:shadow-xl hover:shadow-sky-500/35 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none disabled:hover:translate-y-[-50%] sm:right-3 sm:h-12 sm:w-12"
        aria-label="Gửi tin nhắn"
      >
        <Send size={18} className="sm:hidden" />
        <Send size={20} className="hidden sm:block" />
      </button>
    </form>
  );
}

