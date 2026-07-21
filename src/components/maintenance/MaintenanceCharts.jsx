import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Maximize2, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);
const fmtFull = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4', '#eab308'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const ChartModal = ({ open, onClose, title, children }) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-w-4xl w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base">{title}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
      </div>
      <div style={{ height: 400 }}>{children}</div>
    </DialogContent>
  </Dialog>
);

const ChartCard = ({ title, onMaximize, children, height = 280 }) => (
  <div className="bg-card rounded-2xl border shadow-sm p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-bold text-sm text-foreground">{title}</h3>
      <button onClick={onMaximize} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
        <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
    <div style={{ height }}>{children}</div>
  </div>
);

export default function MaintenanceCharts({ records }) {
  const [modal, setModal] = useState(null);

  const donutData = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const key = r.cost_group || 'Outros';
      map[key] = (map[key] || 0) + (r.total_value || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [records]);

  const barData = useMemo(() => {
    const map = {};
    records.forEach(r => {
      if (!r.date) return;
      const month = parseInt(r.date.split('-')[1]) - 1;
      if (!map[month]) map[month] = { month: MONTHS[month], preventiva: 0, corretiva: 0 };
      if (r.classification?.toUpperCase().includes('PREVENTIV')) map[month].preventiva += r.total_value || 0;
      else map[month].corretiva += r.total_value || 0;
    });
    return Object.values(map).sort((a, b) => MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month));
  }, [records]);

  const total = donutData.reduce((s, d) => s + d.value, 0);

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.04) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>;
  };

  const DonutContent = ({ h = 260 }) => (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={h}>
        <PieChart>
          <Pie data={donutData} cx="50%" cy="50%" innerRadius={h * 0.28} outerRadius={h * 0.45} dataKey="value" labelLine={false} label={renderLabel}>
            {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => fmtFull(v)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2 overflow-auto max-h-64">
        {donutData.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground truncate">{d.name}</span>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="font-semibold text-foreground">{fmt(d.value)}</span>
              <span className="text-muted-foreground ml-1">{total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : '0%'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const BarContent = ({ h = 260 }) => (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} width={60} />
        <Tooltip formatter={(v) => fmtFull(v)} />
        <Legend />
        <Bar dataKey="preventiva" name="Preventivas" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="corretiva" name="Corretivas" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="RESUMO POR CUSTO" onMaximize={() => setModal('donut')}>
          <DonutContent />
        </ChartCard>
        <ChartCard title="COMPARATIVO PREVENTIVAS vs CORRETIVAS" onMaximize={() => setModal('bar')}>
          <BarContent />
        </ChartCard>
      </div>

      <ChartModal open={modal === 'donut'} onClose={() => setModal(null)} title="Resumo por Custo">
        <DonutContent h={380} />
      </ChartModal>
      <ChartModal open={modal === 'bar'} onClose={() => setModal(null)} title="Comparativo Preventivas vs Corretivas">
        <BarContent h={380} />
      </ChartModal>
    </>
  );
}