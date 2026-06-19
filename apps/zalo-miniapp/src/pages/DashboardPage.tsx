import { useState } from 'react';

import { Currency } from '../api/types';
import { useBudgetStatus, useOverview, useSummary } from '../hooks/api';
import { formatCurrency, formatDate } from '../utils/format';

type Tab = 'overview' | 'charts' | 'budgets' | 'recent';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Tổng' },
  { id: 'charts', label: 'Đồ thị' },
  { id: 'budgets', label: 'Ngân sách' },
  { id: 'recent', label: 'Lịch sử' },
];

export function DashboardPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [currency, setCurrency] = useState<Currency>('VND');
  const summary = useSummary('this_month', currency);
  const overview = useOverview(currency);
  const budgets = useBudgetStatus();
  const maxCategory = Math.max(...(summary.data?.byCategory.map((item) => item.amount) ?? [1]));

  return (
    <section className="mimi-screen">
      <header className="mimi-dashboard-head">
        <div><span className="mimi-kicker">This month</span><h1>Tổng quan</h1></div>
        <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}><option>VND</option><option>USD</option></select>
      </header>
      <div className="mimi-tabs">{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)} type="button">{item.label}</button>)}</div>
      {tab === 'overview' ? (
        <div className="mimi-grid">
          <div className="mimi-stat"><span>Chi tiêu</span><strong>{formatCurrency(summary.data?.totals.expense ?? 0, currency)}</strong></div>
          <div className="mimi-stat"><span>Thu nhập</span><strong>{formatCurrency(summary.data?.totals.income ?? 0, currency)}</strong></div>
          <div className="mimi-stat accent"><span>Ròng</span><strong>{formatCurrency(summary.data?.totals.net ?? 0, currency)}</strong></div>
          <div className="mimi-card"><b>{summary.data?.transactionCount ?? 0} giao dịch</b><p>{summary.data?.activeDays ?? 0} ngày hoạt động · TB {formatCurrency(summary.data?.avgExpensePerTransaction ?? 0, currency)}</p></div>
        </div>
      ) : null}
      {tab === 'charts' ? (
        <div className="mimi-card mimi-bars">
          {(summary.data?.byCategory.length ? summary.data.byCategory : [{ categoryId: 'empty', categoryName: 'Chưa có dữ liệu', amount: 0 }]).map((item) => (
            <div key={item.categoryId}><div><span>{item.categoryName}</span><small>{formatCurrency(item.amount, currency)}</small></div><i style={{ width: `${Math.max(8, (item.amount / maxCategory) * 100)}%` }} /></div>
          ))}
        </div>
      ) : null}
      {tab === 'budgets' ? (
        <div className="mimi-list">
          {budgets.isLoading ? <div className="mimi-muted">Đang tải ngân sách...</div> : null}
          {(budgets.data ?? []).map((item) => <article key={item.budget.id} className="mimi-card"><b>{item.budget.category?.name ?? 'Tất cả danh mục'}</b><p>{formatCurrency(item.spent, item.budget.currency)} / {formatCurrency(item.budget.limitAmount, item.budget.currency)}</p><div className="mimi-progress"><i style={{ width: `${Math.min(100, item.percentage)}%` }} /></div></article>)}
          {!budgets.isLoading && !budgets.data?.length ? <div className="mimi-card">Chưa có ngân sách. Tạo tại tab Nhập.</div> : null}
        </div>
      ) : null}
      {tab === 'recent' ? (
        <div className="mimi-list">
          {(overview.data?.recent ?? []).map((txn) => <article key={txn.id} className="mimi-row-card"><div><b>{txn.category?.name ?? txn.note ?? 'Giao dịch'}</b><small>{formatDate(txn.occurredAt)}</small></div><strong className={txn.type === 'INCOME' ? 'income' : 'expense'}>{txn.type === 'INCOME' ? '+' : '-'}{formatCurrency(txn.amount, txn.currency)}</strong></article>)}
          {!overview.isLoading && !overview.data?.recent.length ? <div className="mimi-card">Chưa có giao dịch gần đây.</div> : null}
        </div>
      ) : null}
    </section>
  );
}
