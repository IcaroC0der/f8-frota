import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { Maximize2, X, Filter, ChevronRight, ArrowLeft } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtCompact = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

const COLORS_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#e879f9', '#fb923c', '#38bdf8'];
const DARK_BG = '#0f1c2e';
const CARD_BG = '#162032';
const BORDER = '#1e3048';

const PieTooltipDark = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: DARK_BG, border: `1px solid ${BORDER}` }} className="rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-semibold">{d.name}</p>
      <p className="text-slate-300">Qtd: {d.payload.qty}</p>
      <p className="text-slate-300">{fmt(d.value)}</p>
      <p className="text-slate-400">{d.payload.pct}%</p>
    </div>
  );
};

const BarTooltipDark = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div style={{ background: DARK_BG, border: `1px solid ${BORDER}` }} className="rounded-xl p-3 shadow-2xl text-xs max-w-[220px]">
      <p className="text-white font-bold mb-1.5">{label}</p>
      {payload.map((p, i) => p.value > 0 && (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
          <span className="text-slate-400 truncate flex-1">{p.name}</span>
          <span className="text-white font-semibold">{fmtCompact(p.value)}</span>
        </div>
      ))}
      <div className="mt-1.5 pt-1.5" style={{ borderTop: `1px solid ${BORDER}` }}>
        <span className="text-slate-300 font-bold">Total: {fmt(total)}</span>
      </div>
    </div>
  );
};

