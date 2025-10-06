import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { WifiOff, Wifi, MessageCircle, PieChart, LogOut, Menu, X } from "lucide-react";

export function AppLayout() {
  const { user, logout } = useAuth();
  const online = useOnlineStatus();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* === SIDEBAR === */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-[280px] flex flex-col gap-7 border-r border-slate-700/30
          bg-gradient-to-b from-slate-900/90 to-slate-800/95 p-6 backdrop-blur-xl transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
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
            className="md:hidden text-slate-400 hover:text-slate-100 transition"
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
                  ? "bg-sky-400/20 text-slate-100"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/20"
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
                  ? "bg-sky-400/20 text-slate-100"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/20"
              } inline-flex items-center gap-3 rounded-xl px-4 py-2 font-semibold transition`
            }
          >
            <PieChart size={18} />
            <span>Tổng quan</span>
          </NavLink>
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-300/10 p-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-sky-400/20 font-bold">
              {user?.name?.[0]?.toUpperCase() ?? user?.email[0]?.toUpperCase()}
            </div>
            <div>
              <p className="m-0 font-semibold">{user?.name ?? user?.email}</p>
              <p className="m-0 text-sm text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-red-500/15 px-4 py-2 font-semibold text-rose-200 transition hover:bg-red-500/25"
            onClick={logout}
          >
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* === MAIN CONTENT === */}
      <main
        className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${
          sidebarOpen ? "md:ml-[280px]" : "ml-0"
        }`}
      >
        <header className="flex items-center justify-between px-6 py-5">
          {/* Toggle Button */}
          <button
            className="md:hidden text-slate-400 hover:text-slate-100 transition"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
              online
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                : "border-red-400/40 bg-red-500/15 text-rose-100"
            }`}
          >
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{online ? "Trực tuyến" : "Ngoại tuyến"}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-10 pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
