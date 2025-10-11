import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../../hooks/api/useAuthApi';
import { useToast } from '../../contexts/ToastContext';

export function ForgotPasswordPage() {
  const forgotPasswordMutation = useForgotPassword();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await forgotPasswordMutation.mutateAsync({ email });
      setIsSuccess(true);
      toast.success('Email đã được gửi', 'Vui lòng kiểm tra hộp thư để đặt lại mật khẩu');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể gửi email đặt lại mật khẩu';
      setError(errorMessage);
      toast.error('Gửi email thất bại', errorMessage);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-sky-500/10 via-transparent to-sky-500/10 flex items-center justify-center px-4 py-10">
        <div className="relative w-full max-w-md">
          <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-sky-400/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl" />

          <div className="relative rounded-3xl border border-slate-800/40 bg-slate-900/60 backdrop-blur-xl shadow-[0_40px_80px_-20px_rgba(2,6,23,0.6)] p-6 sm:p-8">
            <div className="mb-6 sm:mb-8 text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold tracking-widest text-green-400">
                Thành công
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-white to-green-300 bg-clip-text text-transparent">
                  Email đã được gửi
                </span>
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu trong vài phút tới.
              </p>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-6 py-3 font-semibold text-slate-900 shadow-[0_18px_32px_-12px_rgba(56,189,248,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_40px_-10px_rgba(56,189,248,0.45)]"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                Quên mật khẩu
              </span>
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu.
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

            {error ? (
              <p className="m-0 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={forgotPasswordMutation.isPending}
              className="mt-1 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-4 py-3 font-semibold text-slate-900 shadow-[0_18px_32px_-12px_rgba(56,189,248,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_40px_-10px_rgba(56,189,248,0.45)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {forgotPasswordMutation.isPending ? 'Đang gửi...' : 'Gửi email đặt lại'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Nhớ mật khẩu?{' '}
            <Link to="/login" className="font-semibold text-sky-300 hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
