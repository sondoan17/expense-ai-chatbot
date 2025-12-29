import { useMemo } from 'react';
import { PieChart, BarChart3 } from 'lucide-react';

interface ChartsTabProps {
  doughnutData: { labels: string[]; datasets: { data: number[] }[] } | null;
  lineData: {
    labels?: string[];
    datasets: {
      label: string;
      data: (number | null)[];
      borderColor?: string;
      backgroundColor?: string;
    }[];
  } | null;
  formatCurrency?: (n: number) => string;
  topN?: number;
}

const palette = [
  '#38bdf8', // sky
  '#34d399', // emerald
  '#a78bfa', // violet
  '#f472b6', // pink
  '#fbbf24', // amber
  '#60a5fa', // blue
  '#22d3ee', // cyan
  '#fb7185', // rose
];

export function ChartsTab({ doughnutData, formatCurrency, topN = 6 }: ChartsTabProps) {
  const pieData = useMemo(() => {
    if (!doughnutData) return [];
    const labels = doughnutData.labels ?? [];
    const raw = doughnutData.datasets?.[0]?.data ?? [];
    const pairs = labels.map((l, i) => ({ label: l, value: raw[i] ?? 0 }));
    const sorted = pairs.sort((a, b) => b.value - a.value);

    const top = sorted.slice(0, topN);
    const rest = sorted.slice(topN);
    const otherTotal = rest.reduce((s, x) => s + x.value, 0);
    return otherTotal > 0 ? [...top, { label: 'Khác', value: otherTotal }] : top;
  }, [doughnutData, topN]);

  const total = useMemo(() => pieData.reduce((s, x) => s + x.value, 0), [pieData]);
  const maxValue = useMemo(() => Math.max(...pieData.map((x) => x.value), 1), [pieData]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Category Breakdown */}
      <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-[var(--bg-surface)]/60 backdrop-blur-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
            <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
              Chi tiêu theo danh mục
            </h3>
            <p className="text-xs text-[var(--text-muted)]">Phân bổ chi tiêu của bạn</p>
          </div>
        </div>

        {pieData.length > 0 ? (
          <div className="space-y-3">
            {pieData.map((item, index) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0;
              const barWidth = (item.value / maxValue) * 100;

              return (
                <div key={item.label} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: palette[index % palette.length] }}
                      />
                      <span className="text-xs sm:text-sm text-[var(--text-primary)] truncate">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                        {formatCurrency ? formatCurrency(item.value) : item.value.toLocaleString()}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] w-10 text-right">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 sm:h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out group-hover:opacity-80"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: palette[index % palette.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
            <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu chi tiêu</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {pieData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/10 bg-[var(--bg-surface)]/40 p-3 sm:p-4 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">Tổng chi</p>
            <p className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              {formatCurrency ? formatCurrency(total) : total.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[var(--bg-surface)]/40 p-3 sm:p-4 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">Danh mục</p>
            <p className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              {pieData.length}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[var(--bg-surface)]/40 p-3 sm:p-4 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">Lớn nhất</p>
            <p className="text-sm sm:text-base font-bold text-sky-400 truncate">
              {pieData[0]?.label || '—'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[var(--bg-surface)]/40 p-3 sm:p-4 text-center">
            <p className="text-xs text-[var(--text-muted)] mb-1">TB/danh mục</p>
            <p className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              {formatCurrency
                ? formatCurrency(total / pieData.length)
                : (total / pieData.length).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
