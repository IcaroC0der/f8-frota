import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, BarChart2, Fuel, Wrench, Settings2 } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtCompact = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

function KPI({ icon: Icon, color, bgColor, label, value, sub, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${bgColor}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{label}</p>
        <p className="text-lg font-extrabold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function RelatorioKPIs({ filtered, allRecords }) {
  const stats = useMemo(() => {
    const total = filtered.reduce((s, r) => s + (r.total_value || 0), 0);
    const totalAll = allRecords.reduce((s, r) => s + (r.total_value || 0), 0);
    const fuel = filtered.filter(r => r._type === 'Abastecimento').reduce((s, r) => s + (r.total_value || 0), 0);
    const maint = filtered.filter(r => r._type === 'Manutenção').reduce((s, r) => s + (r.total_value || 0), 0);
    const op = filtered.filter(r => r._type === 'Operacional').reduce((s, r) => s + (r.total_value || 0), 0);
    const count = filtered.length;

    // Monthly average
    const months = new Set(filtered.map(r => r.date?.slice(0, 7)).filter(Boolean));
    const avgMonthly = months.size > 0 ? total / months.size : 0;

    // Largest single expense
    const maxRecord = filtered.reduce((max, r) => (r.total_value || 0) > (max?.total_value || 0) ? r : max, null);

    // pct of total
    const pctOfTotal = totalAll > 0 ? ((total / totalAll) * 100).toFixed(1) : '100';

    return { total, fuel, maint, op, count, avgMonthly, maxRecord, pctOfTotal };
  }, [filtered, allRecords]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPI icon={DollarSign} bgColor="bg-blue-50" color="text-blue-600" label="Custo Total" value={fmtCompact(stats.total)} sub={`${stats.pctOfTotal}% do total geral`} delay={0} />
      <KPI icon={TrendingUp} bgColor="bg-violet-50" color="text-violet-600" label="Média Mensal" value={fmtCompact(stats.avgMonthly)} sub={`${new Set(filtered.map(r => r.date?.slice(0, 7)).filter(Boolean)).size} meses`} delay={0.05} />
      <KPI icon={BarChart2} bgColor="bg-slate-50" color="text-slate-600" label="Total Registros" value={stats.count.toLocaleString('pt-BR')} sub="lançamentos" delay={0.1} />
      <KPI icon={Fuel} bgColor="bg-amber-50" color="text-amber-600" label="Abastecimento" value={fmtCompact(stats.fuel)} sub={`${stats.total > 0 ? ((stats.fuel / stats.total) * 100).toFixed(1) : 0}% do total`} delay={0.15} />
      <KPI icon={Wrench} bgColor="bg-red-50" color="text-red-600" label="Manutenção" value={fmtCompact(stats.maint)} sub={`${stats.total > 0 ? ((stats.maint / stats.total) * 100).toFixed(1) : 0}% do total`} delay={0.2} />
      <KPI icon={Settings2} bgColor="bg-emerald-50" color="text-emerald-600" label="Operacional" value={fmtCompact(stats.op)} sub={`${stats.total > 0 ? ((stats.op / stats.total) * 100).toFixed(1) : 0}% do total`} delay={0.25} />
    </div>
  );
}