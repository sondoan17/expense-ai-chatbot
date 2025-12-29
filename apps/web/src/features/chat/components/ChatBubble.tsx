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
      {/* Avatar với gradient matching landing page */}
      <div
        className={`grid h-8 w-8 sm:h-11 sm:w-11 place-items-center rounded-full font-bold tracking-wide flex-shrink-0 text-xs sm:text-sm shadow-lg ${role === 'user'
            ? 'bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-sky-500/25'
            : 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-emerald-500/25'
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

      {/* Chat bubble với design matching landing */}
      <div
        className={`max-w-[min(620px,85vw)] sm:max-w-[min(620px,70vw)] rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-[0.98rem] leading-5 sm:leading-6 flex flex-col gap-1.5 sm:gap-2 shadow-lg ${role === 'user'
            ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-br-md shadow-sky-500/25'
            : 'bg-[var(--bg-surface)]/80 backdrop-blur-sm border border-white/10 rounded-bl-md shadow-black/20'
          }`}
        data-status={status}
      >
        <div className="whitespace-pre-wrap break-words">{children}</div>
        <div
          className={`flex items-center gap-1.5 sm:gap-2 text-[0.7rem] sm:text-[0.75rem] ${role === 'user' ? 'text-white/70' : 'text-[var(--text-muted)]'}`}
        >
          <span>{timestamp}</span>
          {status === 'pending' ? (
            <span
              className={`rounded-full px-1.5 py-0.5 font-semibold text-xs ${role === 'user' ? 'bg-white/20 text-white/80' : 'bg-sky-500/20 text-sky-300'}`}
            >
              đang gửi...
            </span>
          ) : null}
          {status === 'queued' ? (
            <span
              className={`rounded-full px-1.5 py-0.5 font-semibold text-xs ${role === 'user' ? 'bg-white/20 text-white/80' : 'bg-amber-500/20 text-amber-300'}`}
            >
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

