import { useCallback, useMemo, useState } from 'react';
import { RefreshCw, Wallet, TrendingUp, BarChart3, PiggyBank, History } from 'lucide-react';
import { useSummary, useOverview, useBudgetStatus } from '../../hooks/api/useDashboardApi';
import { OverviewTab } from './components/OverviewTab';
import { ChartsTab } from './components/ChartsTab';
import { BudgetsTab } from './components/BudgetsTab';
import { RecentTab } from './components/RecentTab';
import { formatCurrency, formatDate } from '../../utils/format';

const tabs = [
  { id: 'overview', label: 'Tổng quan', shortLabel: 'Tổng', icon: TrendingUp },
  { id: 'charts', label: 'Biểu đồ', shortLabel: 'Đồ thị', icon: BarChart3 },
  { id: 'budgets', label: 'Ngân sách', shortLabel: 'NS', icon: PiggyBank },
  { id: 'recent', label: 'Lịch sử', shortLabel: 'LS', icon: History },
] as const;

type TabId = (typeof tabs)[number]['id'];

export function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [activeTab, setActiveTab] = useState<TabId>('overview');

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

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="h-full flex flex-col gap-4 sm:gap-6">
          {/* Header */}
          <header className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[var(--bg-surface)]/80 backdrop-blur-xl overflow-hidden sticky top-0 z-10">
            {/* Title Bar */}
            <div className="p-3 sm:p-4 lg:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {/* Avatar - hidden on mobile */}
                  <div className="hidden sm:flex w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 items-center justify-center shadow-lg shadow-sky-500/20">
                    <Wallet className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--text-primary)]">
                      Tổng quan
                    </h1>
                    <p className="hidden sm:block text-xs lg:text-sm text-[var(--text-muted)]">
                      Theo dõi thu chi và ngân sách
                    </p>
                  </div>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center hover:bg-sky-500/20 hover:border-sky-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RefreshCw
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-2 sm:px-3 lg:px-4 pb-2 sm:pb-3 border-t border-white/5">
              <nav className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide pt-2 sm:pt-3">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-xl
                        text-xs sm:text-sm font-semibold whitespace-nowrap
                        transition-all duration-200 cursor-pointer
                        ${isActive
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-transparent'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {/* Full label on lg+, short label on sm-md, icon only on xs */}
                      <span className="hidden lg:inline">{tab.label}</span>
                      <span className="hidden sm:inline lg:hidden">{tab.shortLabel}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto pb-4">
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
              <ChartsTab doughnutData={doughnutData} lineData={lineData} />
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
          </main>
        </div>
      </div>
    </div>
  );
}
