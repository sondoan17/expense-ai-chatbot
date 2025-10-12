import { useMemo } from 'react';
import { Box, Paper, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { StatCard } from '../../../components/StatCard';

interface OverviewTabProps {
  totals: { expense: number; income: number; net: number } | null;
  loading: boolean;
  formatCurrency: (n: number, currency?: string) => string;
  // Server-side analytics
  transactionCount?: number | null;
  activeDays?: number | null;
  avgExpensePerTransaction?: number | null;
  topCategory?: { name: string; amount: number } | null;
  maxExpenseDay?: { date: string; amount: number } | null;
  // Time period selection
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

export function OverviewTab({
  totals,
  loading,
  formatCurrency,
  transactionCount = null,
  activeDays = null,
  avgExpensePerTransaction = null,
  topCategory = null,
  maxExpenseDay = null,
  selectedPeriod,
  onPeriodChange,
}: OverviewTabProps) {
  const metrics = useMemo(() => {
    if (!totals) {
      return {
        savingsRate: null as number | null,
        expenseIncomeRatio: null as number | null,
        avgExpensePerDay: null as number | null,
        projectedExpense: null as number | null,
      };
    }

    const income = totals.income;
    const expense = totals.expense;
    const net = totals.net;

    const savingsRate = income > 0 ? net / income : null;
    const expenseIncomeRatio = income > 0 ? expense / income : null;

    // Calculate avgExpensePerDay based on selected period
    let avgExpensePerDay = null as number | null;
    let projectedExpense = null as number | null;

    if (activeDays && activeDays > 0) {
      avgExpensePerDay = expense / activeDays;

      // Project expense based on period
      switch (selectedPeriod) {
        case 'today':
        case 'yesterday':
          // For single day, no projection needed
          projectedExpense = null;
          break;
        case 'this_week':
          // Project to 7 days
          projectedExpense = avgExpensePerDay * 7;
          break;
        case 'this_month':
          // Project to 30 days
          projectedExpense = avgExpensePerDay * 30;
          break;
        case 'last_month':
          // Project to 30 days
          projectedExpense = avgExpensePerDay * 30;
          break;
        case 'this_year':
          // Project to 365 days
          projectedExpense = avgExpensePerDay * 365;
          break;
        default:
          projectedExpense = null;
      }
    }

    return {
      savingsRate,
      expenseIncomeRatio,
      avgExpensePerDay,
      projectedExpense,
    };
  }, [totals, activeDays, selectedPeriod]);

  const periodOptions = [
    { value: 'today', label: 'Hôm nay' },
    { value: 'yesterday', label: 'Hôm qua' },
    { value: 'this_week', label: '7 ngày qua' },
    { value: 'this_month', label: '30 ngày qua' },
    { value: 'last_month', label: 'Tháng trước' },
    { value: 'this_year', label: 'Năm nay' },
  ];

  const getDynamicLabels = (period: string) => {
    const isWeeklyOrLonger = ['this_week', 'this_month', 'last_month', 'this_year'].includes(
      period,
    );

    return {
      transactionCount: 'Tổng số giao dịch',
      avgExpensePerTransaction: 'Chi tiêu trung bình mỗi lần',
      topCategory: 'Danh mục chi tiêu lớn nhất',
      showActiveDays: false, // Ẩn mặc định
      showMaxExpenseDay: isWeeklyOrLonger,
    };
  };

  const dynamicLabels = getDynamicLabels(selectedPeriod);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Period Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Khoảng thời gian</InputLabel>
          <Select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            label="Khoảng thời gian"
          >
            {periodOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Tổng quan */}
      <Paper elevation={0} sx={{ p: 3, backgroundColor: 'transparent' }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Tổng quan
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 2,
          }}
        >
          <StatCard
            label="Chi"
            value={loading || !totals ? '...' : formatCurrency(totals.expense)}
            accent="warning"
          />
          <StatCard
            label="Thu"
            value={loading || !totals ? '...' : formatCurrency(totals.income)}
            accent="success"
          />
          <StatCard
            label="Cân đối"
            value={loading || !totals ? '...' : formatCurrency(totals.net)}
            accent="primary"
          />
        </Box>
      </Paper>

      {/* Phân tích */}
      <Paper elevation={0} sx={{ p: 3, backgroundColor: 'transparent' }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Phân tích
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 2,
          }}
        >
          <StatCard
            label="Tỷ lệ tiết kiệm"
            value={
              loading || metrics.savingsRate === null
                ? '...'
                : `${Math.round(metrics.savingsRate * 100)}%`
            }
            accent={
              metrics.savingsRate !== null && metrics.savingsRate >= 0.2 ? 'success' : 'primary'
            }
          />
          <StatCard
            label="Tỷ lệ chi/thu"
            value={
              loading || metrics.expenseIncomeRatio === null
                ? '...'
                : `${Math.round(metrics.expenseIncomeRatio * 100)}%`
            }
            accent={
              metrics.expenseIncomeRatio !== null && metrics.expenseIncomeRatio > 0.8
                ? 'warning'
                : 'primary'
            }
          />
          <StatCard
            label={dynamicLabels.topCategory}
            value={
              loading
                ? '...'
                : topCategory
                  ? `${topCategory.name} · ${formatCurrency(topCategory.amount)}`
                  : '—'
            }
            accent="warning"
          />
        </Box>
      </Paper>

      {/* Chi tiết (ẩn trên màn hình nhỏ) */}
      <Paper elevation={0} sx={{ p: 3, backgroundColor: 'transparent' }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Chi tiết
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 2,
          }}
        >
          <StatCard
            label={dynamicLabels.transactionCount}
            value={loading ? '...' : transactionCount != null ? String(transactionCount) : '—'}
            accent="primary"
          />
          <StatCard
            label={dynamicLabels.avgExpensePerTransaction}
            value={
              loading || avgExpensePerTransaction === null
                ? '...'
                : formatCurrency(avgExpensePerTransaction)
            }
            accent="primary"
          />
          {dynamicLabels.showMaxExpenseDay && (
            <StatCard
              label="Ngày chi tiêu cao nhất"
              value={
                loading
                  ? '...'
                  : maxExpenseDay
                    ? `${new Date(maxExpenseDay.date).toLocaleDateString('vi-VN')} · ${formatCurrency(maxExpenseDay.amount)}`
                    : '—'
              }
              accent="warning"
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
}
