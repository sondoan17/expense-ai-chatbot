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
    <form className="flex items-end gap-3" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Nhập tin nhắn cho trợ lý..."
        disabled={disabled}
        rows={1}
        className="w-full min-h-[64px] max-h-[200px] resize-none overflow-y-auto rounded-2xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-slate-100 placeholder:text-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-65"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-400 px-4 py-3 font-semibold text-slate-900 shadow-[0_18px_32px_-12px_rgba(14,165,233,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_40px_-10px_rgba(14,165,233,0.45)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Send size={18} /> Gửi
      </button>
    </form>
  );
}
