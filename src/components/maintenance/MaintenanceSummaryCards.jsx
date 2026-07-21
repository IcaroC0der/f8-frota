import React from 'react';
import { DollarSign, ShieldCheck, Wrench, BarChart3 } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function MaintenanceSummaryCards({ records }) {
  const total = records.reduce((s, r) => s + (r.total_value || 0), 0);
  const preventivas = records.filter(r => r.classification?.toUpperCase().includes('PREVENTIV'));
  const corretivas = records.filter(r => r.classification?.toUpperCase().includes('CORRETIV'));
  const totalPrev = preventivas.reduce((s, r) => s + (r.total_value || 0), 0);
  const totalCorr = corretivas.reduce((s, r) => s + (r.total_value || 0), 0);
  const pctPrev = total > 0 ? ((totalPrev / total) * 100).toFixed(1) : '0.0';
  const pctCorr = total > 0 ? ((totalCorr / total) * 100).toFixed(1) : '0.0';

  const cards = [
    {
      label: 'CUSTO TOTAL (PERÍODO)',
      value: fmt(total),
      sub: `${records.length} lançamentos no período`,
      icon: DollarSign,
      bg: 'from-blue-600 to-blue-700',
      iconBg: 'bg-blue-500/30',
    },
    {
      label: 'PREVENTIVAS',
      value: fmt(totalPrev),
      sub: `${pctPrev}% do total`,
      icon: ShieldCheck,
      bg: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-400/30',
    },
    {
      label: 'CORRETIVAS',
      value: fmt(totalCorr),
      sub: `${pctCorr}% do total`,
      icon: Wrench,
      bg: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-400/30',
    },
    {
      label: 'TOTAL DE LANÇAMENTOS',
      value: records.length.toString(),
      sub: 'No período selecionado',
      icon: BarChart3,
      bg: 'from-violet-500 to-violet-600',
      iconBg: 'bg-violet-400/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className={`rounded-2xl bg-gradient-to-br ${c.bg} p-5 text-white shadow-lg`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">{c.label}</p>
              <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold leading-tight">{c.value}</p>
            <p className="text-xs mt-1 opacity-75">{c.sub}</p>
          </div>
        );
      })}
    </div>
  );
}