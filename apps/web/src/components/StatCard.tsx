import './stats.css';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  accent?: 'primary' | 'success' | 'warning';
}

export function StatCard({ label, value, trend, accent = 'primary' }: StatCardProps) {
  return (
    <div className={`stat-card stat-${accent}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {trend ? <span className="stat-trend">{trend}</span> : null}
    </div>
  );
}
