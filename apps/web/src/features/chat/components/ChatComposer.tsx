import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { Send } from "lucide-react";

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event as unknown as FormEvent);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
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
        placeholder="Nhập tin nhắn cho trợ lý..."
        disabled={disabled}
        rows={1}
        className="w-full min-h-[56px] sm:min-h-[64px] max-h-[200px] resize-none overflow-y-auto rounded-xl sm:rounded-2xl border border-slate-700/60 bg-slate-900/60 pl-3 pr-12 sm:pl-4 sm:pr-16 py-2.5 sm:py-3 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-65"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 font-semibold text-slate-900 shadow-[0_8px_16px_-4px_rgba(14,165,233,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_12px_20px_-6px_rgba(14,165,233,0.45)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
      >
        <Send size={16} className="sm:hidden" />
        <Send size={18} className="hidden sm:block" />
      </button>
    </form>
  );
}
