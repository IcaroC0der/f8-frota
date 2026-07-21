import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, LabelList } from
'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Maximize2, X } from 'lucide-react';

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const formatK = (v) => {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)} mil`;
  return `R$ ${v.toFixed(0)}`;
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#06b6d4'];

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold">{d.name}</p>
        <p className="text-muted-foreground">{formatCurrency(d.value)}</p>
        <p className="text-muted-foreground">{d.percent}%</p>
      </div>);

  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm space-y-1">
        <p className="font-semibold">{label}</p>
        {payload.map((p) =>
        <p key={p.name} style={{ color: p.color }}>
            {p.name === 'custo' ? formatCurrency(p.value) : `${Number(p.value).toLocaleString('pt-BR')} L`}
          </p>
        )}
      </div>);

  }
  return null;
};

// Modal de maximização
function ChartModal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>);

}

// Render do label na pizza — percentual correto: percent já é fração (0-1), multiplica por 100
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>);

};

function PieChartCard({ pieData, pieTotal, expanded }) {
  const size = expanded ? 280 : 180;
  const outer = expanded ? 135 : 85;
  const cx = expanded ? 137 : 85;
  const cy = expanded ? 137 : 85;

  return (
    <div className={`flex ${expanded ? 'flex-row items-center gap-8' : 'items-center gap-4'}`}>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width={size} height={size}>
          <PieChart>
            <Pie
              data={pieData}
              cx={cx}
              cy={cy}
              innerRadius={0}
              outerRadius={outer}
              dataKey="value"
              labelLine={false}>
              
              {pieData.map((_, i) =>
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} className="my-1" />
              )}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>

      </div>
      <div className={`flex-1 space-y-2 ${expanded ? 'max-h-64 overflow-y-auto pr-2' : ''}`}>
        {pieData.map((d, i) =>
        <div key={d.name} className="flex items-center justify-between gap-2 mx-32">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className={`font-medium ${expanded ? 'text-sm' : 'text-xs'}`}>{d.name}</span>
            </div>
            <div className="text-right">
              <span className={`text-muted-foreground ${expanded ? 'text-sm' : 'text-xs'}`}>{formatCurrency(d.value)}</span>
              <span className={`font-bold ml-2 ${expanded ? 'text-sm' : 'text-xs'}`}>{d.percent}%</span>
            </div>
          </div>
        )}
      </div>
    </div>);

}

function BarLineChart({ barData, expanded }) {
  const height = expanded ? 380 : 210;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={barData} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="mes" tick={{ fontSize: expanded ? 13 : 11 }} />
        <YAxis yAxisId="left" tickFormatter={formatK} tick={{ fontSize: expanded ? 12 : 10 }} width={70} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v} L`} tick={{ fontSize: expanded ? 12 : 10 }} width={60} />
        <RechartTooltip content={<CustomBarTooltip />} />
        <Legend
          formatter={(value) => value === 'custo' ? 'Custo (R$)' : 'Litros (L)'}
          wrapperStyle={{ fontSize: expanded ? 13 : 11 }} />
        
        <Bar yAxisId="left" dataKey="custo" name="custo" fill="#3b82f6" radius={[3, 3, 0, 0]}>
          <LabelList dataKey="custo" position="top" formatter={(v) => formatK(v)} style={{ fontSize: expanded ? 11 : 9, fontWeight: 700, fill: '#3b82f6' }} />
        </Bar>
        <Line yAxisId="right" type="monotone" dataKey="litros" name="litros" stroke="#22c55e" strokeWidth={2} dot={{ r: expanded ? 5 : 3, fill: '#22c55e' }}
        label={{ position: 'top', formatter: (v) => `${Number(v).toLocaleString('pt-BR')}L`, fontSize: expanded ? 11 : 9, fontWeight: 700, fill: '#22c55e' }} />
        
      </ComposedChart>
    </ResponsiveContainer>);

}

export default function FuelCharts({ records }) {
  const [expandedChart, setExpandedChart] = useState(null); // 'pie' | 'bar' | null

  const pieData = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const key = r.cost_type || 'Outros';
      map[key] = (map[key] || 0) + (r.total_value || 0);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map).
    sort((a, b) => b[1] - a[1]).
    map(([name, value]) => ({
      name,
      value,
      percent: total > 0 ? parseFloat((value / total * 100).toFixed(2)) : 0
    }));
  }, [records]);

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  const barData = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!r.date) return;
      const key = r.date.slice(0, 7);
      if (!map[key]) map[key] = { custo: 0, litros: 0 };
      map[key].custo += r.total_value || 0;
      map[key].litros += r.quantity || 0;
    });
    return Object.entries(map).
    sort(([a], [b]) => a.localeCompare(b)).
    map(([key, val]) => ({
      mes: format(parseISO(key + '-01'), 'MMM', { locale: ptBR }).replace('.', '').toUpperCase(),
      custo: Math.round(val.custo * 100) / 100,
      litros: Math.round(val.litros * 100) / 100
    }));
  }, [records]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pizza */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tipos de Custos</h3>
            <button
              onClick={() => setExpandedChart('pie')}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Maximizar">
              
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          {pieData.length === 0 ?
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados</div> :
          <PieChartCard pieData={pieData} pieTotal={pieTotal} expanded={false} />
          }
        </Card>

        {/* Bar + Line */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Custo e Litros por Período</h3>
            <button
              onClick={() => setExpandedChart('bar')}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Maximizar">
              
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          {barData.length === 0 ?
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados</div> :
          <BarLineChart barData={barData} expanded={false} />
          }
        </Card>
      </div>

      {/* Modal Pizza */}
      <ChartModal open={expandedChart === 'pie'} onClose={() => setExpandedChart(null)} title="Tipos de Custos">
        {pieData.length === 0 ?
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sem dados</div> :
        <PieChartCard pieData={pieData} pieTotal={pieTotal} expanded={true} />
        }
      </ChartModal>

      {/* Modal Bar */}
      <ChartModal open={expandedChart === 'bar'} onClose={() => setExpandedChart(null)} title="Custo e Litros por Período">
        {barData.length === 0 ?
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sem dados</div> :
        <BarLineChart barData={barData} expanded={true} />
        }
      </ChartModal>
    </>);

}