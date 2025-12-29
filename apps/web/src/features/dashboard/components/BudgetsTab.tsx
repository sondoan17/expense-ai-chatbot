import { Currency } from '@expense-ai/shared';
import { Wallet, AlertTriangle, CheckCircle } from 'lucide-react';

interface BudgetItem {
  budget: {
    id: string;
    month: number;
    year: number;
    currency: Currency;
    category?: { name: string } | null;
    limitAmount: number;
  };
  percentage: number;
  spent: number;
  overBudget: boolean;
  remaining: number;
  overspent: number;
}

interface BudgetsTabProps {
  budgets: BudgetItem[] | undefined;
  loading: boolean;
  formatCurrency: (n: number, currency?: Currency) => string;
}

export function BudgetsTab({ budgets, loading, formatCurrency }: BudgetsTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <div className="w-5 h-5 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
          <span className="text-sm">Đang tải ngân sách...</span>
        </div>
      </div>
    );
  }

  if (!budgets || budgets.length === 0) {
    return (
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 sm:p-6 text-center">
        <Wallet className="w-10 h-10 mx-auto mb-3 text-sky-400 opacity-60" />
        <p className="text-sm text-[var(--text-muted)]">
          Chưa có ngân sách. Hãy tạo ngân sách mới bằng cách chat với Mimi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
          Ngân sách tháng này
        </h3>
        <span className="text-xs text-[var(--text-muted)]">{budgets.length} ngân sách</span>
      </div>

      <div className="space-y-3">
        {budgets.map((item) => {
          const pct = Math.min(100, Math.round(item.percentage));
          const isOverBudget = item.overBudget;
          const isWarning = pct >= 80 && !isOverBudget;

          return (
            <div
              key={item.budget.id}
              className={`rounded-xl sm:rounded-2xl border p-3 sm:p-4 transition-all ${isOverBudget
                  ? 'border-red-500/30 bg-red-500/5'
                  : isWarning
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-white/10 bg-[var(--bg-surface)]/60'
                }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">
                      {item.budget.category?.name ?? 'Tất cả danh mục'}
                    </span>
                    {isOverBudget && <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    {pct >= 100 && !isOverBudget && (
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    Tháng {item.budget.month}/{item.budget.year}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                    {formatCurrency(item.spent, item.budget.currency)}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    / {formatCurrency(item.budget.limitAmount, item.budget.currency)}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 sm:h-2.5 bg-white/10 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isOverBudget
                      ? 'bg-gradient-to-r from-orange-500 to-red-500'
                      : isWarning
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                        : 'bg-gradient-to-r from-sky-400 to-blue-500'
                    }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${isOverBudget ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-[var(--text-muted)]'
                    }`}
                >
                  {pct}%
                </span>
                <span
                  className={`text-xs ${isOverBudget ? 'text-red-400' : 'text-[var(--text-muted)]'
                    }`}
                >
                  {isOverBudget
                    ? `Vượt ${formatCurrency(item.overspent, item.budget.currency)}`
                    : `Còn ${formatCurrency(item.remaining, item.budget.currency)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
