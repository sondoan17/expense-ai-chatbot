import { PropsWithChildren } from 'react';
import { useLocation, useNavigate } from 'zmp-ui';

import { useAuth } from '../hooks/auth';

const navItems = [
  { path: '/chat', label: 'Chat', icon: '💬' },
  { path: '/dashboard', label: 'Tổng quan', icon: '📊' },
  { path: '/manual-entry', label: 'Nhập', icon: '➕' },
  { path: '/profile', label: 'Hồ sơ', icon: '👤' },
  { path: '/settings', label: 'Cài đặt', icon: '⚙️' },
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
          ⏻
        </button>
      </header>
      <main className="mimi-content">{children}</main>
      <nav className="mimi-bottom-nav">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              className={`mimi-nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              type="button"
            >
              <span>{item.icon}</span>
              <small>{item.label}</small>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
