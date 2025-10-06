import { ReactNode } from 'react';
import botAvatar from '../../../../assets/images/bot-pfp.png';
interface ChatBubbleProps {
  role: 'user' | 'assistant';
  status: 'sent' | 'pending' | 'queued' | 'error';
  children: ReactNode;
  timestamp: string;
}

export function ChatBubble({ role, status, children, timestamp }: ChatBubbleProps) {
  return (
    <div className={`flex items-start gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`}>
      <div
        className={`grid h-11 w-11 place-items-center rounded-full font-bold tracking-wide flex-shrink-0 ${
          role === 'user' ? 'bg-sky-400/20 text-sky-400' : 'bg-emerald-400/20 text-emerald-400 '
        }`}
      >
        {role === 'assistant' && (
          <img src={botAvatar} alt="Bot Avatar" className="w-full h-full object-cover" />
        )}
        {role === 'user' ? 'Bạn' : ''}
      </div>

      <div
        className={`max-w-[min(620px,70vw)] rounded-2xl border px-4 py-3 text-[0.98rem] leading-6 flex flex-col gap-2 ${
          role === 'user'
            ? 'bg-gradient-to-br from-sky-400/20 to-sky-500/15 border-sky-400/30'
            : 'bg-gradient-to-br from-indigo-600/20 to-indigo-400/15 border-indigo-400/25'
        }`}
        data-status={status}
      >
        <div className="whitespace-pre-wrap">{children}</div>
        <div className="flex items-center gap-2 text-[0.75rem] text-slate-400">
          <span>{timestamp}</span>
          {status === 'pending' ? (
            <span className="rounded-full bg-slate-500/20 px-2 py-0.5 font-semibold">
              đang gửi...
            </span>
          ) : null}
          {status === 'queued' ? (
            <span className="rounded-full bg-slate-500/20 px-2 py-0.5 font-semibold">
              chờ xử lý
            </span>
          ) : null}
          {status === 'error' ? (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 font-semibold text-red-200">
              lỗi
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
