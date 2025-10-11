import { useCallback, useMemo, useState } from 'react';
// charts rendered in child components
import { registerCharts } from './components/charts';
import { useSummary, useOverview, useBudgetStatus } from '../../hooks/api/useDashboardApi';
// stat card used in child component
import { OverviewTab } from './components/OverviewTab';
import { ChartsTab } from './components/ChartsTab';
import { BudgetsTab } from './components/BudgetsTab';
import { RecentTab } from './components/RecentTab';
import { formatCurrency, formatDate } from '../../utils/format';
// currency type used in child components

registerCharts();

export function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');

  const summaryQuery = useSummary(selectedPeriod);
  const overviewQuery = useOverview();
  const budgetsQuery = useBudgetStatus();

  const { data: summary, isLoading: summaryLoading } = summaryQuery;
  const { data: overview, isLoading: overviewLoading } = overviewQuery;
  const { data: budgets, isLoading: budgetsLoading } = budgetsQuery;

  const isRefreshing =
    summaryQuery.isFetching || overviewQuery.isFetching || budgetsQuery.isFetching;

  const handleRefresh = useCallback(() => {
    void Promise.all([summaryQuery.refetch(), overviewQuery.refetch(), budgetsQuery.refetch()]);
  }, [summaryQuery, overviewQuery, budgetsQuery]);

  const doughnutData = useMemo(() => {
    if (!summary || summary.byCategory.length === 0) return null;
    return {
      labels: summary.byCategory.map((item) => item.categoryName),
      datasets: [
        {
          label: 'Chi tiêu',
          data: summary.byCategory.map((item) => item.amount),
          backgroundColor: [
            '#38bdf8',
            '#22d3ee',
            '#a78bfa',
            '#f472b6',
            '#fbbf24',
            '#34d399',
            '#facc15',
            '#f97316',
          ],
        },
      ],
    };
  }, [summary]);

  const lineData = useMemo(() => {
    if (!overview) return null;
    const sorted = [...overview.recent].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
    );
    return {
      labels: sorted.map((txn) => formatDate(txn.occurredAt)),
      datasets: [
        {
          label: 'Chi tiêu',
          data: sorted.map((txn) => (txn.type === 'EXPENSE' ? txn.amount : null)),
          borderColor: '#38bdf8',
          tension: 0.35,
          spanGaps: true,
          fill: true,
          backgroundColor: 'rgba(56, 189, 248, 0.12)',
        },
        {
          label: 'Thu nhập',
          data: sorted.map((txn) => (txn.type === 'INCOME' ? txn.amount : null)),
          borderColor: '#34d399',
          tension: 0.35,
          spanGaps: true,
          fill: true,
          backgroundColor: 'rgba(52, 211, 153, 0.12)',
        },
      ],
    };
  }, [overview]);

  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'budgets' | 'recent'>(
    'overview',
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4"></div>

      <div className="flex flex-col gap-4 h-full overflow-y-auto">
        <header className="rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur-xl h-fit sticky top-0 z-10">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="m-0 text-xl font-semibold tracking-tight">Bảng điều khiển</h2>
              <p className="m-0 mt-1 text-sm text-slate-400">
                Theo dõi tổng quan thu chi và ngân sách được cập nhật liên tục.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 px-4 py-2 font-semibold text-slate-900 shadow-[0_12px_24px_-12px_rgba(56,189,248,0.45)] transition hover:-translate-y-0.5 disabled:opacity-60"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu'}
            </button>
          </div>
          <div className="flex gap-2 border-t border-slate-700/40 px-2 py-2">
            {[
              { id: 'overview', label: 'Tổng quan' },
              { id: 'charts', label: 'Biểu đồ' },
              { id: 'budgets', label: 'Ngân sách' },
              { id: 'recent', label: 'Lịch sử' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`${
                  activeTab === (tab.id as typeof activeTab)
                    ? 'bg-sky-400/20 text-sky-200'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/20'
                } rounded-xl px-3 py-1.5 text-sm font-semibold transition`}
                aria-pressed={activeTab === (tab.id as typeof activeTab)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>
        <div className="p-4">
          {activeTab === 'overview' && (
            <OverviewTab
              totals={summary ? summary.totals : null}
              loading={summaryLoading}
              formatCurrency={(n) => formatCurrency(n)}
              transactionCount={summary?.transactionCount}
              activeDays={summary?.activeDays}
              avgExpensePerTransaction={summary?.avgExpensePerTransaction}
              topCategory={summary?.topCategory}
              maxExpenseDay={summary?.maxExpenseDay}
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
            />
          )}

          {activeTab === 'charts' && (
            <ChartsTab
              doughnutData={doughnutData}
              lineData={lineData}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetsTab
              budgets={budgets}
              loading={budgetsLoading}
              formatCurrency={formatCurrency}
            />
          )}

          {activeTab === 'recent' && (
            <RecentTab
              loading={overviewLoading || !overview}
              items={overview?.recent}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          )}
        </div>
      </div>
    </div>
  );
}
