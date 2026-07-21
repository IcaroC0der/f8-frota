import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Maximize2, X, Filter } from 'lucide-react';

const fmtCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

const fmtCurrencyFull = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const PERIODS = [
  { label: 'Tudo', value: 'all' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: '1a', value: '1y' },
];

function filterByPeriod(records, period) {
  if (period === 'all') return records;
  const now = new Date();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const since = new Date(now);
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];
  return records.filter(r => r.date >= sinceStr);
}

function getUnique(records, key) {
  return ['Todos', ...Array.from(new Set(records.map(r => r[key]).filter(Boolean))).sort()];
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-medium">
          {fmtCurrencyFull(p.value)}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-semibold text-slate-700">{d.name}</p>
      <p className="text-slate-500">{fmtCurrencyFull(d.value)}</p>
      <p className="text-slate-400">{d.payload.pct}%</p>
    </div>
  );
};

function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {PERIODS.map(p => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
            value === p.value
              ? 'bg-violet-600 text-white'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function FilterSelect({ label, options, value, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white outline-none cursor-pointer"
    >
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function ChartCard({ title, children, filters }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <h3 className="text-sm font-bold text-slate-800 leading-tight">{title}</h3>
          <button
            onClick={() => setExpanded(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 shrink-0"
            title="Ampliar"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        {filters && (
          <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-slate-100">
            <Filter className="w-3 h-3 text-slate-400 shrink-0" />
            {filters}
          </div>
        )}

        <div className="h-56">{children}</div>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6"
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <h3 className="text-base font-bold text-slate-800">{title}</h3>
                <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {filters && (
                <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                  <Filter className="w-3 h-3 text-slate-400" />
                  {filters}
                </div>
              )}
              <div className="h-[420px]">{children}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function aggregate(records, key) {
  const map = {};
  records.forEach(r => {
    const k = r[key] || 'N/A';
    map[k] = (map[k] || 0) + (r.total_value || 0);
  });
  const total = Object.values(map).reduce((s, v) => s + v, 0);
  return Object.entries(map)
    .map(([name, value]) => ({ name, value, pct: total ? ((value / total) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

const barChart = (data, color) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
      <XAxis type="number" tickFormatter={fmtCurrency} tick={{ fontSize: 10, fill: '#94a3b8' }} />
      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: '#64748b' }} />
      <Tooltip content={<CustomTooltip />} />
      <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

const pieChart = (data) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%"
        label={({ name, pct }) => `${name} ${pct}%`} labelLine={false}>
        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
      </Pie>
      <Tooltip content={<PieTooltip />} />
      <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
    </PieChart>
  </ResponsiveContainer>
);

// --- Individual chart wrappers with their own filter state ---

function CategoryChart({ records }) {
  const [period, setPeriod] = useState('all');
  const [classification, setClassification] = useState('Todos');
  const classifications = useMemo(() => getUnique(records, 'classification'), [records]);

  const filtered = useMemo(() => {
    let r = filterByPeriod(records, period);
    if (classification !== 'Todos') r = r.filter(x => x.classification === classification);
    return aggregate(r, 'category_name');
  }, [records, period, classification]);

  return (
    <ChartCard
      title="Manutenções por Categoria"
      filters={<>
        <PeriodSelector value={period} onChange={setPeriod} />
        <FilterSelect label="Classificação" options={classifications} value={classification} onChange={setClassification} />
      </>}
    >
      {barChart(filtered, '#6366f1')}
    </ChartCard>
  );
}

function VehicleChart({ records }) {
  const [period, setPeriod] = useState('all');
  const [classification, setClassification] = useState('Todos');
  const [category, setCategory] = useState('Todos');
  const classifications = useMemo(() => getUnique(records, 'classification'), [records]);
  const categories = useMemo(() => getUnique(records, 'category_name'), [records]);

  const filtered = useMemo(() => {
    let r = filterByPeriod(records, period);
    if (classification !== 'Todos') r = r.filter(x => x.classification === classification);
    if (category !== 'Todos') r = r.filter(x => x.category_name === category);
    return aggregate(r, 'plate');
  }, [records, period, classification, category]);

  return (
    <ChartCard
      title="Manutenções por Veículo"
      filters={<>
        <PeriodSelector value={period} onChange={setPeriod} />
        <FilterSelect label="Classificação" options={classifications} value={classification} onChange={setClassification} />
        <FilterSelect label="Categoria" options={categories} value={category} onChange={setCategory} />
      </>}
    >
      {barChart(filtered, '#3b82f6')}
    </ChartCard>
  );
}

function TypeChart({ records }) {
  const [period, setPeriod] = useState('all');
  const [classification, setClassification] = useState('Todos');
  const [costGroup, setCostGroup] = useState('Todos');
  const classifications = useMemo(() => getUnique(records, 'classification'), [records]);
  const costGroups = useMemo(() => getUnique(records, 'cost_group'), [records]);

  const filtered = useMemo(() => {
    let r = filterByPeriod(records, period);
    if (classification !== 'Todos') r = r.filter(x => x.classification === classification);
    if (costGroup !== 'Todos') r = r.filter(x => x.cost_group === costGroup);
    return aggregate(r, 'cost_type');
  }, [records, period, classification, costGroup]);

  return (
    <ChartCard
      title="Manutenções por Tipo"
      filters={<>
        <PeriodSelector value={period} onChange={setPeriod} />
        <FilterSelect label="Classificação" options={classifications} value={classification} onChange={setClassification} />
        <FilterSelect label="Grupo" options={costGroups} value={costGroup} onChange={setCostGroup} />
      </>}
    >
      {barChart(filtered, '#10b981')}
    </ChartCard>
  );
}

function CostGroupChart({ records }) {
  const [period, setPeriod] = useState('all');
  const [classification, setClassification] = useState('Todos');
  const [plate, setPlate] = useState('Todos');
  const classifications = useMemo(() => getUnique(records, 'classification'), [records]);
  const plates = useMemo(() => getUnique(records, 'plate'), [records]);

  const filtered = useMemo(() => {
    let r = filterByPeriod(records, period);
    if (classification !== 'Todos') r = r.filter(x => x.classification === classification);
    if (plate !== 'Todos') r = r.filter(x => x.plate === plate);
    return aggregate(r, 'cost_group');
  }, [records, period, classification, plate]);

  return (
    <ChartCard
      title="Manutenções por Custo (Grupo)"
      filters={<>
        <PeriodSelector value={period} onChange={setPeriod} />
        <FilterSelect label="Classificação" options={classifications} value={classification} onChange={setClassification} />
        <FilterSelect label="Veículo" options={plates} value={plate} onChange={setPlate} />
      </>}
    >
      {barChart(filtered, '#f59e0b')}
    </ChartCard>
  );
}

function ClassificationChart({ records }) {
  const [period, setPeriod] = useState('all');
  const [category, setCategory] = useState('Todos');
  const [plate, setPlate] = useState('Todos');
  const categories = useMemo(() => getUnique(records, 'category_name'), [records]);
  const plates = useMemo(() => getUnique(records, 'plate'), [records]);

  const filtered = useMemo(() => {
    let r = filterByPeriod(records, period);
    if (category !== 'Todos') r = r.filter(x => x.category_name === category);
    if (plate !== 'Todos') r = r.filter(x => x.plate === plate);
    return aggregate(r, 'classification');
  }, [records, period, category, plate]);

  return (
    <ChartCard
      title="Manutenções por Classificação"
      filters={<>
        <PeriodSelector value={period} onChange={setPeriod} />
        <FilterSelect label="Categoria" options={categories} value={category} onChange={setCategory} />
        <FilterSelect label="Veículo" options={plates} value={plate} onChange={setPlate} />
      </>}
    >
      {pieChart(filtered)}
    </ChartCard>
  );
}

export default function MaintenanceAnalysisCharts({ maintenanceRecords }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <CategoryChart records={maintenanceRecords} />
      <VehicleChart records={maintenanceRecords} />
      <TypeChart records={maintenanceRecords} />
      <CostGroupChart records={maintenanceRecords} />
      <ClassificationChart records={maintenanceRecords} />
    </div>
  );
}