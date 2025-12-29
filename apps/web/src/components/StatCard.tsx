import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  accent?: 'primary' | 'success' | 'warning' | 'info';
  compact?: boolean;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  accent = 'primary',
  compact = false,
}: StatCardProps) {
  const accentColors = {
    primary: {
      bg: 'from-sky-500/20 to-blue-500/10',
      border: 'border-sky-500/30',
      iconBg: 'from-sky-400 to-blue-600',
      text: 'text-sky-400',
    },
    success: {
      bg: 'from-emerald-500/20 to-green-500/10',
      border: 'border-emerald-500/30',
      iconBg: 'from-emerald-400 to-green-600',
      text: 'text-emerald-400',
    },
    warning: {
      bg: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-500/30',
      iconBg: 'from-amber-400 to-orange-600',
      text: 'text-amber-400',
    },
    info: {
      bg: 'from-purple-500/20 to-violet-500/10',
      border: 'border-purple-500/30',
      iconBg: 'from-purple-400 to-violet-600',
      text: 'text-purple-400',
    },
  };

  const colors = accentColors[accent];

  return (
    <div
      className={`relative overflow-hidden rounded-xl sm:rounded-2xl border ${colors.border} bg-gradient-to-br ${colors.bg} backdrop-blur-sm p-3 sm:p-4 transition-all duration-200 hover:border-opacity-50 cursor-default`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide truncate mb-1">
            {label}
          </p>
          <p
            className={`text-lg sm:text-xl md:text-2xl font-bold text-[var(--text-primary)] truncate ${compact ? '' : 'mb-1'}`}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[var(--text-muted)] truncate">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div
            className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${colors.iconBg} flex items-center justify-center text-white shadow-lg`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
