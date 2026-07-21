import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Maximize2, X } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);
const fmtCompact = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#a78bfa'];

const PERIODS = [
  { label: 'Tudo', value: 'all' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: '1 ano', value: '1y' },
  { label: 'Este mês', value: 'month' },
];

function getStart(preset) {
  if (preset === 'all') return null;
  const now = new Date();
  if (preset === '30d') { now.setDate(now.getDate() - 30); return now.toISOString().split('T')[0]; }
  if (preset === '90d') { now.setDate(now.getDate() - 90); return now.toISOString().split('T')[0]; }
  if (preset === '1y') { now.setFullYear(now.getFullYear() - 1); return now.toISOString().split('T')[0]; }
  if (preset === 'month') { now.setDate(1); return now.toISOString().split('T')[0]; }
  return null;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-slate-300 font-semibold mb-1">{label}</p>
      <p className="text-white font-bold">{fmt(payload[0].value)}</p>
    </div>
  );
};

function ChartContent({ records, height }) {
  const [period, setPeriod] = useState('all');

  const start = useMemo(() => getStart(period), [period]);

  const data = useMemo(() => {
    const filtered = start ? records.filter(r => r.date >= start) : records;
    const map = {};
    filtered.forEach(r => {
      const k = r.cost_name || 'Outros';
      map[k] = (map[k] || 0) + (r.total_value || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [records, start]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${period === p.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-slate-500 ml-auto">Total: <span className="text-slate-800">{fmt(total)}</span></span>
      </div>

      {data.length === 0 ? (
        <div style={{ height }} className="flex items-center justify-center text-slate-400 text-sm">Nenhum dado disponível</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </>
  );
}

export default function DashboardOperationalCosts({ operationalRecords }) {
  const [expanded, setExpanded] = useState(false);
  const dynamicHeight = Math.max(200, (operationalRecords.length > 0 ? Math.min(Object.keys(operationalRecords.reduce((m, r) => { m[r.cost_name || 'Outros'] = 1; return m; }, {})).length, 20) : 1) * 36);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Custos Operacionais</h3>
            <p className="text-xs text-slate-400 mt-0.5">Valor por tipo de custo operacional</p>
          </div>
          <button onClick={() => setExpanded(true)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <ChartContent records={operationalRecords} height={Math.min(dynamicHeight, 240)} />
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
            onClick={() => setExpanded(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 uppercase tracking-widest">Custos Operacionais</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Valor por tipo de custo operacional</p>
                </div>
                <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <ChartContent records={operationalRecords} height={Math.max(380, dynamicHeight)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}