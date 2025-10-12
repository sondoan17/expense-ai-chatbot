import { useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';

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
  topN?: number;
}

export function ChartsTab({
  doughnutData,
  lineData,
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

  const pieData = useMemo(() => {
    if (!doughnutData) return [];
    const labels = doughnutData.labels ?? [];
    const raw = doughnutData.datasets?.[0]?.data ?? [];
    const pairs = labels.map((l, i) => ({ label: l, value: raw[i] ?? 0 }));
    const sorted = pairs.sort((a, b) => b.value - a.value);

    const top = sorted.slice(0, topN);
    const rest = sorted.slice(topN);
    const otherTotal = rest.reduce((s, x) => s + x.value, 0);
    const finalPairs = otherTotal > 0 ? [...top, { label: 'Khác', value: otherTotal }] : top;

    return finalPairs.map((item, index) => ({
      id: index,
      value: item.value,
      label: item.label,
      color: palette[index % palette.length],
    }));
  }, [doughnutData, palette, topN]);

  const lineChartData = useMemo(() => {
    if (!lineData || !lineData.labels) return [];

    return lineData.datasets.map((dataset, index) => ({
      id: dataset.label,
      label: dataset.label,
      data: dataset.data.map((value) => value || 0),
      color: dataset.borderColor || palette[index % palette.length],
    }));
  }, [lineData, palette]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Pie Chart */}
      <Paper elevation={0} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Phân bổ chi tiêu theo danh mục
        </Typography>
        <Box sx={{ height: 400, width: '100%' }}>
          {pieData.length > 0 ? (
            <PieChart
              series={[
                {
                  data: pieData,
                  highlightScope: { fade: 'global', highlight: 'item' },
                },
              ]}
              width={400}
              height={400}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography color="text.secondary">Chưa có dữ liệu chi tiêu</Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Line Chart */}
      <Paper elevation={0} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Dòng tiền gần đây
        </Typography>
        <Box sx={{ height: 400, width: '100%' }}>
          {lineChartData.length > 0 && lineData?.labels ? (
            <LineChart
              xAxis={[
                {
                  data: lineData.labels,
                  scaleType: 'point',
                },
              ]}
              series={lineChartData}
              width={400}
              height={400}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography color="text.secondary">Chưa có dữ liệu giao dịch</Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
