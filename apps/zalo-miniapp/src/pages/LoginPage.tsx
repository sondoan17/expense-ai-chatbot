import { FormEvent, useState } from 'react';
import { useNavigate } from 'zmp-ui';

import { useLogin } from '../hooks/api';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    }
  };

  return (
    <main className="mimi-page mimi-auth">
      <section className="mimi-card mimi-auth-card">
        <span className="mimi-kicker">Welcome back</span>
        <h1>Chào mừng trở lại</h1>
        <p>Đăng nhập để tiếp tục chat và xem dashboard Mimi.</p>
        <form className="mimi-form" onSubmit={submit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Mật khẩu
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </label>
          {error ? <div className="mimi-error">{error}</div> : null}
          <button className="mimi-button primary" disabled={login.isPending} type="submit">
            {login.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <button className="mimi-link-button" onClick={() => navigate('/register')} type="button">
          Chưa có tài khoản? Đăng ký ngay
        </button>
      </section>
    </main>
  );
}
