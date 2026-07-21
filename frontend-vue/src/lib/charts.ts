// Registro central do Chart.js (importar uma vez antes de usar os componentes).
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  BarController,
  LineController,
  DoughnutController,
  PieController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  ArcElement, BarElement, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Title, Tooltip, Legend,
  // Controllers explícitos — necessários p/ gráfico misto barra+linha.
  BarController, LineController, DoughnutController, PieController,
);

// Defaults legíveis em light e dark (Ink neutro) + fonte do sistema.
ChartJS.defaults.font.family = "Inter, ui-sans-serif, system-ui, sans-serif";
ChartJS.defaults.color = "#737373";
// Sem animação de canvas: a entrada suave fica por conta do fade CSS dos cards,
// e evita loop de render que trava a captura/consumo de CPU.
ChartJS.defaults.animation = false as any;
ChartJS.defaults.resizeDelay = 120;
ChartJS.defaults.borderColor = "rgba(115, 115, 115, 0.15)";
ChartJS.defaults.plugins.tooltip.backgroundColor = "rgba(10, 10, 10, 0.95)";
ChartJS.defaults.plugins.tooltip.padding = 10;
ChartJS.defaults.plugins.tooltip.cornerRadius = 8;

// Paleta do Design System F8 — Brand #FFD500 + Ink + semânticas.
export const palette = {
  primary: "#FFD500",     // Brand 500
  primaryDark: "#E6C000", // Brand 600
  accent: "#171717",      // Ink 900
  success: "#22c55e",
  warning: "#f59e0b",
  destructive: "#ef4444",
  muted: "#a3a3a3",
  slate: "#525252",       // Ink 600
};

// Módulos: Abastecimento (âmbar) · Manutenção (vermelho) · Operacional (verde)
export const moduleColors = [palette.warning, palette.destructive, palette.success];

// Séries multicoloridas (barras por grupo etc.)
export const seriesColors = [
  palette.primary, palette.warning, palette.destructive,
  palette.success, palette.muted, palette.slate,
];

export const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: { usePointStyle: true, boxWidth: 8, padding: 16 },
    },
  },
};

/** Formata eixo Y monetário compacto: 1500 → "R$ 2k". */
export const brlTick = (v: number | string) => {
  const n = Number(v);
  return `R$ ${n >= 1000 ? `${Math.round(n / 1000)}k` : n}`;
};
