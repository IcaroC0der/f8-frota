import React from 'react';
import { motion } from 'framer-motion';
import { Fuel, Wrench, DollarSign } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(v);
const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

export default function DashboardRecentActivity({ fuelRecords, maintenanceRecords, operationalRecords }) {
  const all = [
    ...fuelRecords.map(r => ({ ...r, _type: 'fuel', _label: r.cost_type || 'Abastecimento', _icon: Fuel, _color: 'text-amber-500', _bg: 'bg-amber-50' })),
    ...maintenanceRecords.map(r => ({ ...r, _type: 'maint', _label: r.cost_type || 'Manutenção', _icon: Wrench, _color: 'text-rose-500', _bg: 'bg-rose-50' })),
    ...operationalRecords.map(r => ({ ...r, _type: 'op', _label: r.cost_name || 'Operacional', _icon: DollarSign, _color: 'text-emerald-500', _bg: 'bg-emerald-50' })),
  ]
    .filter(r => r.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6"
    >
      <div className="mb-5">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Atividade Recente</h3>
        <p className="text-xs text-slate-400 mt-0.5">Últimos lançamentos consolidados</p>
      </div>

      {all.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Nenhum lançamento encontrado</div>
      ) : (
        <div className="space-y-2">
          {all.map((r, i) => {
            const Icon = r._icon;
            return (
              <motion.div
                key={r.id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.04 }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg ${r._bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${r._color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{r._label}</p>
                  <p className="text-xs text-slate-400">{r.plate && r.plate !== '00000' ? r.plate : r.supplier || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-slate-800">{fmt(r.total_value)}</p>
                  <p className="text-xs text-slate-400">{fmtDate(r.date)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}