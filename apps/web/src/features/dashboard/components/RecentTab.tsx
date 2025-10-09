import { Currency } from '@expense-ai/shared';

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
  if (loading) return <p>Đang tải...</p>;
  if (!items || items.length === 0) return <p>Chưa có giao dịch nào.</p>;

  return (
    <section className="grid gap-4 rounded-2xl border border-slate-700/40 bg-slate-900/60 p-5 backdrop-blur-xl">
      <div>
        <h2 className="m-0 text-lg font-semibold">Giao dịch gần đây</h2>
      </div>
      <div className="grid gap-2">
        {items.map((txn) => (
          <div
            key={txn.id}
            className="flex items-center justify-between rounded-xl bg-slate-500/10 px-4 py-3"
          >
            <div>
              <span className="block">{formatDate(txn.occurredAt)}</span>
              <span className="block text-sm text-slate-400">
                {txn.note ?? txn.category?.name ?? 'Không rõ'}
              </span>
            </div>
            <span
              className={`${txn.type === 'EXPENSE' ? 'text-rose-300' : 'text-emerald-200'} font-semibold`}
            >
              {txn.type === 'EXPENSE' ? '-' : '+'}
              {formatCurrency(txn.amount, txn.currency)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
