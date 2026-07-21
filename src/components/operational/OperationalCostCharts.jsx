import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Area, AreaChart } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#6366f1'];
const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtK = (v) => {
  if (v >= 1000000) return `R$${(v/1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$${(v/1000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg px-3 py-2">
        {label && <p className="text-xs text-muted-foreground mb-0.5">{label}</p>}
        <p className="text-sm font-bold text-foreground">{fmt(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const CustomAreaLabel = ({ x, y, value }) => {
  if (!value) return null;
  return (
    <text x={x} y={y - 10} textAnchor="middle" fill="#3b82f6" fontSize={11} fontWeight="600">
      {fmtK(value)}
    </text>
  );
};

export default function OperationalCostCharts({ records }) {
  const [period, setPeriod] = useState('mensal');

  // Donut: by cost_name
  const byCost = Object.values(
    records.reduce((acc, r) => {
      const k = r.cost_name || 'Outros';
      if (!acc[k]) acc[k] = { name: k, value: 0 };
      acc[k].value += r.total_value || 0;
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);

  const total = byCost.reduce((s, c) => s + c.value, 0);

  // Line: monthly evolution
  const byMonth = records.reduce((acc, r) => {
    if (!r.date) return acc;
    const d = new Date(r.date + 'T12:00:00');
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    if (!acc[key]) acc[key] = { key, label: label.charAt(0).toUpperCase() + label.slice(1), value: 0 };
    acc[key].value += r.total_value || 0;
    return acc;
  }, {});
  const monthlyData = Object.values(byMonth).sort((a, b) => a.key.localeCompare(b.key));

  // Annual evolution
  const byYear = records.reduce((acc, r) => {
    if (!r.date) return acc;
    const d = new Date(r.date + 'T12:00:00');
    const key = `${d.getFullYear()}`;
    if (!acc[key]) acc[key] = { key, label: key, value: 0 };
    acc[key].value += r.total_value || 0;
    return acc;
  }, {});
  const annualData = Object.values(byYear).sort((a, b) => a.key.localeCompare(b.key));

  const chartData = period === 'anual' ? annualData : monthlyData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Donut */}
      <div className="bg-card rounded-xl border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm font-bold uppercase tracking-wider text-foreground">CUSTO</span>
        </div>
        <div className="flex flex-col gap-4">
          {/* Donut chart — tall so it's readable */}
          <div className="relative w-full" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCost}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {byCost.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [fmt(v), 'Valor']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-semibold text-muted-foreground">Total</span>
              <span className="text-sm font-bold text-foreground">{fmt(total)}</span>
            </div>
          </div>
          {/* Legend — full width, all items visible */}
          <div className="space-y-2">
            {byCost.map((c, i) => {
              const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
              return (
                <div key={c.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-foreground flex-1 min-w-0 truncate" title={c.name}>{c.name}</span>
                  <span className="text-xs font-semibold text-foreground flex-shrink-0">{fmt(c.value)}</span>
                  <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Area chart */}
      <div className="bg-card rounded-xl border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-bold uppercase tracking-wider text-foreground">EVOLUÇÃO DOS CUSTOS</span>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-7 text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 30, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtK}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={65}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#costGrad)"
              dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7 }}
              label={<CustomAreaLabel />}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}