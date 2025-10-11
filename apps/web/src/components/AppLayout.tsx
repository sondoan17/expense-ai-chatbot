import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/api/useAuth';
import { useOnlineStatus } from '../hooks/utils/useOnlineStatus';
import { WifiOff, Wifi, MessageCircle, PieChart, LogOut, Menu, X, Settings } from 'lucide-react';
import { useUserStore } from '../store/user.store';
import { UserDto } from '../api/types';

export function AppLayout() {
  const { logout } = useAuth();
  const user = useUserStore((s: { user: UserDto | null }) => s.user);
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* === BACKDROP OVERLAY (Mobile only) === */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSidebarOpen(false);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Đóng sidebar"
        />
      )}

      {/* === SIDEBAR === */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-[280px] flex flex-col gap-7 border-r border-slate-700/30
          bg-gradient-to-b from-slate-900/90 to-slate-800/95 p-6 backdrop-blur-xl transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-400/40 to-sky-500/60 font-bold text-slate-900">
              MM
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Mimi</h2>
            <p className="m-0 mt-1 text-sm text-slate-400">Trợ lý tài chính cá nhân</p>
          </div>
          <button
            className="md:hidden text-slate-400 hover:text-slate-100 transition-all duration-200 p-2 rounded-xl hover:bg-gradient-to-r hover:from-slate-700/30 hover:to-slate-800/30 hover:border hover:border-slate-600/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-2 mt-4">
          <NavLink
            to="chat"
            className={({ isActive }) =>
              `${
                isActive
                  ? 'bg-sky-400/20 text-slate-100'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/20'
              } inline-flex items-center gap-3 rounded-xl px-4 py-2 font-semibold transition`
            }
          >
            <MessageCircle size={18} />
            <span>Trò chuyện</span>
          </NavLink>
          <NavLink
            to="dashboard"
            className={({ isActive }) =>
              `${
                isActive
                  ? 'bg-sky-400/20 text-slate-100'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/20'
              } inline-flex items-center gap-3 rounded-xl px-4 py-2 font-semibold transition`
            }
          >
            <PieChart size={18} />
            <span>Tổng quan</span>
          </NavLink>
          <NavLink
            to="settings"
            className={({ isActive }) =>
              `${
                isActive
                  ? 'bg-sky-400/20 text-slate-100'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/20'
              } inline-flex items-center gap-3 rounded-xl px-4 py-2 font-semibold transition`
            }
          >
            <Settings size={18} />
            <span>Cài đặt</span>
          </NavLink>
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <button
            onClick={() => navigate('/app/profile')}
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-slate-300/10 to-slate-400/10 border border-slate-600/20 p-3 hover:from-slate-300/20 hover:to-slate-400/20 hover:border-slate-500/30 transition-all duration-200 cursor-pointer text-left w-full backdrop-blur-sm"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-sky-400/20 font-bold">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
              ) : (
                user?.email[0]?.toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <p className="m-0 font-semibold">{user?.name ?? user?.email}</p>
              <p className="m-0 text-sm text-slate-400">{user?.email}</p>
            </div>
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500/15 to-rose-500/15 border border-red-500/20 px-4 py-2 font-semibold text-rose-200 transition-all duration-200 hover:from-red-500/25 hover:to-rose-500/25 hover:border-red-400/30 backdrop-blur-sm"
            onClick={logout}
          >
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* === MAIN CONTENT === */}
      <main
        className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${
          sidebarOpen ? 'md:ml-[280px] ml-0' : 'ml-0'
        }`}
      >
        <header className="flex items-center justify-between px-6 py-5">
          {/* Toggle Button - Always visible */}
          <button
            className="text-slate-400 hover:text-slate-100 transition-all duration-200 p-2 rounded-xl hover:bg-gradient-to-r hover:from-slate-700/30 hover:to-slate-800/30 hover:border hover:border-slate-600/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={22} />
          </button>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
              online
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                : 'border-red-400/40 bg-red-500/15 text-rose-100'
            }`}
          >
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{online ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-10 pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
