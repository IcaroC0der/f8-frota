import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Line, Area, AreaChart, LabelList } from
'recharts';
import { Fuel, DollarSign, Droplets, TrendingUp, Car, Filter, Maximize2, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import FuelCategoryChart from './FuelCategoryChart';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtCompact = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);
const fmtNum = (v) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(v || 0);

const DARK_BG = '#0f1c2e';
const CARD_BG = '#162032';
const BORDER = '#1e3048';
const COLORS = ['#ec4899', '#8b5cf6', '#10b981', '#ef4444', '#3b82f6', '#06b6d4', '#eab308', '#f472b6', '#84cc16', '#a78bfa'];

function getDateRange(preset) {
  const now = new Date();
  if (preset === 'all') return { start: null, end: null };
  const start = new Date(now);
  if (preset === '30d') start.setDate(start.getDate() - 30);else
  if (preset === '90d') start.setDate(start.getDate() - 90);else
  if (preset === '1y') start.setFullYear(start.getFullYear() - 1);else
  if (preset === 'month') start.setDate(1);
  return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
}

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: DARK_BG, border: `1px solid ${BORDER}` }} className="rounded-xl p-3 shadow-2xl text-xs">
      {label && <p className="text-slate-300 font-semibold mb-1">{label}</p>}
      {payload.map((p, i) =>
      <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-bold">
            {p.name === 'Litros' ? `${fmtNum(p.value)} L` : fmt(p.value)}
          </span>
        </div>
      )}
    </div>);

};

const AvgPriceTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: DARK_BG, border: `1px solid ${BORDER}` }} className="rounded-xl p-3 shadow-2xl text-xs">
      {label && <p className="text-slate-300 font-semibold mb-1">{label}</p>}
      {payload.map((p, i) =>
      <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-bold">R$ {Number(p.value).toFixed(4)}/L</span>
        </div>
      )}
    </div>);

};

const PieTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: DARK_BG, border: `1px solid ${BORDER}` }} className="rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-semibold">{d.name}</p>
      <p className="text-slate-300">{fmt(d.value)}</p>
      <p className="text-slate-400">{d.payload.pct}%</p>
    </div>);

};

