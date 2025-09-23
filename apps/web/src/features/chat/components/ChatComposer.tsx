import { FormEvent, useState } from "react";
import { Send } from "lucide-react";

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
  };

  return (
    <form className="chat-composer" onSubmit={handleSubmit}>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type a message for the assistant..."
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !value.trim()}>
        <Send size={18} /> Send
      </button>
    </form>
  );
}
