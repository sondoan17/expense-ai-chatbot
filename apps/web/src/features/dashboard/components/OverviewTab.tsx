import { useMemo } from 'react';
import { StatCard } from '../../../components/StatCard';

interface OverviewTabProps {
  totals: { expense: number; income: number; net: number } | null;
  loading: boolean;
  formatCurrency: (n: number, currency?: string) => string;
  // Server-side analytics
  transactionCount?: number | null;
  activeDays?: number | null;
  avgExpensePerTransaction?: number | null;
  topCategory?: { name: string; amount: number } | null;
  maxExpenseDay?: { date: string; amount: number } | null;
  // Time period selection
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

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

    // Calculate avgExpensePerDay based on selected period
    let avgExpensePerDay = null as number | null;
    let projectedExpense = null as number | null;

    if (activeDays && activeDays > 0) {
      avgExpensePerDay = expense / activeDays;

      // Project expense based on period
      switch (selectedPeriod) {
        case 'today':
        case 'yesterday':
          // For single day, no projection needed
          projectedExpense = null;
          break;
        case 'this_week':
          // Project to 7 days
          projectedExpense = avgExpensePerDay * 7;
          break;
        case 'this_month':
          // Project to 30 days
          projectedExpense = avgExpensePerDay * 30;
          break;
        case 'last_month':
          // Project to 30 days
          projectedExpense = avgExpensePerDay * 30;
          break;
        case 'this_year':
          // Project to 365 days
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

  const periodOptions = [
    { value: 'today', label: 'Hôm nay' },
    { value: 'yesterday', label: 'Hôm qua' },
    { value: 'this_week', label: '7 ngày qua' },
    { value: 'this_month', label: '30 ngày qua' },
    { value: 'last_month', label: 'Tháng trước' },
    { value: 'this_year', label: 'Năm nay' },
  ];

  const getDynamicLabels = (period: string) => {
    const isWeeklyOrLonger = ['this_week', 'this_month', 'last_month', 'this_year'].includes(
      period,
    );

    return {
      transactionCount: 'Tổng số giao dịch',
      avgExpensePerTransaction: 'Chi tiêu trung bình mỗi lần',
      topCategory: 'Danh mục chi tiêu lớn nhất',
      showActiveDays: false, // Ẩn mặc định
      showMaxExpenseDay: isWeeklyOrLonger,
    };
  };

  const dynamicLabels = getDynamicLabels(selectedPeriod);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <section>
        <div className="flex items-center justify-end mb-4">
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-slate-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Tổng quan */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-200">Tổng quan</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <StatCard
            label="Chi"
            value={loading || !totals ? '...' : formatCurrency(totals.expense)}
            accent="warning"
          />
          <StatCard
            label="Thu"
            value={loading || !totals ? '...' : formatCurrency(totals.income)}
            accent="success"
          />
          <StatCard
            label="Cân đối"
            value={loading || !totals ? '...' : formatCurrency(totals.net)}
            accent="primary"
          />
        </div>
      </section>

      {/* Phân tích */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-200">Phân tích</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <StatCard
            label="Tỷ lệ tiết kiệm"
            value={
              loading || metrics.savingsRate === null
                ? '...'
                : `${Math.round(metrics.savingsRate * 100)}%`
            }
            accent={
              metrics.savingsRate !== null && metrics.savingsRate >= 0.2 ? 'success' : 'primary'
            }
          />
          <StatCard
            label="Tỷ lệ chi/thu"
            value={
              loading || metrics.expenseIncomeRatio === null
                ? '...'
                : `${Math.round(metrics.expenseIncomeRatio * 100)}%`
            }
            accent={
              metrics.expenseIncomeRatio !== null && metrics.expenseIncomeRatio > 0.8
                ? 'warning'
                : 'primary'
            }
          />
          <StatCard
            label={dynamicLabels.topCategory}
            value={
              loading
                ? '...'
                : topCategory
                  ? `${topCategory.name} · ${formatCurrency(topCategory.amount)}`
                  : '—'
            }
            accent="warning"
          />
        </div>
      </section>

      {/* Chi tiết (ẩn trên màn hình nhỏ) */}
      <section className="hidden md:block">
        <h3 className="mb-4 text-lg font-semibold text-slate-200">Chi tiết</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <StatCard
            label={dynamicLabels.transactionCount}
            value={loading ? '...' : transactionCount != null ? String(transactionCount) : '—'}
            accent="primary"
          />
          <StatCard
            label={dynamicLabels.avgExpensePerTransaction}
            value={
              loading || avgExpensePerTransaction === null
                ? '...'
                : formatCurrency(avgExpensePerTransaction)
            }
            accent="primary"
          />
          {dynamicLabels.showMaxExpenseDay && (
            <StatCard
              label="Ngày chi tiêu cao nhất"
              value={
                loading
                  ? '...'
                  : maxExpenseDay
                    ? `${new Date(maxExpenseDay.date).toLocaleDateString('vi-VN')} · ${formatCurrency(maxExpenseDay.amount)}`
                    : '—'
              }
              accent="warning"
            />
          )}
        </div>
      </section>
    </div>
  );
}
