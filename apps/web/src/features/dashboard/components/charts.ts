import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  Title,
} from 'chart.js';

export function registerCharts() {
  if (ChartJS.registry.plugins.get('legend')) {
    // Already registered
    return;
  }

  ChartJS.register(
    ArcElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Title,
    Filler,
  );
}
