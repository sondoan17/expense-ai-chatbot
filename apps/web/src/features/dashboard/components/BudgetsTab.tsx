import { Currency } from "@expense-ai/shared";

interface BudgetItem {
  budget: { id: string; month: number; year: number; currency: Currency; category?: { name: string } | null; limitAmount: number };
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
  if (loading) return <p>Đang tải ngân sách...</p>;
  if (!budgets || budgets.length === 0) return <p>Chưa có ngân sách. Hãy tạo ngân sách mới trong trang Lập kế hoạch.</p>;

  return (
    <section className="grid gap-4 rounded-2xl border border-slate-700/40 bg-slate-900/60 p-5 backdrop-blur-xl">
      <div>
        <h2 className="m-0 text-lg font-semibold">Ngân sách</h2>
      </div>
      <div className="grid gap-3">
        {budgets.map((budget) => {
          const pct = Math.min(100, Math.round(budget.percentage));
          const overBudget = budget.overBudget;
          const remainingLabel = formatCurrency(budget.remaining, budget.budget.currency);
          const overspentLabel = formatCurrency(budget.overspent, budget.budget.currency);
          return (
            <div key={budget.budget.id} className="grid gap-2 rounded-xl border border-slate-700/40 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <strong>{budget.budget.category?.name ?? 'Tất cả danh mục'}</strong>
                  <div className="text-sm text-slate-400">Tháng {budget.budget.month}/{budget.budget.year}</div>
                </div>
                <div className="text-right">
                  <span>{formatCurrency(budget.spent, budget.budget.currency)}</span>
                  <div className="text-sm text-slate-400">/ {formatCurrency(budget.budget.limitAmount, budget.budget.currency)}</div>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-500/30">
                <div
                  className={`${overBudget ? 'bg-gradient-to-r from-orange-500 to-rose-500' : 'bg-gradient-to-r from-sky-400 to-cyan-500'} h-full transition-[width] duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {overBudget ? (
                <div className="text-sm font-semibold text-rose-300">Đã vượt {overspentLabel}</div>
              ) : (
                <div className="text-sm text-slate-400">Còn lại {remainingLabel}</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}


