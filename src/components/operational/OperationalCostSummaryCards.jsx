import React from 'react';
import { DollarSign, TrendingUp, Hash, Car } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function OperationalCostSummaryCards({ records }) {
  const total = records.reduce((s, r) => s + (r.total_value || 0), 0);
  const count = records.length;
  const uniqueVehicles = new Set(records.filter((r) => r.plate).map((r) => r.plate)).size;
  const uniqueCosts = new Set(records.map((r) => r.cost_name).filter(Boolean)).size;

  const cards = [
    { label: 'Total Geral', value: fmt(total), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Lançamentos', value: count, icon: Hash, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Veículos', value: uniqueVehicles || '-', icon: Car, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { label: 'Tipos de Custo', value: uniqueCosts, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border ${c.border} ${c.bg} p-4 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center`}>
            <c.icon className={`w-5 h-5 ${c.color}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{c.label}</p>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}