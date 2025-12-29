import { Currency } from '@expense-ai/shared';
import { TrendingDown, TrendingUp, Receipt } from 'lucide-react';

interface TxnItem {
  id: string;
  occurredAt: string;
  note?: string | null;
  category?: { name: string } | null;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  currency: Currency;
}

interface RecentTabProps {
  loading: boolean;
  items: TxnItem[] | undefined;
  formatDate: (iso: string) => string;
  formatCurrency: (n: number, currency?: Currency) => string;
}

export function RecentTab({ loading, items, formatDate, formatCurrency }: RecentTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <div className="w-5 h-5 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
          <span className="text-sm">Đang tải giao dịch...</span>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[var(--bg-surface)]/40 p-6 text-center">
        <Receipt className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
        <p className="text-sm text-[var(--text-muted)]">Chưa có giao dịch nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
          Giao dịch gần đây
        </h3>
        <span className="text-xs text-[var(--text-muted)]">{items.length} giao dịch</span>
      </div>

      <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-[var(--bg-surface)]/60 overflow-hidden">
        {items.map((txn, index) => {
          const isExpense = txn.type === 'EXPENSE';

          return (
            <div
              key={txn.id}
              className={`flex items-center gap-3 p-3 sm:p-4 transition-colors hover:bg-white/5 ${index !== items.length - 1 ? 'border-b border-white/5' : ''
                }`}
            >
              {/* Icon */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${isExpense
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20'
                    : 'bg-gradient-to-br from-emerald-500/20 to-green-500/20'
                  }`}
              >
                {isExpense ? (
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {txn.note || txn.category?.name || 'Không rõ'}
                  </span>
                  {txn.category?.name && txn.note && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-[var(--text-muted)] hidden sm:inline">
                      {txn.category.name}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[var(--text-muted)]">{formatDate(txn.occurredAt)}</span>
              </div>

              {/* Amount */}
              <div className="flex-shrink-0 text-right">
                <span
                  className={`text-sm sm:text-base font-bold ${isExpense ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                >
                  {isExpense ? '-' : '+'}
                  {formatCurrency(txn.amount, txn.currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
