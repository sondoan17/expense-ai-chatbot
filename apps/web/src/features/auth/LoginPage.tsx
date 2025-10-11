import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from '../../hooks/api/useAuthApi';
import { useToast } from '../../contexts/ToastContext';

export function LoginPage() {
  const loginMutation = useLogin();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await loginMutation.mutateAsync({ email, password });
      toast.success('Đăng nhập thành công', 'Chào mừng bạn quay trở lại!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      setError(errorMessage);
      toast.error('Đăng nhập thất bại', errorMessage);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-500/10 via-transparent to-sky-500/10 flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-md">
        <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-sky-400/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl" />

        <div className="relative rounded-3xl border border-slate-800/40 bg-slate-900/60 backdrop-blur-xl shadow-[0_40px_80px_-20px_rgba(2,6,23,0.6)] p-6 sm:p-8">
          <div className="mb-6 sm:mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold tracking-widest text-sky-400">
              Mimi
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-sky-300 bg-clip-text text-transparent">
                Chào mừng trở lại
              </span>
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              Đăng nhập bằng email và mật khẩu để trò chuyện với trợ lý chi tiêu.
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              Email
              <input
                className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-slate-100 placeholder:text-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@example.com"
                required
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              Mật khẩu
              <input
                className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/60 px-4 py-3 text-slate-100 placeholder:text-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu"
                required
              />
            </label>

            {error ? (
              <p className="m-0 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-1 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-4 py-3 font-semibold text-slate-900 shadow-[0_18px_32px_-12px_rgba(56,189,248,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_40px_-10px_rgba(56,189,248,0.45)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            <p>
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-semibold text-sky-300 hover:underline">
                Đăng ký ngay
              </Link>
            </p>
            <p className="mt-2">
              <Link to="/forgot-password" className="font-semibold text-sky-300 hover:underline">
                Quên mật khẩu?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
