import { PropsWithChildren } from 'react';
import { BarChart3, BotMessageSquare, CirclePlus, Power, Settings, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'zmp-ui';

import { useAuth } from '../hooks/auth';

const navItems = [
  { path: '/chat', label: 'Chat', icon: BotMessageSquare },
  { path: '/dashboard', label: 'Tổng quan', icon: BarChart3 },
  { path: '/manual-entry', label: 'Nhập', icon: CirclePlus },
  { path: '/profile', label: 'Hồ sơ', icon: UserRound },
  { path: '/settings', label: 'Cài đặt', icon: Settings },
];

export function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="mimi-app-shell">
      <header className="mimi-topbar">
        <button className="mimi-brand" onClick={() => navigate('/chat')} type="button">
          <span className="mimi-logo">✦</span>
          <span>Mimi</span>
        </button>
        <button className="mimi-avatar" onClick={() => navigate('/profile')} type="button">
          {user?.avatar ? <img src={user.avatar} alt="Avatar" /> : user?.email?.[0]?.toUpperCase()}
        </button>
        <button className="mimi-logout" onClick={logout} type="button" aria-label="Đăng xuất">
          <Power aria-hidden="true" size={18} strokeWidth={2.4} />
        </button>
      </header>
      <main className="mimi-content">{children}</main>
      <nav className="mimi-bottom-nav">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              className={`mimi-nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              type="button"
            >
              <span className="mimi-nav-icon">
                <Icon aria-hidden="true" size={20} strokeWidth={2.35} />
              </span>
              <small>{item.label}</small>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
