import { useMemo } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Wallet, Receipt, Calendar, Target } from 'lucide-react';

interface OverviewTabProps {
  totals: { expense: number; income: number; net: number } | null;
  loading: boolean;
  formatCurrency: (n: number, currency?: string) => string;
  transactionCount?: number | null;
  activeDays?: number | null;
  avgExpensePerTransaction?: number | null;
  topCategory?: { name: string; amount: number } | null;
  maxExpenseDay?: { date: string; amount: number } | null;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

const periodOptions = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: 'this_week', label: '7 ngày qua' },
  { value: 'this_month', label: '30 ngày qua' },
  { value: 'last_month', label: 'Tháng trước' },
  { value: 'this_year', label: 'Năm nay' },
];

export function OverviewTab({
  totals,
  loading,
  formatCurrency,
  transactionCount = null,
  activeDays = null,
  avgExpensePerTransaction = null,
  topCategory = null,
  maxExpenseDay = null,
  selectedPeriod,
  onPeriodChange,
}: OverviewTabProps) {
  const metrics = useMemo(() => {
    if (!totals) {
      return {
        savingsRate: null as number | null,
        expenseIncomeRatio: null as number | null,
        avgExpensePerDay: null as number | null,
        projectedExpense: null as number | null,
      };
    }

    const income = totals.income;
    const expense = totals.expense;
    const net = totals.net;

    const savingsRate = income > 0 ? net / income : null;
    const expenseIncomeRatio = income > 0 ? expense / income : null;

    let avgExpensePerDay = null as number | null;
    let projectedExpense = null as number | null;

    if (activeDays && activeDays > 0) {
      avgExpensePerDay = expense / activeDays;

      switch (selectedPeriod) {
        case 'today':
        case 'yesterday':
          projectedExpense = null;
          break;
        case 'this_week':
          projectedExpense = avgExpensePerDay * 7;
          break;
        case 'this_month':
        case 'last_month':
          projectedExpense = avgExpensePerDay * 30;
          break;
        case 'this_year':
          projectedExpense = avgExpensePerDay * 365;
          break;
        default:
          projectedExpense = null;
      }
    }

    return {
      savingsRate,
      expenseIncomeRatio,
      avgExpensePerDay,
      projectedExpense,
    };
  }, [totals, activeDays, selectedPeriod]);

  const showMaxExpenseDay = ['this_week', 'this_month', 'last_month', 'this_year'].includes(
    selectedPeriod,
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end">
        <div className="relative">
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="appearance-none bg-[var(--bg-surface)]/60 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-[var(--text-primary)] font-medium cursor-pointer hover:border-sky-500/30 focus:outline-none focus:border-sky-500/50 transition-colors"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-800">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
        </div>
      </div>

      {/* Tổng quan - Main Stats */}
      <section className="rounded-xl sm:rounded-2xl border border-white/10 bg-[var(--bg-surface)]/60 backdrop-blur-sm p-4 sm:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] mb-4">
          Tổng quan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Chi tiêu */}
          <div className="group rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-4 hover:border-amber-500/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-xs sm:text-sm text-[var(--text-muted)]">Chi tiêu</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-400">
              {loading || !totals ? '...' : formatCurrency(totals.expense)}
            </p>
          </div>

          {/* Thu nhập */}
          <div className="group rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/5 to-green-500/5 p-4 hover:border-emerald-500/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-xs sm:text-sm text-[var(--text-muted)]">Thu nhập</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400">
              {loading || !totals ? '...' : formatCurrency(totals.income)}
            </p>
          </div>

          {/* Cân đối */}
          <div className="group rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/5 to-blue-500/5 p-4 hover:border-sky-500/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-sky-400" />
              </div>
              <span className="text-xs sm:text-sm text-[var(--text-muted)]">Cân đối</span>
            </div>
            <p
              className={`text-xl sm:text-2xl font-bold ${totals && totals.net >= 0 ? 'text-sky-400' : 'text-red-400'
                }`}
            >
              {loading || !totals ? '...' : formatCurrency(totals.net)}
            </p>
          </div>
        </div>
      </section>

      {/* Phân tích */}
      <section className="rounded-xl sm:rounded-2xl border border-white/10 bg-[var(--bg-surface)]/60 backdrop-blur-sm p-4 sm:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] mb-4">
          Phân tích
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Tỷ lệ tiết kiệm */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20 transition-all cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Tỷ lệ tiết kiệm</span>
            </div>
            <p
              className={`text-lg sm:text-xl font-bold ${metrics.savingsRate !== null && metrics.savingsRate >= 0.2
                  ? 'text-emerald-400'
                  : 'text-[var(--text-primary)]'
                }`}
            >
              {loading || metrics.savingsRate === null
                ? '...'
                : `${Math.round(metrics.savingsRate * 100)}%`}
            </p>
          </div>

          {/* Tỷ lệ chi/thu */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20 transition-all cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Tỷ lệ chi/thu</span>
            </div>
            <p
              className={`text-lg sm:text-xl font-bold ${metrics.expenseIncomeRatio !== null && metrics.expenseIncomeRatio > 0.8
                  ? 'text-amber-400'
                  : 'text-[var(--text-primary)]'
                }`}
            >
              {loading || metrics.expenseIncomeRatio === null
                ? '...'
                : `${Math.round(metrics.expenseIncomeRatio * 100)}%`}
            </p>
          </div>

          {/* Danh mục lớn nhất */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20 transition-all cursor-pointer sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Danh mục chi tiêu lớn nhất</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-amber-400 truncate">
              {loading
                ? '...'
                : topCategory
                  ? `${topCategory.name} · ${formatCurrency(topCategory.amount)}`
                  : '—'}
            </p>
          </div>
        </div>
      </section>

      {/* Chi tiết */}
      <section className="rounded-xl sm:rounded-2xl border border-white/10 bg-[var(--bg-surface)]/60 backdrop-blur-sm p-4 sm:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] mb-4">
          Chi tiết
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Tổng số giao dịch */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 hover:border-white/20 transition-all cursor-pointer">
            <span className="text-xs text-[var(--text-muted)] block mb-1">Tổng giao dịch</span>
            <p className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              {loading ? '...' : transactionCount != null ? String(transactionCount) : '—'}
            </p>
          </div>

          {/* Chi tiêu TB */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 hover:border-white/20 transition-all cursor-pointer">
            <span className="text-xs text-[var(--text-muted)] block mb-1">Chi tiêu TB/lần</span>
            <p className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              {loading || avgExpensePerTransaction === null
                ? '...'
                : formatCurrency(avgExpensePerTransaction)}
            </p>
          </div>

          {/* Ngày chi tiêu cao nhất */}
          {showMaxExpenseDay && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 hover:border-white/20 transition-all cursor-pointer col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">Ngày chi tiêu cao nhất</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-amber-400 truncate">
                {loading
                  ? '...'
                  : maxExpenseDay
                    ? `${new Date(maxExpenseDay.date).toLocaleDateString('vi-VN')} · ${formatCurrency(maxExpenseDay.amount)}`
                    : '—'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
