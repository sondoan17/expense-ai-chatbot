import { Currency } from '@expense-ai/shared';
import { Box, Card, CardContent, Typography, LinearProgress, Alert, Stack } from '@mui/material';

interface BudgetItem {
  budget: {
    id: string;
    month: number;
    year: number;
    currency: Currency;
    category?: { name: string } | null;
    limitAmount: number;
  };
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
  if (loading) return <Typography>Đang tải ngân sách...</Typography>;
  if (!budgets || budgets.length === 0)
    return (
      <Alert severity="info">
        Chưa có ngân sách. Hãy tạo ngân sách mới trong trang Lập kế hoạch.
      </Alert>
    );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        Ngân sách
      </Typography>
      <Stack spacing={2}>
        {budgets.map((budget) => {
          const pct = Math.min(100, Math.round(budget.percentage));
          const overBudget = budget.overBudget;
          const remainingLabel = formatCurrency(budget.remaining, budget.budget.currency);
          const overspentLabel = formatCurrency(budget.overspent, budget.budget.currency);

          return (
            <Card
              key={budget.budget.id}
              elevation={0}
              sx={{
                borderRadius: 2,
                border: '1px solid rgba(148, 163, 184, 0.16)',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {budget.budget.category?.name ?? 'Tất cả danh mục'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tháng {budget.budget.month}/{budget.budget.year}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {formatCurrency(budget.spent, budget.budget.currency)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      / {formatCurrency(budget.budget.limitAmount, budget.budget.currency)}
                    </Typography>
                  </Box>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(148, 163, 184, 0.18)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: overBudget
                        ? 'linear-gradient(135deg, #f97316, #ef4444)'
                        : 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                    },
                  }}
                />

                {overBudget ? (
                  <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                    Đã vượt {overspentLabel}
                  </Alert>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Còn lại {remainingLabel}
                  </Typography>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
