import { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Tabs,
  Tab,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh, TrendingUp, TrendingDown, Wallet, CalendarToday } from '@mui/icons-material';
import { useSummary, useOverview, useBudgetStatus } from '../../hooks/api/useDashboardApi';
// stat card used in child component
import { OverviewTab } from './components/OverviewTab';
import { ChartsTab } from './components/ChartsTab';
import { BudgetsTab } from './components/BudgetsTab';
import { RecentTab } from './components/RecentTab';
import { formatCurrency, formatDate } from '../../utils/format';
// currency type used in child components

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
    <Box sx={{ height: '100%', overflow: 'hidden' }}>
      <Container maxWidth={false} sx={{ height: '100%', py: 2 }}>
        <Stack spacing={3} sx={{ height: '100%' }}>
          {/* Header */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(148, 163, 184, 0.16)',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6))',
              backdropFilter: 'blur(20px)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 3, pb: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #38bdf8, #22d3ee)',
                      }}
                    >
                      <Wallet />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Bảng điều khiển
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Theo dõi tổng quan thu chi và ngân sách được cập nhật liên tục
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Tooltip title="Cập nhật dữ liệu">
                    <IconButton
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      sx={{
                        bgcolor: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        '&:hover': {
                          bgcolor: 'rgba(56, 189, 248, 0.2)',
                          transform: 'scale(1.05)',
                        },
                        '&:disabled': {
                          opacity: 0.6,
                        },
                      }}
                    >
                      <Refresh sx={{ color: 'primary.main' }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ px: 3, py: 2, borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '2px 2px 0 0',
                    background: 'linear-gradient(90deg, #38bdf8, #22d3ee)',
                  },
                }}
              >
                {[
                  { id: 'overview', label: 'Tổng quan', icon: <TrendingUp /> },
                  { id: 'charts', label: 'Biểu đồ', icon: <TrendingDown /> },
                  { id: 'budgets', label: 'Ngân sách', icon: <Wallet /> },
                  { id: 'recent', label: 'Lịch sử', icon: <CalendarToday /> },
                ].map((tab) => (
                  <Tab
                    key={tab.id}
                    label={tab.label}
                    value={tab.id}
                    icon={tab.icon}
                    iconPosition="start"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      minHeight: 'auto',
                      px: 3,
                      py: 1.5,
                      mr: 1,
                      color: 'text.secondary',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(56, 189, 248, 0.08)',
                        color: 'text.primary',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        color: 'primary.main',
                        fontWeight: 700,
                      },
                    }}
                  />
                ))}
              </Tabs>
            </Box>
          </Paper>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
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
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
