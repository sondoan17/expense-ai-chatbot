import { Link } from 'react-router-dom';
import {
  Sparkles,
  MessageSquare,
  Zap,
  Shield,
  ArrowRight,
  Check,
  Camera,
  Brain,
  BarChart3,
} from 'lucide-react';
import { LandingNavbar } from './LandingNavbar';
import { AnimatedSection } from './AnimatedSection';
import { ChatPreview } from './ChatPreview';
import { TypeWriter } from './TypeWriter';

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-sky-500/20 via-blue-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Quản lý chi tiêu{' '}
                <span className="bg-gradient-to-r from-sky-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                  thông minh
                </span>{' '}
                với AI
              </h1>

              <p className="text-lg md:text-xl text-[var(--text-muted)] mb-8 max-w-xl mx-auto lg:mx-0">
                <TypeWriter
                  text="Chỉ cần chat hoặc chụp hóa đơn, Mimi sẽ tự động ghi nhận và phân tích chi tiêu của bạn. Đơn giản như nhắn tin với bạn bè."
                  speed={20}
                  delay={3000}
                />
              </p>

              <AnimatedSection animation="bounceInDown" delay={100}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link
                    to="/register"
                    className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-sky-400 to-blue-600 text-white rounded-2xl font-semibold text-lg hover:shadow-xl hover:shadow-sky-500/25 transition-all cursor-pointer"
                  >
                    Bắt đầu miễn phí
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--bg-surface)] border border-white/10 text-[var(--text-primary)] rounded-2xl font-semibold text-lg hover:border-sky-500/50 transition-all cursor-pointer"
                  >
                    Đăng nhập
                  </Link>
                </div>
              </AnimatedSection>

              {/* Trust Badges */}
              <AnimatedSection animation="bounceInLeft" delay={300}>
                <div className="mt-10 flex items-center gap-6 justify-center lg:justify-start text-[var(--text-muted)] text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Miễn phí dùng thử</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Không cần thẻ tín dụng</span>
                  </div>
                </div>
              </AnimatedSection>
            </div>

            {/* Right - Chat Preview */}
            <div className="relative">
              <ChatPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tính năng{' '}
              <span className="bg-gradient-to-r from-sky-400 to-purple-500 bg-clip-text text-transparent">
                nổi bật
              </span>
            </h2>
            <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
              Mimi giúp bạn quản lý tài chính cá nhân dễ dàng hơn bao giờ hết với công nghệ AI tiên
              tiến
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                title: 'Chat tự nhiên',
                description:
                  'Nhập chi tiêu bằng ngôn ngữ tự nhiên. Chỉ cần nói "Ăn phở 50k" là xong.',
                color: 'sky',
              },
              {
                icon: Camera,
                title: 'Scan hóa đơn',
                description: 'Chụp hóa đơn, Mimi tự động nhận diện và ghi nhận chi tiêu.',
                color: 'purple',
              },
              {
                icon: Brain,
                title: 'AI thông minh',
                description: 'Tự động phân loại danh mục, phát hiện chi tiêu bất thường.',
                color: 'blue',
              },
              {
                icon: BarChart3,
                title: 'Phân tích chi tiết',
                description: 'Dashboard trực quan với biểu đồ, báo cáo chi tiêu theo thời gian.',
                color: 'emerald',
              },
              {
                icon: Zap,
                title: 'Nhanh chóng',
                description: 'Ghi nhận chi tiêu chỉ trong vài giây. Không cần mở app phức tạp.',
                color: 'amber',
              },
              {
                icon: Shield,
                title: 'Bảo mật',
                description: 'Dữ liệu được mã hóa và bảo vệ. Chỉ bạn mới có thể truy cập.',
                color: 'rose',
              },
            ].map((feature, index) => (
              <AnimatedSection key={index} delay={index * 100} animation="zoomIn">
                <div className="group p-6 rounded-2xl bg-[var(--bg-surface)]/50 border border-white/5 hover:border-sky-500/30 hover:bg-[var(--bg-surface)]/80 transition-all cursor-pointer h-full">
                  <div
                    className={`w-12 h-12 rounded-xl bg-${feature.color}-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-[var(--text-muted)]">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 bg-[var(--bg-secondary)]/50">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Cách{' '}
              <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
                hoạt động
              </span>
            </h2>
            <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
              Chỉ 3 bước đơn giản để bắt đầu quản lý chi tiêu thông minh
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Đăng ký miễn phí',
                description: 'Tạo tài khoản trong 30 giây. Không cần thẻ tín dụng.',
              },
              {
                step: '02',
                title: 'Chat với Mimi',
                description: 'Nhập chi tiêu bằng tin nhắn hoặc chụp hóa đơn.',
              },
              {
                step: '03',
                title: 'Xem báo cáo',
                description: 'Theo dõi chi tiêu qua dashboard trực quan.',
              },
            ].map((item, index) => (
              <AnimatedSection key={index} delay={index * 150} animation="slideInRight">
                <div className="relative">
                  <div className="text-7xl font-bold text-sky-500/10 absolute -top-4 -left-2">
                    {item.step}
                  </div>
                  <div className="relative pt-8 pl-4">
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-[var(--text-muted)]">{item.description}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Bảng{' '}
              <span className="bg-gradient-to-r from-sky-400 to-purple-500 bg-clip-text text-transparent">
                giá
              </span>
            </h2>
            <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
              Bắt đầu miễn phí, nâng cấp khi cần
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <AnimatedSection delay={100} animation="zoomIn">
              <div className="p-8 rounded-3xl bg-[var(--bg-surface)]/50 border border-white/10 flex flex-col h-full">
                <h3 className="text-2xl font-bold mb-2">Miễn phí</h3>
                <div className="text-4xl font-bold mb-6">
                  0đ<span className="text-lg text-[var(--text-muted)]">/tháng</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    '100 giao dịch/tháng',
                    'Chat AI cơ bản',
                    'Dashboard chi tiêu',
                    'Xuất báo cáo PDF',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="block w-full py-3 text-center bg-[var(--bg-elevated)] border border-white/10 rounded-xl font-semibold hover:border-sky-500/50 transition-all cursor-pointer mt-auto"
                >
                  Bắt đầu miễn phí
                </Link>
              </div>
            </AnimatedSection>

            {/* Pro Plan */}
            <AnimatedSection delay={200} animation="zoomIn">
              <div className="p-8 rounded-3xl bg-gradient-to-b from-sky-500/10 to-purple-500/10 border border-sky-500/30 relative flex flex-col h-full">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-sky-400 to-purple-500 text-white text-sm font-medium rounded-full">
                  Phổ biến nhất
                </div>
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="text-4xl font-bold mb-6">
                  99k<span className="text-lg text-[var(--text-muted)]">/tháng</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    'Không giới hạn giao dịch',
                    'AI thông minh nâng cao',
                    'Scan hóa đơn tự động',
                    'Phân tích xu hướng',
                    'Hỗ trợ ưu tiên',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-sky-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="block w-full py-3 text-center bg-gradient-to-r from-sky-400 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-sky-500/25 transition-all cursor-pointer mt-auto"
                >
                  Nâng cấp Pro
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <AnimatedSection animation="zoomIn">
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-blue-600 p-12 text-center">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full blur-3xl" />
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Bắt đầu quản lý chi tiêu thông minh ngay hôm nay
                </h2>
                <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                  Tham gia cùng hàng nghìn người dùng đang tiết kiệm thời gian và tiền bạc với Mimi
                </p>
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-white rounded-2xl font-semibold text-lg hover:shadow-xl transition-all cursor-pointer"
                >
                  <span className="bg-gradient-to-r from-sky-500 to-blue-700 bg-clip-text text-transparent">
                    Bắt đầu miễn phí
                  </span>
                  <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold">Mimi</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
              <button
                type="button"
                className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Điều khoản
              </button>
              <button
                type="button"
                className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Bảo mật
              </button>
              <button
                type="button"
                className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Liên hệ
              </button>
            </div>

            {/* Copyright */}
            <div className="text-sm text-[var(--text-muted)]">
              © 2024 Mimi. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
