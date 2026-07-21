import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart } from
'recharts';
import { Wrench, Car, Tag, AlertTriangle, ShieldCheck, List, DollarSign, TrendingUp, Info, CalendarDays, Filter, Maximize2, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import CategoryChart from './CategoryChart';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtCompact = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);
const fmtPct = (v) => `${Number(v).toFixed(1)}%`;

const COLORS_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
const DARK_BG = '#0f1c2e';
const CARD_BG = '#162032';
const BORDER = '#1e3048';

// ---- Date helpers ----
function getDateRange(preset) {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  if (preset === 'all') return { start: null, end: null };
  const start = new Date(now);
  if (preset === '30d') start.setDate(start.getDate() - 30);else
  if (preset === '90d') start.setDate(start.getDate() - 90);else
  if (preset === '1y') start.setFullYear(start.getFullYear() - 1);else
  if (preset === 'month') {start.setDate(1);}
  return { start: start.toISOString().split('T')[0], end };
}

function filterRecords(records, { start, end, classification, category, plate }) {
  return records.filter((r) => {
    if (start && r.date < start) return false;
    if (end && r.date > end) return false;
    if (classification && classification !== 'Todos' && r.classification !== classification) return false;
    if (category && category !== 'Todos' && r.category_name !== category) return false;
    if (plate && plate !== 'Todos' && r.plate !== plate) return false;
    return true;
  });
}

function getUnique(records, key) {
  return ['Todos', ...Array.from(new Set(records.map((r) => r[key]).filter(Boolean))).sort()];
}

// ---- Tooltips ----
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f1c2e', border: '1px solid #1e3048' }} className="rounded-xl p-3 shadow-2xl text-xs">
      {label && <p className="text-slate-300 font-semibold mb-1">{label}</p>}
      {payload.map((p, i) =>
      <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-bold">
            {typeof p.value === 'number' && p.name !== 'Qtd' ? fmt(p.value) : p.value}
          </span>
        </div>
      )}
    </div>);

};

const PieTooltipDark = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: '#0f1c2e', border: '1px solid #1e3048' }} className="rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-semibold">{d.name}</p>
      <p className="text-slate-300">Qtd: {d.payload.qty}</p>
      <p className="text-slate-300">{fmt(d.value)}</p>
      <p className="text-slate-400">{d.payload.pct}%</p>
    </div>);

};

// ---- KPI Card ----
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

// ---- Section title ----
function SectionTitle({ children }) {
  return <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest mb-3">{children}</h2>;
}

// ---- Table with colored dots ----
function DataTable({ columns, rows, total }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            {columns.map((c) =>
            <th key={c.key} className={`py-1.5 px-2 text-slate-400 font-semibold uppercase tracking-wider ${c.align || 'text-left'}`}>{c.label}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) =>
          <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5 transition-colors">
              {columns.map((c) =>
            <td key={c.key} className={`py-1.5 px-2 ${c.align || 'text-left'} text-slate-300`}>
                  {c.key === 'name' ?
              <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS_PIE[i % COLORS_PIE.length] }} />
                      <div>
                        <div className="font-semibold text-white truncate max-w-[120px]">{row[c.key]}</div>
                        {row.model && <div className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">{row.model}</div>}
                      </div>
                    </div> :
              row[c.key]}
                </td>
            )}
            </tr>
          )}
        </tbody>
        {total &&
        <tfoot>
            <tr style={{ borderTop: `1px solid ${BORDER}` }}>
              {total.map((t, i) =>
            <td key={i} className={`py-1.5 px-2 font-bold text-white ${i === 0 ? 'text-left' : 'text-right'}`}>{t}</td>
            )}
            </tr>
          </tfoot>
        }
      </table>
    </div>);

}

