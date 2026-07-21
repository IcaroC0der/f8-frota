import React from 'react';
import { DollarSign, Droplets, Gauge, PieChart } from 'lucide-react';

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const formatNum = (v, dec = 2) => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '-';

const Sparkline = ({ color }) => (
  <svg viewBox="0 0 80 24" className="w-20 h-6 opacity-60">
    <polyline
      points="0,20 13,16 26,18 39,10 52,13 65,7 80,11"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function FuelSummaryCards({ records }) {
  const totalValue = records.reduce((s, r) => s + (r.total_value || 0), 0);
  const totalQty = records.reduce((s, r) => s + (r.quantity || 0), 0);
  const kms = records.map(r => r.km).filter(v => v > 0);
  const totalKm = kms.length > 0 ? Math.max(...kms) - Math.min(...kms) : 0;
  const avgConsumption = totalQty > 0 && totalKm > 0 ? totalKm / totalQty : 0;

  const cards = [
    {
      label: 'CUSTO TOTAL (PERÍODO)',
      value: formatCurrency(totalValue),
      sub: 'No período selecionado',
      icon: DollarSign,
      bg: 'from-blue-500 to-blue-600',
      spark: '#93c5fd',
      showSpark: true,
    },
    {
      label: 'LITROS ABASTECIDOS',
      value: `${formatNum(totalQty)} L`,
      sub: 'No período selecionado',
      icon: Droplets,
      bg: 'from-green-500 to-green-600',
      spark: '#86efac',
      showSpark: true,
    },
    {
      label: 'QUILOMETRAGEM',
      value: `${formatNum(totalKm, 0)} km`,
      sub: 'No período selecionado',
      icon: Gauge,
      bg: 'from-orange-500 to-orange-600',
      spark: '#fdba74',
      showSpark: true,
    },
    {
      label: 'MÉDIA DE CONSUMO',
      value: `${formatNum(avgConsumption)} km/L`,
      sub: 'No período selecionado',
      icon: PieChart,
      bg: 'from-purple-500 to-purple-600',
      spark: null,
      showSpark: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className={`bg-gradient-to-br ${c.bg} rounded-xl p-4 text-white shadow-lg`}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-90">{c.label}</p>
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold leading-tight mb-1">{c.value}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs opacity-80">{c.sub}</p>
              {c.showSpark && <Sparkline color={c.spark} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}