function KpiCard({ icon: Icon, iconBg, label, value, sub }) {
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}` }} className="rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="font-extrabold leading-tight text-sm text-[hsl(var(--chart-3))]">{value}</p>
        {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
      </div>
    </div>);

}

function SectionTitle({ children }) {
  return <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest mb-3">{children}</h2>;
}

function MaxCard({ title, children, expandedHeight = '400px' }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}` }} className="rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">{title}</h2>
          <button onClick={() => setExpanded(true)}
          style={{ background: DARK_BG, border: `1px solid ${BORDER}` }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {children('200px')}
      </div>
      <AnimatePresence>
        {expanded &&
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
        onClick={() => setExpanded(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          className="rounded-2xl p-6 w-full max-w-5xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">{title}</h2>
                <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {children(expandedHeight)}
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </>);

}

export default function FuelDashboard({ fuelRecords, vehicles = [] }) {
  const [period, setPeriod] = useState('all');
  const [filterCostName, setFilterCostName] = useState('Todos');
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [showFilters, setShowFilters] = useState(false);

  // Mapa placa -> category_name dos veículos cadastrados
  const plateCategoryMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => {if (v.plate) map[v.plate] = v.category_name || 'Sem Categoria';});
    return map;
  }, [vehicles]);

  // Enriquecer registros com categoria do veículo cadastrado
  const enrichedRecords = useMemo(() =>
  fuelRecords.map((r) => ({
    ...r,
    category_name: plateCategoryMap[r.plate] || r.category_name || 'Sem Categoria'
  })),
  [fuelRecords, plateCategoryMap]
  );

  const { start, end } = useMemo(() => getDateRange(period), [period]);

  const records = useMemo(() => {
    return enrichedRecords.filter((r) => {
      if (start && r.date < start) return false;
      if (end && r.date > end) return false;
      if (filterCostName !== 'Todos' && r.cost_name !== filterCostName) return false;
      if (filterCategory !== 'Todos' && r.category_name !== filterCategory) return false;
      return true;
    });
  }, [fuelRecords, start, end, filterCostName, filterCategory]);

  const costNames = useMemo(() => ['Todos', ...Array.from(new Set(enrichedRecords.map((r) => r.cost_name).filter(Boolean))).sort()], [enrichedRecords]);
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(enrichedRecords.map((r) => r.category_name).filter(Boolean))).sort()], [enrichedRecords]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCost = records.reduce((s, r) => s + (r.total_value || 0), 0);
    const totalLiters = records.filter((r) => r.unit === 'LT').reduce((s, r) => s + (r.quantity || 0), 0);
    const totalRecords = records.length;
    const avgCostPerRecord = totalRecords > 0 ? totalCost / totalRecords : 0;
    const fuelCost = records.filter((r) => (r.cost_name || '').toUpperCase().includes('COMBUST')).reduce((s, r) => s + (r.total_value || 0), 0);
    const tankCost = records.filter((r) => (r.cost_name || '').toUpperCase().includes('TANQUE')).reduce((s, r) => s + (r.total_value || 0), 0);
    return { totalCost, totalLiters, totalRecords, avgCostPerRecord, fuelCost, tankCost };
  }, [records]);

  // Por cost_name (COMBUSTÍVEIS, TANQUE, etc.)
  const byCostName = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const k = r.cost_name || 'N/A';
      if (!map[k]) map[k] = 0;
      map[k] += r.total_value || 0;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map).
    map(([name, value]) => ({ name, value, pct: total > 0 ? (value / total * 100).toFixed(1) : '0.0' })).
    sort((a, b) => b.value - a.value);
  }, [records]);

  // Por cost_type (DIESEL, GASOLINA, etc.)
  const byCostType = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const k = r.cost_type || 'N/A';
      if (!map[k]) map[k] = { value: 0, liters: 0 };
      map[k].value += r.total_value || 0;
      if (r.unit === 'LT') map[k].liters += r.quantity || 0;
    });
    const total = Object.values(map).reduce((s, v) => s + v.value, 0);
    return Object.entries(map).
    map(([name, v]) => ({ name, value: v.value, liters: v.liters, pct: total > 0 ? (v.value / total * 100).toFixed(1) : '0.0' })).
    sort((a, b) => b.value - a.value);
  }, [records]);

  // Por categoria de veículo
  const byCategory = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const k = r.category_name || 'Sem Categoria';
      if (!map[k]) map[k] = { value: 0, liters: 0 };
      map[k].value += r.total_value || 0;
      if (r.unit === 'LT') map[k].liters += r.quantity || 0;
    });
    const total = Object.values(map).reduce((s, v) => s + v.value, 0);
    return Object.entries(map).
    map(([name, v]) => ({ name, value: v.value, liters: Math.round(v.liters), pct: total > 0 ? (v.value / total * 100).toFixed(1) : '0.0' })).
    sort((a, b) => b.value - a.value);
  }, [records]);

  // Evolução mensal de litros
  const byMonthLiters = useMemo(() => {
    const map = {};
    records.filter((r) => r.unit === 'LT').forEach((r) => {
      if (!r.date) return;
      const [year, month] = r.date.split('-');
      const key = `${year}-${month}`;
      if (!map[key]) map[key] = { label: `${month}/${year}`, liters: 0, sortKey: key };
      map[key].liters += r.quantity || 0;
    });
    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).
    map((m) => ({ ...m, liters: Math.round(m.liters) }));
  }, [records]);

  // Evolução preço médio por combustível (cost_type) por mês
  const avgPriceByMonth = useMemo(() => {
    const map = {};
    records.filter((r) => r.unit === 'LT' && r.quantity > 0).forEach((r) => {
      if (!r.date) return;
      const [year, month] = r.date.split('-');
      const key = `${year}-${month}`;
      const type = r.cost_type || 'N/A';
      if (!map[key]) map[key] = { label: `${month}/${year}`, sortKey: key };
      if (!map[key][`_sum_${type}`]) map[key][`_sum_${type}`] = 0;
      if (!map[key][`_qty_${type}`]) map[key][`_qty_${type}`] = 0;
      map[key][`_sum_${type}`] += r.total_value || 0;
      map[key][`_qty_${type}`] += r.quantity || 0;
    });
    const types = Array.from(new Set(records.filter((r) => r.unit === 'LT' && r.quantity > 0).map((r) => r.cost_type).filter(Boolean)));
    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).map((m) => {
      const entry = { label: m.label };
      types.forEach((t) => {
        const sum = m[`_sum_${t}`] || 0;
        const qty = m[`_qty_${t}`] || 0;
        entry[t] = qty > 0 ? parseFloat((sum / qty).toFixed(4)) : null;
      });
      return entry;
    });
  }, [records]);

  const fuelTypes = useMemo(() =>
  Array.from(new Set(records.filter((r) => r.unit === 'LT' && r.quantity > 0).map((r) => r.cost_type).filter(Boolean))),
  [records]);

  // Top 10 veículos por gasto
  const top10Vehicles = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const k = r.plate || 'N/A';
      if (!map[k]) map[k] = { value: 0, liters: 0, model: r.vehicle_model || '' };
      if (!map[k].model && r.vehicle_model) map[k].model = r.vehicle_model;
      map[k].value += r.total_value || 0;
      if (r.unit === 'LT') map[k].liters += r.quantity || 0;
    });
    return Object.entries(map).
    map(([name, v]) => ({ name, model: v.model, value: v.value, liters: Math.round(v.liters) })).
    sort((a, b) => b.value - a.value).
    slice(0, 10);
  }, [records]);

  // Postos por volume financeiro
  const bySupplier = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const k = r.supplier || 'Não informado';
      if (!map[k]) map[k] = { value: 0, liters: 0 };
      map[k].value += r.total_value || 0;
      if (r.unit === 'LT') map[k].liters += r.quantity || 0;
    });
    return Object.entries(map).
    map(([name, v]) => ({ name, value: v.value, liters: Math.round(v.liters) })).
    sort((a, b) => b.value - a.value).
    slice(0, 10);
  }, [records]);

  // Comparativo mensal
  const byMonth = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!r.date) return;
      const [year, month] = r.date.split('-');
      const key = `${year}-${month}`;
      if (!map[key]) map[key] = { label: `${month}/${year}`, cost: 0, liters: 0, sortKey: key };
      map[key].cost += r.total_value || 0;
      if (r.unit === 'LT') map[key].liters += r.quantity || 0;
    });
    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [records]);

  const periods = [
  { label: 'Tudo', value: 'all' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: '1 ano', value: '1y' },
  { label: 'Este mês', value: 'month' }];


  return (
    <div style={{ background: DARK_BG, minHeight: '100%' }} className="rounded-2xl p-5 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <Fuel className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white uppercase tracking-wide">Análise de Abastecimentos</h1>
            <p className="text-xs text-slate-400">Análises baseadas nos lançamentos de abastecimento</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div style={{ background: CARD_BG, border: `1px solid ${BORDER}` }} className="flex rounded-lg p-1 gap-1">
            {periods.map((p) =>
            <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${period === p.value ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                {p.label}
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
          style={{ background: showFilters ? '#d97706' : CARD_BG, border: `1px solid ${BORDER}` }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors">
            <Filter className="w-3.5 h-3.5" /> FILTROS
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters &&
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
      className="rounded-xl p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Tipo de Custo</label>
            <select value={filterCostName} onChange={(e) => setFilterCostName(e.target.value)}
          style={{ background: DARK_BG, border: `1px solid ${BORDER}` }}
          className="text-xs text-white rounded-lg px-3 py-1.5 outline-none">
              {costNames.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Categoria</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          style={{ background: DARK_BG, border: `1px solid ${BORDER}` }}
          className="text-xs text-white rounded-lg px-3 py-1.5 outline-none">
              {categories.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <button onClick={() => {setFilterCostName('Todos');setFilterCategory('Todos');setPeriod('all');}}
        className="px-3 py-1.5 rounded-lg bg-slate-700 text-xs text-white hover:bg-slate-600 transition-colors">
            Limpar
          </button>
        </motion.div>
      }

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={DollarSign} iconBg="bg-amber-500" label="Custo Total" value={fmt(kpis.totalCost)} sub="no período" />
        <KpiCard icon={Droplets} iconBg="bg-blue-600" label="Total Abastecido" value={`${fmtNum(Math.round(kpis.totalLiters))} L`} sub="litros" />
        <KpiCard icon={TrendingUp} iconBg="bg-emerald-600" label="Ticket Médio" value={fmt(kpis.avgCostPerRecord)} sub="por abastecimento" />
        <KpiCard icon={Fuel} iconBg="bg-cyan-600" label="Total Registros" value={fmtNum(kpis.totalRecords)} sub="lançamentos" />
        <KpiCard icon={Fuel} iconBg="bg-orange-500" label="Total Combustíveis" value={fmt(kpis.fuelCost)} sub="custo combustíveis" />
        <KpiCard icon={Car} iconBg="bg-violet-600" label="Total Tanque" value={fmt(kpis.tankCost)} sub="custo tanque" />
      </div>

      {/* Row 1: Por Custo (Nome) + Por Tipo */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Por Cost Name - Pie */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}` }} className="rounded-2xl p-4">
          <SectionTitle>Total por Tipo de Custo</SectionTitle>
          <div className="flex gap-4 items-center">
            <div className="shrink-0 w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart className="">
                  <Pie data={byCostName} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3}>
                    {byCostName.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {byCostName.map((item, i) =>
              <div key={item.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-slate-300 flex-1 truncate">{item.name}</span>
                  <span className="text-xs font-bold text-white">{fmt(item.value)}</span>
                  <span className="text-[10px] text-slate-500 w-10 text-right">{item.pct}%</span>
                </div>
              )}
              {byCostName.length === 0 && <p className="text-xs text-slate-500">Sem dados</p>}
            </div>
          </div>
        </div>

        {/* Por Cost Type (DIESEL, GASOLINA...) */}
        <MaxCard title="Custo por Combustível">
          {(h) =>
          <div style={{ height: h }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCostType} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={BORDER} />
                  <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="value" name="Custo Total" radius={[0, 4, 4, 0]}>
                    {byCostType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    <LabelList dataKey="value" position="right" formatter={fmtCompact} style={{ fill: '#e2e8f0', fontSize: 9, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
        </MaxCard>
      </div>

      {/* Row 2: Por Categoria (componente interativo com drill-down) */}
      <FuelCategoryChart records={records} />

      {/* Row 3: Evolução Litros + Preço Médio */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Evolução Volume (Litros) */}
        <MaxCard title="Evolução do Volume Abastecido (Litros)" expandedHeight="360px">
          {(h) =>
          <div style={{ height: h }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={byMonthLiters} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${fmtNum(v)}L`} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="liters" name="Litros" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="liters" position="top" formatter={(v) => `${fmtNum(v)}L`} style={{ fill: '#e2e8f0', fontSize: 9, fontWeight: 700 }} />
                  </Bar>
                  <Line type="monotone" dataKey="liters" name="Litros" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          }
        </MaxCard>

        {/* Evolução Preço Médio */}
        <MaxCard title="Evolução do Preço Médio (R$/L)" expandedHeight="360px">
          {(h) =>
          <div style={{ height: h }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={avgPriceByMonth} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `R$${v.toFixed(2)}`} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<AvgPriceTip />} />
                  {fuelTypes.map((t, i) =>
                <Line key={t} type="monotone" dataKey={t} name={t} stroke={COLORS[i % COLORS.length]}
                strokeWidth={2} dot={{ r: 3 }} connectNulls />
                )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          }
        </MaxCard>
      </div>

      {/* Row 4: Top 10 Veículos + Postos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Top 10 Veículos */}
        <MaxCard title="Top 10 Veículos com Maior Gasto" expandedHeight="420px">
          {(h) =>
          <div style={{ height: h }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10Vehicles} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={BORDER} />
                  <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100}
                    tick={({ x, y, payload, index }) => {
                      const v = top10Vehicles[index];
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={-4} y={-5} textAnchor="end" fill="#94a3b8" fontSize={9} fontWeight="700">{payload.value}</text>
                          {v?.model && <text x={-4} y={7} textAnchor="end" fill="#64748b" fontSize={8}>{v.model}</text>}
                        </g>
                      );
                    }}
                    axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="value" name="Custo Total" radius={[0, 4, 4, 0]}>
                    {top10Vehicles.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    <LabelList dataKey="value" position="right" formatter={fmtCompact} style={{ fill: '#e2e8f0', fontSize: 9, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
        </MaxCard>

        {/* Postos por Volume Financeiro */}
        <MaxCard title="Postos com Maior Volume Financeiro" expandedHeight="420px">
          {(h) =>
          <div style={{ height: h }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySupplier} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={BORDER} />
                  <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="value" name="Custo Total" radius={[0, 4, 4, 0]}>
                    {bySupplier.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    <LabelList dataKey="value" position="right" formatter={fmtCompact} style={{ fill: '#e2e8f0', fontSize: 9, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
        </MaxCard>
      </div>

      {/* Row 5: Comparativo Mensal */}
      <MaxCard title="Comparativo Mensal de Despesas" expandedHeight="420px">
        {(h) =>
        <div style={{ height: h }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={byMonth} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tickFormatter={fmtCompact} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${fmtNum(v)}L`} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar yAxisId="left" dataKey="cost" name="Custo Total (R$)" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="cost" position="top" formatter={fmtCompact} style={{ fill: '#e2e8f0', fontSize: 9, fontWeight: 700 }} />
                  </Bar>
                <Line yAxisId="right" type="monotone" dataKey="liters" name="Litros" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        }
      </MaxCard>

    </div>);

}