// Drill-down modal: placas da categoria com barras empilhadas por cost_type
function DrillDownModal({ category, records, onClose }) {
  const costTypes = useMemo(() => Array.from(new Set(records.map(r => r.cost_type).filter(Boolean))).sort(), [records]);

  const chartData = useMemo(() => {
    const plateMap = {};
    records.forEach(r => {
      const plate = r.plate || 'N/A';
      if (!plateMap[plate]) plateMap[plate] = { plate, model: r.vehicle_model || '', total: 0 };
      if (!plateMap[plate].model && r.vehicle_model) plateMap[plate].model = r.vehicle_model;
      const ct = r.cost_type || 'Outros';
      plateMap[plate][ct] = (plateMap[plate][ct] || 0) + (r.total_value || 0);
      plateMap[plate].total += r.total_value || 0;
    });
    return Object.values(plateMap).sort((a, b) => b.total - a.total);
  }, [records]);

  const totalCost = records.reduce((s, r) => s + (r.total_value || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
        className="rounded-2xl w-full max-w-5xl p-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-widest">
              Detalhamento — {category}
            </h2>
            <p className="text-[11px] text-slate-400">Custo por placa e tipo de custo · Total: {fmt(totalCost)} · {records.length} lançamentos</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bar Chart */}
        {chartData.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Nenhum dado disponível.</p>
        ) : (
          <>
            <div style={{ height: Math.max(320, chartData.length * 38) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={BORDER} />
                  <XAxis
                    type="number"
                    tickFormatter={fmtCompact}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="plate"
                    width={90}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<BarTooltipDark />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={v => <span className="text-xs text-slate-400">{v}</span>}
                  />
                  {costTypes.map((ct, i) => (
                    <Bar
                      key={ct}
                      dataKey={ct}
                      name={ct}
                      stackId="a"
                      fill={COLORS_PIE[i % COLORS_PIE.length]}
                      radius={i === costTypes.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary table */}
            <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resumo por Placa</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <th className="py-1.5 px-2 text-left text-slate-400 font-semibold uppercase tracking-wider">Placa</th>
                      <th className="py-1.5 px-2 text-right text-slate-400 font-semibold uppercase tracking-wider">Qtd</th>
                      <th className="py-1.5 px-2 text-right text-slate-400 font-semibold uppercase tracking-wider">Custo Total</th>
                      <th className="py-1.5 px-2 text-right text-slate-400 font-semibold uppercase tracking-wider">% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => {
                      const qty = records.filter(r => (r.plate || 'N/A') === row.plate).length;
                      const pct = totalCost > 0 ? ((row.total / totalCost) * 100).toFixed(1) : 0;
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5">
                          <td className="py-1.5 px-2 text-left text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS_PIE[i % COLORS_PIE.length] }} />
                              <div>
                                <div className="font-semibold text-white">{row.plate}</div>
                                {row.model && <div className="text-[10px] text-slate-400 leading-tight">{row.model}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-300">{qty}</td>
                          <td className="py-1.5 px-2 text-right text-slate-300">{fmt(row.total)}</td>
                          <td className="py-1.5 px-2 text-right text-slate-400">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td className="py-1.5 px-2 font-bold text-white">TOTAL</td>
                      <td className="py-1.5 px-2 font-bold text-white text-right">{records.length}</td>
                      <td className="py-1.5 px-2 font-bold text-white text-right">{fmt(totalCost)}</td>
                      <td className="py-1.5 px-2 font-bold text-white text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function DataTable({ rows, total, filteredRecords, onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            {['Categoria', 'Qtd', 'Custo Total (R$)', '% do Total', ''].map((h, i) => (
              <th key={i} className={`py-1.5 px-2 text-slate-400 font-semibold uppercase tracking-wider ${h === 'Categoria' || h === '' ? 'text-left' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{ borderBottom: `1px solid ${BORDER}20` }}
              className="hover:bg-white/5 transition-colors cursor-pointer group"
              onClick={() => onRowClick(row.name)}
            >
              <td className="py-1.5 px-2 text-left text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS_PIE[i % COLORS_PIE.length] }} />
                  <span className="truncate max-w-[140px]">{row.name}</span>
                </div>
              </td>
              <td className="py-1.5 px-2 text-right text-slate-300">{row.qty}</td>
              <td className="py-1.5 px-2 text-right text-slate-300">{row.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              <td className="py-1.5 px-2 text-right text-slate-300">{row.pct}%</td>
              <td className="py-1.5 px-2 text-left">
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
              </td>
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr style={{ borderTop: `1px solid ${BORDER}` }}>
              <td className="py-1.5 px-2 font-bold text-white text-left" colSpan={1}>{total[0]}</td>
              <td className="py-1.5 px-2 font-bold text-white text-right">{total[1]}</td>
              <td className="py-1.5 px-2 font-bold text-white text-right">{total[2]}</td>
              <td className="py-1.5 px-2 font-bold text-white text-right">{total[3]}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
      <p className="text-[10px] text-slate-600 mt-2 pl-2">Clique em uma categoria para ver o detalhamento por placa</p>
    </div>
  );
}

function ChartContent({ records, expanded }) {
  const [filterCat, setFilterCat] = useState('Todas');
  const [filterClass, setFilterClass] = useState('Todas');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [drillCategory, setDrillCategory] = useState(null);

  const categories = useMemo(() => ['Todas', ...Array.from(new Set(records.map(r => r.category_name).filter(Boolean))).sort()], [records]);
  const classifications = useMemo(() => ['Todas', ...Array.from(new Set(records.map(r => r.classification).filter(Boolean))).sort()], [records]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterCat !== 'Todas' && r.category_name !== filterCat) return false;
      if (filterClass !== 'Todas' && r.classification !== filterClass) return false;
      if (dateStart && r.date < dateStart) return false;
      if (dateEnd && r.date > dateEnd) return false;
      return true;
    });
  }, [records, filterCat, filterClass, dateStart, dateEnd]);

  const byCategory = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r.category_name || 'Sem Categoria';
      if (!map[k]) map[k] = { qty: 0, cost: 0 };
      map[k].qty++;
      map[k].cost += r.total_value || 0;
    });
    const totalCost = filtered.reduce((s, r) => s + (r.total_value || 0), 0);
    return Object.entries(map)
      .map(([name, v]) => ({ name, qty: v.qty, cost: v.cost, pct: totalCost > 0 ? ((v.cost / totalCost) * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.cost - a.cost);
  }, [filtered]);

  const totalCost = filtered.reduce((s, r) => s + (r.total_value || 0), 0);
  const totalQty = filtered.length;
  const inputStyle = { background: DARK_BG, border: `1px solid ${BORDER}` };

  // Records for the drilled category
  const drillRecords = useMemo(() => {
    if (!drillCategory) return [];
    return filtered.filter(r => (r.category_name || 'Sem Categoria') === drillCategory);
  }, [filtered, drillCategory]);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4 pb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 self-center" />
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Categoria</label>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            style={inputStyle} className="text-xs text-white rounded-lg px-3 py-1.5 outline-none">
            {categories.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Classificação</label>
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            style={inputStyle} className="text-xs text-white rounded-lg px-3 py-1.5 outline-none">
            {classifications.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">De</label>
          <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
            style={inputStyle} className="text-xs text-white rounded-lg px-3 py-1.5 outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Até</label>
          <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
            style={inputStyle} className="text-xs text-white rounded-lg px-3 py-1.5 outline-none" />
        </div>
        <button
          onClick={() => { setFilterCat('Todas'); setFilterClass('Todas'); setDateStart(''); setDateEnd(''); }}
          className="px-3 py-1.5 rounded-lg text-xs text-white hover:bg-slate-600 transition-colors"
          style={{ background: '#1e3048' }}
        >
          Limpar
        </button>
      </div>

      {/* Content */}
      <div className="flex gap-4 items-start">
        {/* Pie */}
        <div className={`shrink-0 ${expanded ? 'w-56 h-56' : 'w-44 h-44'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byCategory} dataKey="cost" nameKey="name" cx="50%" cy="50%"
                innerRadius={expanded ? 50 : 40} outerRadius={expanded ? 80 : 68} paddingAngle={2}>
                {byCategory.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
              </Pie>
              <Tooltip content={<PieTooltipDark />} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-[10px] text-slate-400 -mt-2">{fmt(totalCost)}<br />Total</p>
        </div>
        {/* Table */}
        <div className="flex-1 overflow-hidden">
          {byCategory.length === 0
            ? <p className="text-xs text-slate-500 mt-4">Nenhum dado para os filtros selecionados.</p>
            : <DataTable
                rows={byCategory}
                total={['TOTAL', totalQty, totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), '100%']}
                filteredRecords={filtered}
                onRowClick={setDrillCategory}
              />
          }
        </div>
      </div>

      {/* Drill-down modal */}
      <AnimatePresence>
        {drillCategory && (
          <DrillDownModal
            category={drillCategory}
            records={drillRecords}
            onClose={() => setDrillCategory(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function CategoryChart({ records }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}` }} className="rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Manutenções por Categoria</h2>
          <button
            onClick={() => setExpanded(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            title="Maximizar"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <ChartContent records={records} expanded={false} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
              className="rounded-2xl w-full max-w-5xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-200 uppercase tracking-widest">Manutenções por Categoria</h2>
                <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ChartContent records={records} expanded={true} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}