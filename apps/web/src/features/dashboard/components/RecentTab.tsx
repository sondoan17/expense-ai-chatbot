import { Currency } from '@expense-ai/shared';
import { Box, Typography, List, ListItem, ListItemText, Chip, Stack } from '@mui/material';

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
  if (loading) return <Typography>Đang tải...</Typography>;
  if (!items || items.length === 0) return <Typography>Chưa có giao dịch nào.</Typography>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        Giao dịch gần đây
      </Typography>
      <List sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 0 }}>
        {items.map((txn) => (
          <ListItem
            key={txn.id}
            sx={{
              borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
              '&:last-child': { borderBottom: 'none' },
            }}
          >
            <ListItemText
              primary={
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatDate(txn.occurredAt)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {txn.note ?? txn.category?.name ?? 'Không rõ'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={txn.type === 'EXPENSE' ? 'Chi tiêu' : 'Thu nhập'}
                      size="small"
                      color={txn.type === 'EXPENSE' ? 'error' : 'success'}
                      variant="outlined"
                    />
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        color: txn.type === 'EXPENSE' ? 'error.main' : 'success.main',
                      }}
                    >
                      {txn.type === 'EXPENSE' ? '-' : '+'}
                      {formatCurrency(txn.amount, txn.currency)}
                    </Typography>
                  </Stack>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
