import { FormEvent, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { extractErrorMessage } from "../../api/client";
import "./auth.css";

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ email, password });
    } catch (err) {
      setError(extractErrorMessage(err, "Đăng nhập thất bại"));
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-badge">Expense AI</span>
          <h1>Chào mừng trở lại</h1>
          <p>Đăng nhập bằng email và mật khẩu để trò chuyện với trợ lý chi tiêu.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ban@vidu.com"
              required
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              required
            />
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <p className="auth-footer">Cần tài khoản? Gọi endpoint `/auth/register` để tạo mới.</p>
      </div>
    </div>
  );
}
