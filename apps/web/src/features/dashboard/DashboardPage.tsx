import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Doughnut, Line } from "react-chartjs-2";
import { registerCharts } from "./components/charts";
import { apiClient } from "../../api/client";
import {
  BudgetStatusResponse,
  OverviewResponse,
  SummaryResponse,
} from "../../api/types";
import { StatCard } from "../../components/StatCard";
import "../../components/stats.css";
import "./components/dashboard.css";
import { formatCurrency, formatDate } from "../../utils/format";
import { Currency } from "@expense-ai/shared";

registerCharts();

const REFRESH_OPTIONS = {
  staleTime: 0,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: "always" as const,
};

function useSummary() {
  return useQuery({
    queryKey: ["transactions-summary", "this_month"],
    queryFn: async () => {
      const { data } = await apiClient.get<SummaryResponse>("/transactions/summary", {
        params: { period: "this_month" },
      });
      return data;
    },
    ...REFRESH_OPTIONS,
  });
}

function useOverview() {
  return useQuery({
    queryKey: ["reports-overview", "this_month"],
    queryFn: async () => {
      const { data } = await apiClient.get<OverviewResponse>("/reports/overview", {
        params: { period: "this_month", recent: 10 },
      });
      return data;
    },
    ...REFRESH_OPTIONS,
  });
}

function useBudgets() {
  return useQuery({
    queryKey: ["budgets-status"],
    queryFn: async () => {
      const { data: budgets } = await apiClient.get<BudgetStatusResponse["budget"][]>("/budgets");
      if (!budgets.length) {
        return [] as BudgetStatusResponse[];
      }
      const statuses = await Promise.all(
        budgets.map(async (budget) => {
          const { data } = await apiClient.get<BudgetStatusResponse>(`/budgets/${budget.id}/status`);
          return data;
        }),
      );
      return statuses;
    },
    ...REFRESH_OPTIONS,
  });
}

export function DashboardPage() {
  const summaryQuery = useSummary();
  const overviewQuery = useOverview();
  const budgetsQuery = useBudgets();

  const { data: summary, isLoading: summaryLoading } = summaryQuery;
  const { data: overview, isLoading: overviewLoading } = overviewQuery;
  const { data: budgets, isLoading: budgetsLoading } = budgetsQuery;

  const isRefreshing =
    summaryQuery.isFetching || overviewQuery.isFetching || budgetsQuery.isFetching;

  const handleRefresh = useCallback(() => {
    void Promise.all([
      summaryQuery.refetch(),
      overviewQuery.refetch(),
      budgetsQuery.refetch(),
    ]);
  }, [summaryQuery, overviewQuery, budgetsQuery]);

  const doughnutData = useMemo(() => {
    if (!summary || summary.byCategory.length === 0) return null;
    return {
      labels: summary.byCategory.map((item) => item.categoryName),
      datasets: [
        {
          label: "Chi tiêu",
          data: summary.byCategory.map((item) => item.amount),
          backgroundColor: [
            "#38bdf8",
            "#22d3ee",
            "#a78bfa",
            "#f472b6",
            "#fbbf24",
            "#34d399",
            "#facc15",
            "#f97316",
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
          label: "Chi tiêu",
          data: sorted.map((txn) => (txn.type === "EXPENSE" ? txn.amount : null)),
          borderColor: "#38bdf8",
          tension: 0.35,
          spanGaps: true,
          fill: true,
          backgroundColor: "rgba(56, 189, 248, 0.12)",
        },
        {
          label: "Thu nhập",
          data: sorted.map((txn) => (txn.type === "INCOME" ? txn.amount : null)),
          borderColor: "#34d399",
          tension: 0.35,
          spanGaps: true,
          fill: true,
          backgroundColor: "rgba(52, 211, 153, 0.12)",
        },
      ],
    };
  }, [overview]);

  return (
    <div className="dashboard-section">
      <header className="dashboard-header">
        <div>
          <h1>Bảng điều khiển</h1>
          <p>Theo dõi tổng quan thu chi và ngân sách được cập nhật liên tục.</p>
        </div>
        <button
          type="button"
          className="refresh-button"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Đang làm mới..." : "Làm mới dữ liệu"}
        </button>
      </header>

      <div className="stat-grid">
        <StatCard
          label="Tổng chi tháng này"
          value={summaryLoading || !summary ? "..." : formatCurrency(summary.totals.expense)}
          accent="warning"
        />
        <StatCard
          label="Tổng thu tháng này"
          value={summaryLoading || !summary ? "..." : formatCurrency(summary.totals.income)}
          accent="success"
        />
        <StatCard
          label="Cân đối"
          value={summaryLoading || !summary ? "..." : formatCurrency(summary.totals.net)}
          accent="primary"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Phân bổ chi tiêu theo danh mục</h2>
          </div>
          <div className="chart-wrapper">
            {doughnutData ? (
              <Doughnut data={doughnutData} options={{ plugins: { legend: { position: "bottom" } } }} />
            ) : (
              <p className="empty-state">Chưa có dữ liệu.</p>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>Dòng tiền gần đây</h2>
          </div>
          <div className="chart-wrapper">
            {lineData ? (
              <Line
                data={lineData}
                options={{
                  plugins: { legend: { position: "bottom" } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            ) : (
              <p className="empty-state">Chưa có dữ liệu.</p>
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Ngân sách</h2>
          </div>
          {budgetsLoading ? (
            <p>Đang tải ngân sách...</p>
          ) : budgets && budgets.length > 0 ? (
            <div className="budget-list">
              {budgets.map((budget) => {
                const pct = Math.min(100, Math.round(budget.percentage));
                return (
                  <div key={budget.budget.id} className="budget-card">
                    <div className="budget-header">
                      <div>
                        <strong>{budget.budget.category?.name ?? "Tất cả danh mục"}</strong>
                        <div className="budget-subtitle">
                          Tháng {budget.budget.month}/{budget.budget.year}
                        </div>
                      </div>
                      <div className="budget-amounts">
                        <span>{formatCurrency(budget.spent, budget.budget.currency)}</span>
                        <div className="budget-subtitle">
                          / {formatCurrency(budget.budget.limitAmount, budget.budget.currency)}
                        </div>
                      </div>
                    </div>
                    <div className="budget-progress-track">
                      <div className="budget-progress-bar" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>Chưa có ngân sách. Hãy tạo ngân sách mới trong trang Lập kế hoạch.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Giao dịch gần đây</h2>
          </div>
          {overviewLoading || !overview ? (
            <p>Đang tải...</p>
          ) : overview.recent.length === 0 ? (
            <p>Chưa có giao dịch nào.</p>
          ) : (
            <div className="recent-list">
              {overview.recent.map((txn) => (
                <div key={txn.id} className="recent-item">
                  <div>
                    <span>{formatDate(txn.occurredAt)}</span>
                    <span className="note">{txn.note ?? txn.category?.name ?? "Không rõ"}</span>
                  </div>
                  <span className={`recent-amount ${txn.type === "EXPENSE" ? "expense" : "income"}`}>
                    {txn.type === "EXPENSE" ? "-" : "+"}
                    {formatCurrency(txn.amount, txn.currency as Currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
