import { FormEvent, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from '../../hooks/api/useAuthApi';
import { useToast } from '../../contexts/ToastContext';
import { Mail, Lock, User, Check, X } from 'lucide-react';

export function RegisterPage() {
  const registerMutation = useRegister();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Yếu', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Trung bình', color: 'bg-amber-500' };
    return { score, label: 'Mạnh', color: 'bg-emerald-500' };
  }, [password]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await registerMutation.mutateAsync({ email, password, name: name || undefined });
      toast.success('Đăng ký thành công', 'Chào mừng bạn đến với Mimi!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Đăng ký thất bại';
      setError(errorMessage);
      toast.error('Đăng ký thất bại', errorMessage);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-sky-500/10" />
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-sky-400/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="relative rounded-3xl border border-white/10 bg-[var(--bg-surface)]/80 backdrop-blur-2xl shadow-[0_40px_80px_-20px_rgba(2,6,23,0.6)] overflow-hidden">
          {/* Gradient Border Effect */}
          <div className="absolute inset-0 rounded-3xl p-px bg-gradient-to-b from-purple-400/30 via-transparent to-sky-500/30 -z-10" />

          {/* Visual Header with Animated Icons */}
          <div className="relative bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-sky-500/10 px-6 pt-8 pb-6 border-b border-white/5">
            {/* Header Text */}
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                <span className="bg-gradient-to-r from-white via-purple-200 to-sky-400 bg-clip-text text-transparent">
                  Tạo tài khoản mới
                </span>
              </h1>
              <p className="text-sm text-[var(--text-muted)]">Bắt đầu theo dõi chi tiêu với Mimi</p>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-6 sm:p-8">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {/* Name Input */}
              <div className="relative group">
                <label
                  htmlFor="register-name"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Họ và tên <span className="text-slate-500">(tùy chọn)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    id="register-name"
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/60 pr-4 py-3.5 text-slate-100 placeholder:text-slate-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:bg-slate-900/80"
                    style={{ paddingLeft: '3.5rem' }}
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="relative group">
                <label
                  htmlFor="register-email"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="register-email"
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/60 pr-4 py-3.5 text-slate-100 placeholder:text-slate-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:bg-slate-900/80"
                    style={{ paddingLeft: '3.5rem' }}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="email@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="relative group">
                <label
                  htmlFor="register-password"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="register-password"
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/60 pr-4 py-3.5 text-slate-100 placeholder:text-slate-500 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:bg-slate-900/80"
                    style={{ paddingLeft: '3.5rem' }}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    required
                    minLength={8}
                  />
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2 space-y-1.5 animate__animated animate__fadeIn animate__faster">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            level <= passwordStrength.score
                              ? passwordStrength.color
                              : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p
                      className={`text-xs ${
                        passwordStrength.score <= 2
                          ? 'text-red-400'
                          : passwordStrength.score <= 3
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                      }`}
                    >
                      Độ mạnh: {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error ? (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 flex items-start gap-2 animate__animated animate__shakeX">
                  <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              ) : null}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-sky-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {registerMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang tạo tài khoản...
                  </div>
                ) : (
                  'Đăng ký'
                )}
              </button>
            </form>

            {/* Trust Badges */}
            <div className="mt-6 flex items-center justify-center gap-3 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Miễn phí</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Không cần thẻ</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bảo mật</span>
              </div>
            </div>

            {/* Login Link */}
            <p className="mt-6 text-center text-sm text-slate-400">
              Đã có tài khoản?{' '}
              <Link
                to="/login"
                className="font-semibold text-sky-400 hover:text-sky-300 transition-colors"
              >
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
