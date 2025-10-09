import { ReactNode } from 'react';
import botAvatar from '../../../../assets/images/bot-pfp.png';
import { useUserStore } from '../../../store/user.store';
interface ChatBubbleProps {
  role: 'user' | 'assistant';
  status: 'sent' | 'pending' | 'queued' | 'error';
  children: ReactNode;
  timestamp: string;
}

export function ChatBubble({ role, status, children, timestamp }: ChatBubbleProps) {
  const user = useUserStore(
    (s: { user: { avatar?: string | null; email: string } | null }) => s.user,
  );
  return (
    <div className={`flex items-start gap-2 sm:gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`}>
      <div
        className={`grid h-8 w-8 sm:h-11 sm:w-11 place-items-center rounded-full font-bold tracking-wide flex-shrink-0 text-xs sm:text-sm ${
          role === 'user' ? 'bg-sky-400/20 text-sky-400' : 'bg-emerald-400/20 text-emerald-400 '
        }`}
      >
        {role === 'assistant' && (
          <img
            src={botAvatar}
            alt="Bot Avatar"
            className="w-full h-full object-cover rounded-full"
          />
        )}
        {role === 'user' ? (
          user?.avatar ? (
            <img
              src={user.avatar}
              alt="User Avatar"
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            user?.email[0]?.toUpperCase()
          )
        ) : (
          ''
        )}
      </div>

      <div
        className={`max-w-[min(620px,85vw)] sm:max-w-[min(620px,70vw)] rounded-xl sm:rounded-2xl border px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-[0.98rem] leading-5 sm:leading-6 flex flex-col gap-1.5 sm:gap-2 ${
          role === 'user'
            ? 'bg-gradient-to-br from-sky-400/20 to-sky-500/15 border-sky-400/30'
            : 'bg-gradient-to-br from-indigo-600/20 to-indigo-400/15 border-indigo-400/25'
        }`}
        data-status={status}
      >
        <div className="whitespace-pre-wrap break-words">{children}</div>
        <div className="flex items-center gap-1.5 sm:gap-2 text-[0.7rem] sm:text-[0.75rem] text-slate-400">
          <span>{timestamp}</span>
          {status === 'pending' ? (
            <span className="rounded-full bg-slate-500/20 px-1.5 py-0.5 font-semibold text-xs">
              đang gửi...
            </span>
          ) : null}
          {status === 'queued' ? (
            <span className="rounded-full bg-slate-500/20 px-1.5 py-0.5 font-semibold text-xs">
              chờ xử lý
            </span>
          ) : null}
          {status === 'error' ? (
            <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 font-semibold text-xs text-red-200">
              lỗi
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
