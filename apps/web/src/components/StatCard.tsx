import './stats.css';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  accent?: 'primary' | 'success' | 'warning';
}

export function StatCard({ label, value, trend, accent = 'primary' }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-700/40 p-5 backdrop-blur-xl ${
        accent === 'warning'
          ? 'bg-gradient-to-br from-yellow-400/20 to-amber-500/10'
          : accent === 'success'
          ? 'bg-gradient-to-br from-emerald-400/20 to-green-500/10'
          : 'bg-gradient-to-br from-sky-400/20 to-indigo-500/10'
      }`}
    >
      <p className="m-0 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="m-0 mt-2 text-2xl font-bold">{value}</p>
      {trend ? <span className="text-sm text-slate-400">{trend}</span> : null}
    </div>
  );
}
