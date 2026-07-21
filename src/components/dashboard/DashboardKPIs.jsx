import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, BarChart2, Fuel, Wrench, Settings2 } from 'lucide-react';

const fmtCompact = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

function KPI({ icon: Icon, bgColor, color, label, value, sub, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex items-center gap-4"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${bgColor}`}>
        <Icon className={`w-7 h-7 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">{label}</p>
        <p className="text-xl font-extrabold text-slate-900 leading-tight truncate">{value}</p>
        {sub && <p className="text-sm text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function DashboardKPIs({ fuelRecords, maintenanceRecords, operationalRecords }) {
  const stats = useMemo(() => {
    const fuel = fuelRecords.reduce((s, r) => s + (r.total_value || 0), 0);
    const maint = maintenanceRecords.reduce((s, r) => s + (r.total_value || 0), 0);
    const op = operationalRecords.reduce((s, r) => s + (r.total_value || 0), 0);
    const total = fuel + maint + op;
    const count = fuelRecords.length + maintenanceRecords.length + operationalRecords.length;

    const allDates = [
      ...fuelRecords.map(r => r.date?.slice(0, 7)),
      ...maintenanceRecords.map(r => r.date?.slice(0, 7)),
      ...operationalRecords.map(r => r.date?.slice(0, 7)),
    ].filter(Boolean);
    const months = new Set(allDates).size;
    const avgMonthly = months > 0 ? total / months : 0;

    return { total, fuel, maint, op, count, avgMonthly, months };
  }, [fuelRecords, maintenanceRecords, operationalRecords]);

  const pct = (v) => stats.total > 0 ? `${((v / stats.total) * 100).toFixed(1)}% do total` : '—';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <KPI icon={DollarSign} bgColor="bg-blue-50" color="text-blue-600" label="Custo Total" value={fmtCompact(stats.total)} sub="100,0% do total geral" delay={0} />
      <KPI icon={TrendingUp} bgColor="bg-violet-50" color="text-violet-600" label="Média Mensal" value={fmtCompact(stats.avgMonthly)} sub={`${stats.months} meses`} delay={0.05} />
      <KPI icon={BarChart2} bgColor="bg-slate-50" color="text-slate-600" label="Total Registros" value={stats.count.toLocaleString('pt-BR')} sub="lançamentos" delay={0.1} />
      <KPI icon={Fuel} bgColor="bg-amber-50" color="text-amber-500" label="Abastecimento" value={fmtCompact(stats.fuel)} sub={pct(stats.fuel)} delay={0.15} />
      <KPI icon={Wrench} bgColor="bg-red-50" color="text-red-500" label="Manutenção" value={fmtCompact(stats.maint)} sub={pct(stats.maint)} delay={0.2} />
      <KPI icon={Settings2} bgColor="bg-emerald-50" color="text-emerald-600" label="Operacional" value={fmtCompact(stats.op)} sub={pct(stats.op)} delay={0.25} />
    </div>
  );
}