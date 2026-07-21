import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Maximize2, X } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl">
      <p className="text-slate-300 text-xs font-semibold mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardCostEvolution({ fuelRecords, maintenanceRecords, operationalRecords }) {
  const [period, setPeriod] = useState('mensal');
  const [expanded, setExpanded] = useState(false);

  const buildData = () => {
    const all = [
      ...fuelRecords.map(r => ({ date: r.date, type: 'fuel', value: r.total_value || 0 })),
      ...maintenanceRecords.map(r => ({ date: r.date, type: 'maint', value: r.total_value || 0 })),
      ...operationalRecords.map(r => ({ date: r.date, type: 'op', value: r.total_value || 0 })),
    ];

    const grouped = {};
    all.forEach(({ date, type, value }) => {
      if (!date) return;
      const d = new Date(date + 'T12:00:00');
      const key = period === 'anual'
        ? `${d.getFullYear()}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = period === 'anual'
        ? `${d.getFullYear()}`
        : d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!grouped[key]) grouped[key] = { key, label, fuel: 0, maint: 0, op: 0, total: 0 };
      grouped[key][type] += value;
      grouped[key].total += value;
    });

    return Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key));
  };

  const data = buildData();

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Evolução de Custos</h3>
          <p className="text-xs text-slate-400 mt-0.5">Abastecimento · Manutenção · Operacional</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {['mensal', 'anual'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => setExpanded(true)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Maximize2 className="w-4 h-4" /></button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Nenhum dado disponível</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gFuel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gMaint" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gOp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
            <Area type="monotone" dataKey="fuel" name="Abastecimento" stroke="#f59e0b" fill="url(#gFuel)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="maint" name="Manutenção" stroke="#ef4444" fill="url(#gMaint)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="op" name="Operacional" stroke="#10b981" fill="url(#gOp)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
            onClick={() => setExpanded(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Evolução de Custos</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Abastecimento · Manutenção · Operacional</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                    {['mensal', 'anual'].map(p => (
                      <button key={p} onClick={() => setPeriod(p)}
                        className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>
              </div>
              {data.length === 0 ? (
                <div className="h-96 flex items-center justify-center text-slate-400 text-sm">Nenhum dado disponível</div>
              ) : (
                <ResponsiveContainer width="100%" height={420}>
                  <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gFuel2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gMaint2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gOp2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                    <Area type="monotone" dataKey="fuel" name="Abastecimento" stroke="#f59e0b" fill="url(#gFuel2)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="maint" name="Manutenção" stroke="#ef4444" fill="url(#gMaint2)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="op" name="Operacional" stroke="#10b981" fill="url(#gOp2)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}