import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import "./layout.css";
import { WifiOff, Wifi, MessageCircle, PieChart, LogOut } from "lucide-react";

export function AppLayout() {
  const { user, logout } = useAuth();
  const online = useOnlineStatus();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">MM</span>
          <h2>Mimi</h2>
          <p>Trợ lý tài chính cá nhân</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="chat" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            <MessageCircle size={18} />
            <span>Trò chuyện</span>
          </NavLink>
          <NavLink to="dashboard" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            <PieChart size={18} />
            <span>Tổng quan</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="avatar">{user?.name?.[0]?.toUpperCase() ?? user?.email[0]?.toUpperCase()}</div>
            <div>
              <p className="user-name">{user?.name ?? user?.email}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button className="logout-button" onClick={logout}>
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>
      <main className="app-main">
        <header className="topbar">
          <div className="status-chip" data-online={online}>
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{online ? "Trực tuyến" : "Ngoại tuyến"}</span>
          </div>
        </header>
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
