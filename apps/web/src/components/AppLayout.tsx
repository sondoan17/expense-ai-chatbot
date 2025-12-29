import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/api/useAuth';
import {
  MessageCircle,
  LogOut,
  PieChart,
  Settings,
  PlusCircle,
  Sparkles,
  Bot,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { useUserStore } from '../store/user.store';
import { UserDto } from '../api/types';

// Chatbot types configuration
const CHATBOTS = [
  {
    id: 'expense',
    name: 'Chi tiêu',
    icon: Wallet,
    path: 'chat',
    color: 'sky',
    description: 'Ghi nhận chi tiêu',
  },
  {
    id: 'savings',
    name: 'Tiết kiệm',
    icon: TrendingUp,
    path: 'chat',
    color: 'emerald',
    description: 'Lập kế hoạch tiết kiệm',
    disabled: true,
  },
  {
    id: 'advisor',
    name: 'Tư vấn',
    icon: Bot,
    path: 'chat',
    color: 'purple',
    description: 'Tư vấn tài chính',
    disabled: true,
  },
];

// Routes that belong to Expense chatbot
const EXPENSE_ROUTES = ['chat', 'dashboard', 'manual-entry'];

export function AppLayout() {
  const { logout } = useAuth();
  const user = useUserStore((s: { user: UserDto | null }) => s.user);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current route is part of Expense chatbot
  const isExpenseChatbot = EXPENSE_ROUTES.some((route) =>
    location.pathname.includes(route),
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* === TOP NAVBAR === */}
      <nav className="flex-shrink-0 border-b border-white/10 bg-[var(--bg-surface)]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Logo + Chatbot Tabs */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent hidden sm:inline">
                Mimi
              </span>
            </div>

            {/* Chatbot Tabs */}
            <div className="flex items-center gap-1">
              {CHATBOTS.map((bot) => {
                const baseClasses =
                  'group relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200';
                const disabledClasses = 'opacity-50 cursor-not-allowed pointer-events-none';
                const activeClasses =
                  'bg-gradient-to-r from-sky-500/20 to-sky-600/20 text-[var(--text-primary)] border border-sky-500/30';
                const inactiveClasses =
                  'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/60 border border-transparent hover:border-white/10';

                return (
                  <NavLink
                    key={bot.id}
                    to={bot.path}
                    className={({ isActive }) =>
                      `${baseClasses} ${bot.disabled ? disabledClasses : isActive ? activeClasses : inactiveClasses}`
                    }
                    title={bot.description}
                  >
                    <bot.icon className="w-4 h-4" />
                    <span className="hidden md:inline">{bot.name}</span>
                    {bot.disabled && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                        Soon
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Right: Nav Links + User */}
          <div className="flex items-center gap-2">
            {/* Quick Nav - Only show for Expense chatbot */}
            {isExpenseChatbot && (
              <>
                <div className="hidden sm:flex items-center gap-1">
                  <NavLink
                    to="dashboard"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                        ? 'bg-[var(--bg-surface)]/80 text-[var(--text-primary)] border border-white/10'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/40'
                      }`
                    }
                  >
                    <PieChart className="w-4 h-4" />
                    <span className="hidden lg:inline">Tổng quan</span>
                  </NavLink>
                  <NavLink
                    to="manual-entry"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                        ? 'bg-[var(--bg-surface)]/80 text-[var(--text-primary)] border border-white/10'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/40'
                      }`
                    }
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span className="hidden lg:inline">Nhập</span>
                  </NavLink>
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-6 bg-white/10 mx-2" />
              </>
            )}

            {/* User Menu */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/app/settings')}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/60 transition-all duration-200"
                title="Cài đặt"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/app/profile')}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[var(--bg-surface)]/60 transition-all duration-200"
                title={user?.email}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-sky-500/25">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full" />
                  ) : (
                    user?.email[0]?.toUpperCase()
                  )}
                </div>
              </button>
              <button
                className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
                onClick={logout}
                title="Đăng xuất"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: Bottom tabs - Only show for Expense chatbot */}
        {isExpenseChatbot && (
          <div className="sm:hidden flex items-center justify-around border-t border-white/5 py-1">
            <NavLink
              to="chat"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive ? 'text-sky-400' : 'text-[var(--text-muted)]'
                }`
              }
            >
              <MessageCircle className="w-5 h-5" />
              <span>Chat</span>
            </NavLink>
            <NavLink
              to="dashboard"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive ? 'text-sky-400' : 'text-[var(--text-muted)]'
                }`
              }
            >
              <PieChart className="w-5 h-5" />
              <span>Tổng quan</span>
            </NavLink>
            <NavLink
              to="manual-entry"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive ? 'text-sky-400' : 'text-[var(--text-muted)]'
                }`
              }
            >
              <PlusCircle className="w-5 h-5" />
              <span>Nhập</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* === MAIN CONTENT === */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
