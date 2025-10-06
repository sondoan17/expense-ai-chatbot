import { useMemo } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
);

interface ChartDataset {
  label: string;
  data: (number | null)[] | { x: string | number; y: number }[];
  borderColor?: string;
  backgroundColor?: string;
  pointBackgroundColor?: string;
  tension?: number;
  spanGaps?: boolean;
  fill?: boolean;
}

interface ChartsTabProps {
  doughnutData: { labels: string[]; datasets: { data: number[] }[] } | null;
  lineData: {
    labels?: string[];
    datasets: ChartDataset[];
  } | null;
  formatCurrency: (n: number) => string;
  heightClassName?: string;
  topN?: number;
}

export function ChartsTab({
  doughnutData,
  lineData,
  formatCurrency,
  heightClassName = 'h-64',
  topN = 6,
}: ChartsTabProps) {
  // ===== Helpers =====
  const palette = useMemo(
    () => [
      '#38bdf8',
      '#34d399',
      '#a78bfa',
      '#f472b6',
      '#f59e0b',
      '#60a5fa',
      '#22d3ee',
      '#fb7185',
      '#84cc16',
      '#e879f9',
    ],
    [],
  );

  const buildDoughnut = useMemo(() => {
    if (!doughnutData) return null;
    const labels = doughnutData.labels ?? [];
    const raw = doughnutData.datasets?.[0]?.data ?? [];
    const pairs = labels.map((l, i) => ({ label: l, value: raw[i] ?? 0 }));
    const sorted = pairs.sort((a, b) => b.value - a.value);

    const top = sorted.slice(0, topN);
    const rest = sorted.slice(topN);
    const otherTotal = rest.reduce((s, x) => s + x.value, 0);
    const finalPairs = otherTotal > 0 ? [...top, { label: 'Khác', value: otherTotal }] : top;

    const sum = finalPairs.reduce((s, x) => s + x.value, 0) || 1;
    const backgroundColor = finalPairs.map((_, i) => palette[i % palette.length]);

    return {
      data: {
        labels: finalPairs.map((x) => x.label),
        datasets: [
          {
            data: finalPairs.map((x) => x.value),
            backgroundColor,
            borderWidth: 0,
          },
        ],
      },
      sum,
    };
  }, [doughnutData, palette, topN]);

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: { color: '#cbd5e1', font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx: { raw: unknown; label: string }) => {
              const val = Number(ctx.raw || 0);
              const pct = buildDoughnut ? Math.round((val / buildDoughnut.sum) * 100) : 0;
              return ` ${ctx.label}: ${formatCurrency(val)} (${pct}%)`;
            },
          },
        },
      },
    }),
    [buildDoughnut, formatCurrency],
  );

  const lineOptions = useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest' as const, intersect: false },
        scales: {
          // Nếu theo thời gian, dùng "time", còn theo nhãn rời thì "category"
          x: {
            type:
              lineData?.datasets?.[0]?.data?.[0] &&
              typeof lineData.datasets[0].data[0] === 'object' &&
              'x' in lineData.datasets[0].data[0]
                ? ('time' as const)
                : ('category' as const),
            ticks: { color: '#94a3b8', font: { size: 11 } },
            grid: { color: 'rgba(148,163,184,0.08)' },
            // time: { unit: "day" } // bật if cần ép đơn vị
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: (v: number) => formatCurrency(v),
            },
            grid: { color: 'rgba(148,163,184,0.08)' },
          },
        },
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: { color: '#cbd5e1', font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx: {
                parsed?: { y: number };
                raw?: unknown;
                dataset: { label?: string };
              }) => {
                const v = Number(
                  ctx.parsed?.y ??
                    (typeof ctx.raw === 'object' && ctx.raw && 'y' in ctx.raw
                      ? (ctx.raw as { y: number }).y
                      : 0),
                );
                return ` ${ctx.dataset.label || 'Unknown'}: ${formatCurrency(v)}`;
              },
            },
          },
        },
        elements: {
          point: { radius: 2, hoverRadius: 5 },
          line: { tension: 0.3, borderWidth: 2, fill: false },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    [formatCurrency, lineData],
  );

  // Gán màu mặc định nếu dataset chưa có
  const normalizedLineData = useMemo(() => {
    if (!lineData) return null;
    return {
      ...lineData,
      datasets: lineData.datasets.map((ds, i) => ({
        borderColor: ds.borderColor ?? palette[i % palette.length],
        backgroundColor: ds.backgroundColor ?? palette[i % palette.length] + '33',
        pointBackgroundColor: ds.pointBackgroundColor ?? palette[i % palette.length],
        ...ds,
      })),
    };
  }, [lineData, palette]);

  return (
    <div className="space-y-6">
      {/* Pie/Doughnut */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-200">
          Phân bổ chi tiêu theo danh mục
        </h3>
        <div className="rounded-2xl border border-slate-700/40 bg-slate-900/60 p-6 backdrop-blur-xl">
          <div className={`relative ${heightClassName} w-full`}>
            {buildDoughnut ? (
              <Doughnut data={buildDoughnut.data} options={doughnutOptions} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-slate-400">Chưa có dữ liệu chi tiêu</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Line */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-200">Dòng tiền gần đây</h3>
        <div className="rounded-2xl border border-slate-700/40 bg-slate-900/60 p-6 backdrop-blur-xl">
          <div className={`relative ${heightClassName} w-full`}>
            {normalizedLineData ? (
              <Line data={normalizedLineData} options={lineOptions} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-slate-400">Chưa có dữ liệu giao dịch</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
