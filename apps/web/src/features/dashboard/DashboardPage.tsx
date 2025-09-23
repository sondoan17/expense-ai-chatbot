import { useMemo } from "react";
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

function useSummary() {
  return useQuery({
    queryKey: ["transactions-summary", "this_month"],
    queryFn: async () => {
      const { data } = await apiClient.get<SummaryResponse>("/transactions/summary", {
        params: { period: "this_month" },
      });
      return data;
    },
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
  });
}

function useBudgets() {
  return useQuery({
    queryKey: ["budgets-status"],
    queryFn: async () => {
      const { data: budgets } = await apiClient.get<BudgetStatusResponse["budget"][]>("/budgets");
      const statuses = await Promise.all(
        budgets.map(async (budget) => {
          const { data } = await apiClient.get<BudgetStatusResponse>(`/budgets/${budget.id}/status`);
          return data;
        }),
      );
      return statuses;
    },
  });
}

export function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useSummary();
  const { data: overview, isLoading: overviewLoading } = useOverview();
  const { data: budgets, isLoading: budgetsLoading } = useBudgets();

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
          label="Còn lại"
          value={summaryLoading || !summary ? "..." : formatCurrency(summary.totals.net)}
          accent="primary"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>Phân bổ chi tiêu theo danh mục</h2>
          <div className="chart-wrapper">
            {doughnutData ? (
              <Doughnut data={doughnutData} options={{ plugins: { legend: { position: "bottom" } } }} />
            ) : (
              "Chưa có dữ liệu"
            )}
          </div>
        </section>
        <section className="panel">
          <h2>Dòng tiền gần đây</h2>
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
              "Chưa có dữ liệu"
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>Ngân sách</h2>
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
                        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          Tháng {budget.budget.month}/{budget.budget.year}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span>{formatCurrency(budget.spent, budget.budget.currency)}</span>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
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
            <p>Chưa có ngân sách. Hãy tạo ngân sách mới qua trang lập kế hoạch.</p>
          )}
        </section>

        <section className="panel">
          <h2>Giao dịch gần đây</h2>
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
                    <span className="note">{txn.note ?? txn.category?.name ?? "Kh�ng r�"}</span>
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
