import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'zmp-ui';

import { useRegister } from '../hooks/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const strength = useMemo(() => Math.min(5, [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^a-zA-Z0-9]/.test(password), password.length >= 12].filter(Boolean).length), [password]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await register.mutateAsync({ email, password, name: name || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    }
  };

  return (
    <main className="mimi-page mimi-auth">
      <section className="mimi-card mimi-auth-card">
        <span className="mimi-kicker">Start tracking</span>
        <h1>Tạo tài khoản Mimi</h1>
        <p>Miễn phí, không cần thẻ, chỉ cần email để đồng bộ dữ liệu.</p>
        <form className="mimi-form" onSubmit={submit}>
          <label>Họ tên<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
          <label>Mật khẩu<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} required /></label>
          <div className="mimi-strength">{[1, 2, 3, 4, 5].map((level) => <span key={level} className={level <= strength ? 'on' : ''} />)}</div>
          {error ? <div className="mimi-error">{error}</div> : null}
          <button className="mimi-button primary" disabled={register.isPending} type="submit">
            {register.isPending ? 'Đang tạo...' : 'Đăng ký'}
          </button>
        </form>
        <button className="mimi-link-button" onClick={() => navigate('/login')} type="button">
          Đã có tài khoản? Đăng nhập
        </button>
      </section>
    </main>
  );
}
