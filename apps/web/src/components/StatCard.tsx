import { Card, CardContent, Typography } from '@mui/material';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  accent?: 'primary' | 'success' | 'warning';
}

export function StatCard({ label, value, trend, accent = 'primary' }: StatCardProps) {
  const getGradientBackground = () => {
    switch (accent) {
      case 'warning':
        return 'linear-gradient(135deg, rgba(250, 204, 21, 0.2), rgba(245, 158, 11, 0.1))';
      case 'success':
        return 'linear-gradient(135deg, rgba(52, 211, 153, 0.2), rgba(34, 197, 94, 0.1))';
      default:
        return 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.1))';
    }
  };

  return (
    <Card
      sx={{
        backgroundImage: getGradientBackground(),
        borderRadius: 1.5,
        border: '1px solid rgba(148, 163, 184, 0.16)',
        backdropFilter: 'blur(12px)',
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'text.secondary',
            display: 'block',
            mb: 1,
          }}
        >
          {label}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            fontSize: '1.5rem',
            lineHeight: 1.2,
            mb: trend ? 1 : 0,
          }}
        >
          {value}
        </Typography>
        {trend && (
          <Typography variant="body2" color="text.secondary">
            {trend}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
