import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, LabelList
} from 'recharts';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtC = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

const TYPE_COLORS = { Abastecimento: '#f59e0b', Manutenção: '#ef4444', Operacional: '#10b981' };
const CAT_COLORS = ['#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#a78bfa'];

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
      {label && <p className="text-slate-300 font-semibold mb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const PieTT = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-semibold">{d.name}</p>
      <p className="text-slate-300">{fmt(d.value)}</p>
      <p className="text-slate-400">{d.payload.pct}%</p>
    </div>
  );
};

function ChartCard({ title, subtitle, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

export default function RelatorioCharts({ filtered }) {
  // Monthly evolution by type
  const byMonth = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!r.date) return;
      const key = r.date.slice(0, 7);
      const label = `${key.slice(5, 7)}/${key.slice(0, 4)}`;
      if (!map[key]) map[key] = { label, key, Abastecimento: 0, Manutenção: 0, Operacional: 0 };
      map[key][r._type] = (map[key][r._type] || 0) + (r.total_value || 0);
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [filtered]);

  // By type pie
  const byType = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      map[r._type] = (map[r._type] || 0) + (r.total_value || 0);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map).map(([name, value]) => ({
      name, value, pct: total > 0 ? ((value / total) * 100).toFixed(1) : '0'
    })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // By category (top 8)
  const byCategory = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r._category || 'Outros';
      map[k] = (map[k] || 0) + (r.total_value || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filtered]);

  // Top 10 suppliers
  const topSuppliers = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r.supplier || 'Não informado';
      map[k] = (map[k] || 0) + (r.total_value || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  // Line: monthly total
  const monthlyLine = useMemo(() =>
    byMonth.map(m => ({ ...m, total: (m.Abastecimento || 0) + (m.Manutenção || 0) + (m.Operacional || 0) })),
    [byMonth]);

  const totalFiltered = filtered.reduce((s, r) => s + (r.total_value || 0), 0);

  return (
    <div className="space-y-5">
      {/* Row 1: Evolution + Pie */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <ChartCard title="Evolução Mensal por Tipo" subtitle="Barras empilhadas por categoria de custo">
            {byMonth.length === 0
              ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Sem dados no período</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtC} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<TT />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Abastecimento" stackId="a" fill={TYPE_COLORS.Abastecimento} radius={[0,0,0,0]} />
                    <Bar dataKey="Manutenção" stackId="a" fill={TYPE_COLORS.Manutenção} radius={[0,0,0,0]} />
                    <Bar dataKey="Operacional" stackId="a" fill={TYPE_COLORS.Operacional} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </ChartCard>
        </div>

        <ChartCard title="Distribuição por Tipo" subtitle="Participação percentual">
          {byType.length === 0
            ? <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
            : <div>
                <div className="relative w-full h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byType} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {byType.map((d, i) => <Cell key={i} fill={TYPE_COLORS[d.name] || CAT_COLORS[i]} />)}
                      </Pie>
                      <Tooltip content={<PieTT />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-400">Total</span>
                    <span className="text-xs font-extrabold text-slate-800">{fmtC(totalFiltered)}</span>
                  </div>
                </div>
                <div className="space-y-1.5 mt-2">
                  {byType.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: TYPE_COLORS[d.name] || CAT_COLORS[i] }} />
                      <span className="text-xs text-slate-600 flex-1">{d.name}</span>
                      <span className="text-xs font-bold text-slate-800">{fmt(d.value)}</span>
                      <span className="text-[10px] text-slate-400 w-9 text-right">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
          }
        </ChartCard>
      </div>

      {/* Row 2: Line */}
      <ChartCard title="Evolução do Custo Total" subtitle="Linha de tendência mensal">
        {monthlyLine.length === 0
          ? <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
          : <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyLine} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtC} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TT />} />
                <Line type="monotone" dataKey="total" name="Total" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
        }
      </ChartCard>
    </div>
  );
}