// ---- Main Dashboard ----
export default function MaintenanceDashboard({ maintenanceRecords, vehicles = [] }) {
  const [period, setPeriod] = useState('all');
  const [filterClass, setFilterClass] = useState('Todos');
  const [filterCat, setFilterCat] = useState('Todos');
  const [filterPlate, setFilterPlate] = useState('Todos');
  const [showFilters, setShowFilters] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Map plate -> category_name from Vehicle entity
  const plateCategoryMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => {if (v.plate) map[v.plate] = v.category_name || 'Sem Categoria';});
    return map;
  }, [vehicles]);

  // Enrich records with category from vehicle if not present
  const enrichedRecords = useMemo(() =>
  maintenanceRecords.map((r) => ({
    ...r,
    category_name: r.category_name || plateCategoryMap[r.plate] || 'Sem Categoria'
  })),
  [maintenanceRecords, plateCategoryMap]
  );

  const classifications = useMemo(() => getUnique(enrichedRecords, 'classification'), [enrichedRecords]);
  const categories = useMemo(() => getUnique(enrichedRecords, 'category_name'), [enrichedRecords]);
  const plates = useMemo(() => getUnique(enrichedRecords, 'plate'), [enrichedRecords]);

  const { start, end } = useMemo(() => {
    if (period === 'custom') return { start: customStart || null, end: customEnd || null };
    return getDateRange(period);
  }, [period, customStart, customEnd]);

  const records = useMemo(() =>
  filterRecords(enrichedRecords, { start, end, classification: filterClass, category: filterCat, plate: filterPlate }),
  [enrichedRecords, start, end, filterClass, filterCat, filterPlate]
  );

  // KPIs
  const kpis = useMemo(() => {
    const total = records.length;
    const totalCost = records.reduce((s, r) => s + (r.total_value || 0), 0);
    const avgCost = total > 0 ? totalCost / total : 0;
    const vehicles = new Set(records.map((r) => r.plate).filter(Boolean)).size;
    const types = new Set(records.map((r) => r.cost_type).filter(Boolean)).size;
    const corrective = records.filter((r) => (r.classification || '').toLowerCase().includes('corret'));
    const preventive = records.filter((r) => (r.classification || '').toLowerCase().includes('prevent'));
    const corrQty = corrective.length;
    const prevQty = preventive.length;
    const corrPct = total > 0 ? (corrQty / total * 100).toFixed(1) : 0;
    const prevPct = total > 0 ? (prevQty / total * 100).toFixed(1) : 0;
    return { total, totalCost, avgCost, vehicles, types, corrQty, prevQty, corrPct, prevPct };
  }, [records]);

  // By Category
  const byCategory = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const k = r.category_name || 'Outros';
      if (!map[k]) map[k] = { qty: 0, cost: 0 };
      map[k].qty++;
      map[k].cost += r.total_value || 0;
    });
    const total = records.length;
    const totalCost = records.reduce((s, r) => s + (r.total_value || 0), 0);
    return Object.entries(map).
    map(([name, v]) => ({ name, qty: v.qty, cost: v.cost, pct: totalCost > 0 ? (v.cost / totalCost * 100).toFixed(1) : 0 })).
    sort((a, b) => b.cost - a.cost);
  }, [records]);

  // By Vehicle
  const byVehicle = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const k = r.plate || 'N/A';
      if (!map[k]) map[k] = { qty: 0, cost: 0, model: r.vehicle_model || '' };
      if (!map[k].model && r.vehicle_model) map[k].model = r.vehicle_model;
      map[k].qty++;
      map[k].cost += r.total_value || 0;
    });
    const totalCost = records.reduce((s, r) => s + (r.total_value || 0), 0);
    const sorted = Object.entries(map).
    map(([name, v]) => ({ name, model: v.model, qty: v.qty, cost: v.cost, pct: totalCost > 0 ? (v.cost / totalCost * 100).toFixed(1) : 0 })).
    sort((a, b) => b.cost - a.cost);
    const top8 = sorted.slice(0, 8);
    const others = sorted.slice(8);
    if (others.length > 0) {
      const othCost = others.reduce((s, v) => s + v.cost, 0);
      const othQty = others.reduce((s, v) => s + v.qty, 0);
      top8.push({ name: `OUTROS (${others.length})`, model: '', qty: othQty, cost: othCost, pct: totalCost > 0 ? (othCost / totalCost * 100).toFixed(1) : 0 });
    }
    return top8;
  }, [records]);

  // By Type (classification)
  const byType = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const k = r.classification || 'N/A';
      if (!map[k]) map[k] = { qty: 0, cost: 0 };
      map[k].qty++;
      map[k].cost += r.total_value || 0;
    });
    const totalCost = records.reduce((s, r) => s + (r.total_value || 0), 0);
    const totalQty = records.length;
    return Object.entries(map).
    map(([name, v]) => ({
      name: name.toUpperCase(),
      qty: v.qty,
      cost: v.cost,
      pct: totalCost > 0 ? (v.cost / totalCost * 100).toFixed(1) : 0,
      qtyPct: totalQty > 0 ? (v.qty / totalQty * 100).toFixed(1) : 0
    })).
    sort((a, b) => b.cost - a.cost);
  }, [records]);

  // Tires by vehicle
  const byTire = useMemo(() => {
    const tireRecords = records.filter((r) => (r.cost_group || '').toLowerCase().includes('pneu'));
    const map = {};
    tireRecords.forEach((r) => {
      const k = r.plate || 'N/A';
      if (!map[k]) map[k] = { qty: 0, cost: 0, model: r.vehicle_model || '' };
      map[k].qty++;
      map[k].cost += r.total_value || 0;
      if (!map[k].model && r.vehicle_model) map[k].model = r.vehicle_model;
    });
    const totalCost = tireRecords.reduce((s, r) => s + (r.total_value || 0), 0);
    return Object.entries(map).
    map(([name, v]) => ({ name, model: v.model, qty: v.qty, cost: v.cost, pct: totalCost > 0 ? (v.cost / totalCost * 100).toFixed(1) : 0 })).
    sort((a, b) => b.cost - a.cost);
  }, [records]);

  const tireTotalCost = useMemo(() => byTire.reduce((s, v) => s + v.cost, 0), [byTire]);

  // By Month
  const byMonth = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!r.date) return;
      const [year, month] = r.date.split('-');
      const key = `${year}-${month}`;
      if (!map[key]) map[key] = { label: `${month}/${year}`, cost: 0, qty: 0, sortKey: key };
      map[key].cost += r.total_value || 0;
      map[key].qty++;
    });
    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [records]);



  // Insights
  const insights = useMemo(() => {
    const list = [];
    if (kpis.corrQty > 0 || kpis.prevQty > 0) {
      list.push({
        icon: Wrench, color: 'text-orange-400',
        text: `As manutenções corretivas representam ${kpis.corrPct}% da quantidade total e ${kpis.corrPct}% do custo total.`
      });
    }
    if (byVehicle.length > 0) {
      const top = byVehicle[0];
      list.push({
        icon: Car, color: 'text-blue-400',
        text: `O veículo ${top.name} foi o que mais gerou custo com manutenções (${fmt(top.cost)}).`
      });
    }
    if (byCategory.length > 0) {
      const top = byCategory[0];
      list.push({
        icon: Tag, color: 'text-emerald-400',
        text: `A categoria ${top.name} teve o maior custo (${fmt(top.cost)}), representando ${top.pct}% do total.`
      });
    }
    const highCost = records.filter((r) => (r.total_value || 0) > 1000);
    const highCostPct = kpis.total > 0 ? (highCost.length / kpis.total * 100).toFixed(1) : 0;
    const highCostValue = highCost.reduce((s, r) => s + (r.total_value || 0), 0);
    const highCostValuePct = kpis.totalCost > 0 ? (highCostValue / kpis.totalCost * 100).toFixed(1) : 0;
    if (highCost.length > 0) {
      list.push({
        icon: TrendingUp, color: 'text-violet-400',
        text: `Manutenções com custo acima de R$ 1.000 representam ${highCostPct}% da quantidade, mas ${highCostValuePct}% do custo total.`
      });
    }
    return list;
  }, [records, kpis, byVehicle, byCategory]);

  // Period label
  const periodLabel = useMemo(() => {
    if (period === 'all') return 'Todo período';
    if (period === 'custom') return `${customStart || '?'} - ${customEnd || '?'}`;
    if (period === '30d') return 'Últimos 30 dias';
    if (period === '90d') return 'Últimos 90 dias';
    if (period === '1y') return 'Último ano';
    if (period === 'month') return 'Este mês';
    return '';
  }, [period, customStart, customEnd]);

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
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white uppercase tracking-wide">Análises de Manutenções</h1>
            <p className="text-xs text-slate-400">Análises baseadas nos lançamentos de manutenção</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period pills */}
          <div style={{ background: CARD_BG, border: `1px solid ${BORDER}` }} className="flex rounded-lg p-1 gap-1">
            {periods.map((p) =>
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${period === p.value ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              
                {p.label}
              </button>
            )}
          </div>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{ background: showFilters ? '#2563eb' : CARD_BG, border: `1px solid ${BORDER}` }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors">
            
            <Filter className="w-3.5 h-3.5" /> FILTROS
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters &&
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
        className="rounded-xl p-4 flex flex-wrap gap-4 items-end">
        
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Classificação</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
          style={{ background: DARK_BG, border: `1px solid ${BORDER}` }}
          className="text-xs text-white rounded-lg px-3 py-1.5 outline-none">
              {classifications.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Categoria</label>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          style={{ background: DARK_BG, border: `1px solid ${BORDER}` }}
          className="text-xs text-white rounded-lg px-3 py-1.5 outline-none">
              {categories.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Veículo (Placa)</label>
            <select value={filterPlate} onChange={(e) => setFilterPlate(e.target.value)}
          style={{ background: DARK_BG, border: `1px solid ${BORDER}` }}
          className="text-xs text-white rounded-lg px-3 py-1.5 outline-none">
              {plates.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">De</label>
            <input type="date" value={customStart} onChange={(e) => {setCustomStart(e.target.value);setPeriod('custom');}}
          style={{ background: DARK_BG, border: `1px solid ${BORDER}` }}
          className="text-xs text-white rounded-lg px-3 py-1.5 outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Até</label>
            <input type="date" value={customEnd} onChange={(e) => {setCustomEnd(e.target.value);setPeriod('custom');}}
          style={{ background: DARK_BG, border: `1px solid ${BORDER}` }}
          className="text-xs text-white rounded-lg px-3 py-1.5 outline-none" />
          </div>
          <button onClick={() => {setFilterClass('Todos');setFilterCat('Todos');setFilterPlate('Todos');setPeriod('all');setCustomStart('');setCustomEnd('');}}
        className="px-3 py-1.5 rounded-lg bg-slate-700 text-xs text-white hover:bg-slate-600 transition-colors">
            Limpar
          </button>
        </motion.div>
      }

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={List} iconBg="bg-blue-600" label="Total de Manutenções" value={kpis.total} sub="lançamentos" />
        <KpiCard icon={DollarSign} iconBg="bg-emerald-600" label="Custo Total" value={fmt(kpis.totalCost)} sub={periodLabel} />
        <KpiCard icon={TrendingUp} iconBg="bg-amber-500" label="Custo Médio por Manutenção" value={fmt(kpis.avgCost)} sub="por registro" />
        <KpiCard icon={Car} iconBg="bg-cyan-600" label="Veículos Atendidos" value={kpis.vehicles} sub="no período" />
        <KpiCard icon={AlertTriangle} iconBg="bg-red-600" label="Corretivas" value={`${kpis.corrQty} (${kpis.corrPct}%)`} sub="do total" />
        <KpiCard icon={ShieldCheck} iconBg="bg-violet-600" label="Preventivas" value={`${kpis.prevQty} (${kpis.prevPct}%)`} sub="do total" />
      </div>

      {/* Row 1: By Category */}
      <CategoryChart records={enrichedRecords} />

      {/* Row 2: By Type + By Cost Range */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* By Type */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}` }} className="rounded-2xl p-4">
          <SectionTitle>Manutenções por Tipo</SectionTitle>
          <div className="flex gap-4">
            {/* Pie */}
            <div className="shrink-0 w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byType} dataKey="cost" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3}>
                    {byType.map((entry, i) => {
                      const isCorretivo = entry.name.toLowerCase().includes('corret');
                      const isPreventivo = entry.name.toLowerCase().includes('prevent');
                      return (
                        <Cell 
                          key={i} 
                          fill={isCorretivo ? '#3b82f6' : isPreventivo ? '#10b981' : ['#ec4899', '#06b6d4', '#f59e0b', '#ef4444'][i % 4]} 
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<PieTooltipDark />} />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center text-[10px] text-slate-400 -mt-2">{fmt(kpis.totalCost)}<br />Total</p>
            </div>
            {/* Table + insight */}
            <div className="flex-1 space-y-3">
              <DataTable
                columns={[
                { key: 'name', label: 'Tipo' },
                { key: 'qty', label: 'Qtd', align: 'text-right' },
                { key: 'costFmt', label: 'Custo Total (R$)', align: 'text-right' },
                { key: 'pct', label: '% do Total', align: 'text-right' }]
                }
                rows={byType.map((r) => ({ ...r, costFmt: r.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }))}
                total={['TOTAL', kpis.total, kpis.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), '100%']} />
              
              {byType.length >= 2 && (() => {
                const c = byType.find((t) => t.name.toLowerCase().includes('corret'));
                const p = byType.find((t) => t.name.toLowerCase().includes('prevent'));
                if (!c || !p || p.cost === 0) return null;
                const ratio = ((c.cost / p.cost - 1) * 100).toFixed(1);
                return (
                  <div style={{ background: '#1e3048', border: `1px solid ${BORDER}` }} className="rounded-lg p-3 flex gap-2">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-300">
                      Manutenções corretivas têm custo <span className="text-white font-bold">{ratio}%</span> maior que as preventivas.
                    </p>
                  </div>);

              })()}
            </div>
          </div>
        </div>

        {/* By Month */}
        <MonthlyChart byMonth={byMonth} fmtCompact={fmtCompact} />
      </div>

      {/* Row 3: Tires */}
      <TireChart byTire={byTire} tireTotalCost={tireTotalCost} fmtCompact={fmtCompact} />

      {/* Insights */}
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}` }} className="rounded-2xl p-4">
        <SectionTitle>Insights</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {insights.map((ins, i) => {
            const Icon = ins.icon;
            return (
              <div key={i} style={{ background: DARK_BG, border: `1px solid ${BORDER}` }} className="rounded-xl p-3 flex gap-3">
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${ins.color}`} />
                <p className="text-xs text-slate-300 leading-relaxed">{ins.text}</p>
              </div>);

          })}
          {insights.length === 0 &&
          <p className="text-xs text-slate-500">Nenhum dado disponível para o período selecionado.</p>
          }
        </div>
      </div>

      <p className="text-[10px] text-slate-600 text-center">As análises são baseadas nos lançamentos de manutenção realizados no período selecionado.</p>
    </div>);

}

// ---- Monthly Chart with Maximize ----
function MonthlyChart({ byMonth, fmtCompact }) {
  const [expanded, setExpanded] = useState(false);

  const chart = (height) =>
  <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={byMonth} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" tickFormatter={fmtCompact} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip content={<DarkTooltip />} />
          <Bar yAxisId="left" dataKey="cost" name="Custo Total (R$)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="qty" name="Qtd" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4, fill: '#06b6d4' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>;


  return (
    <>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}` }} className="rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Manutenções Mensais</h2>
          <button
            onClick={() => setExpanded(true)}
            style={{ background: DARK_BG, border: `1px solid ${BORDER}` }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Maximizar">
            
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {chart('208px')}
      </div>

      <AnimatePresence>
        {expanded &&
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          onClick={() => setExpanded(false)}>
          
            <motion.div
            initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
            className="rounded-2xl p-6 w-full max-w-5xl">
            
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Manutenções Mensais</h2>
                <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {chart('420px')}
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </>);

}

// ---- Tire Chart with colors per plate and maximize ----
const TIRE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#a78bfa'];

function TireChart({ byTire, tireTotalCost, fmtCompact }) {
  const [expanded, setExpanded] = useState(false);

  // Altura dinâmica: base 120px, cresce com mais veículos
  const dynamicHeight = Math.max(120, 120 + Math.max(0, byTire.length - 6) * 24);
  // barSize dinâmico: diminui quando há muitos veículos
  const dynBarSize = byTire.length <= 6 ? 48 : byTire.length <= 12 ? 36 : 24;

  const chart = (height) =>
  <div style={{ height }} className="flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={byTire} margin={{ left: 8, right: 8, top: 8, bottom: 70 }} barCategoryGap="25%" barSize={dynBarSize}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={BORDER} />
          <XAxis
          dataKey="name"
          interval={0}
          tick={({ x, y, payload, index }) => {
            const v = byTire[index];
            const color = TIRE_COLORS[index % TIRE_COLORS.length];
            const model = v?.model || '';
            return (
              <g transform={`translate(${x},${y})`}>
                  <text x={0} y={0} dy={14} textAnchor="middle" fill={color} fontSize={9} fontWeight="700">{payload.value}</text>
                  <text x={0} y={0} dy={27} textAnchor="middle" fill="#94a3b8" fontSize={8}>{model}</text>
                </g>);

          }}
          height={70}
          axisLine={false} tickLine={false} />
        
          <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip content={<DarkTooltip />} />
          <Bar dataKey="cost" name="Custo Pneus" radius={[4, 4, 0, 0]}>
            {byTire.map((_, i) => <Cell key={i} fill={TIRE_COLORS[i % TIRE_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>;


  return (
    <>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}` }} className="rounded-2xl py-4 mx-1 px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Custo de Pneus por Veículo</h2>
          <div className="flex items-center gap-2">
            <span style={{ background: '#1e3048', border: `1px solid ${BORDER}` }} className="text-[11px] text-amber-400 font-bold px-3 py-1 rounded-lg">
              Total: {fmt(tireTotalCost)}
            </span>
            <button
              onClick={() => setExpanded(true)}
              style={{ background: DARK_BG, border: `1px solid ${BORDER}` }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Maximizar">
              
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {byTire.length === 0 ?
        <p className="text-xs text-slate-500 py-6 text-center">Nenhum registro de pneu encontrado no período.</p> :
        chart(`${dynamicHeight}px`)}
      </div>

      <AnimatePresence>
        {expanded &&
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          onClick={() => setExpanded(false)}>
          
            <motion.div
            initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
            className="rounded-2xl p-6 w-full max-w-5xl">
            
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Custo de Pneus por Veículo</h2>
                <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {byTire.length === 0 ?
            <p className="text-xs text-slate-500 py-6 text-center">Nenhum registro de pneu encontrado no período.</p> :
            chart('420px')}
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </>);

}