import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Sparkles } from 'lucide-react';

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <nav
      className={`fixed top-4 left-4 right-4 z-50 transition-all duration-300 rounded-2xl ${
        isScrolled
          ? 'bg-[var(--bg-surface)]/80 backdrop-blur-xl shadow-lg shadow-black/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25 group-hover:shadow-sky-500/40 transition-shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
              Mimi
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Tính năng
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cách hoạt động
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Bảng giá
            </button>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 bg-gradient-to-r from-sky-400 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-sky-500/25 transition-all cursor-pointer"
            >
              Bắt đầu ngay
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4">
            <div className="flex flex-col gap-4">
              <button
                onClick={() => scrollToSection('features')}
                className="text-left text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Tính năng
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-left text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Cách hoạt động
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-left text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Bảng giá
              </button>
              <hr className="border-white/10" />
              <Link
                to="/login"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 bg-gradient-to-r from-sky-400 to-blue-600 text-white rounded-xl font-medium text-center cursor-pointer"
              >
                Bắt đầu ngay
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
