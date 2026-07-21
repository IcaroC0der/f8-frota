import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { ChevronRight, X, Filter, Maximize2 } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtCompact = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#a78bfa', '#34d399', '#fb923c'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-bold">{d.name}</p>
      <p className="text-slate-300">{fmt(d.value)}</p>
    </div>
  );
};

const DrillDownTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-slate-300 font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardCostByCategory({ fuelRecords, maintenanceRecords, operationalRecords, vehicles = [] }) {
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Map plate -> category_name and model
  const plateCategoryMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => { if (v.plate) map[v.plate] = v.category_name || 'Sem Categoria'; });
    return map;
  }, [vehicles]);

  const plateModelMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => { if (v.plate && v.vehicle_model) map[v.plate] = v.vehicle_model; });
    return map;
  }, [vehicles]);

  const getCategory = (r) =>
    (r.plate ? plateCategoryMap[r.plate] : null) || r.category_name || 'Sem Categoria';

  const filterByDate = (records) =>
    records.filter((r) => {
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });

  const allRecords = useMemo(() => {
    const fuel = filterByDate(fuelRecords).map((r) => ({ ...r, _type: 'Abastecimento', _cat: getCategory(r) }));
    const maint = filterByDate(maintenanceRecords).map((r) => ({ ...r, _type: 'Manutenção', _cat: getCategory(r) }));
    const op = filterByDate(operationalRecords).map((r) => ({ ...r, _type: 'Operacional', _cat: getCategory(r) }));
    return [...fuel, ...maint, ...op];
  }, [fuelRecords, maintenanceRecords, operationalRecords, dateFrom, dateTo, plateCategoryMap]);

  const categories = useMemo(() =>
    ['Todas', ...Array.from(new Set(allRecords.map((r) => r._cat))).sort()],
    [allRecords]
  );

  const filtered = useMemo(() =>
    filterCategory === 'Todas' ? allRecords : allRecords.filter((r) => r._cat === filterCategory),
    [allRecords, filterCategory]
  );

  // Aggregate by category
  const byCat = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      const k = r._cat;
      if (!map[k]) map[k] = { name: k, qty: 0, fuel: 0, maint: 0, op: 0, total: 0 };
      map[k].qty++;
      map[k].total += r.total_value || 0;
      if (r._type === 'Abastecimento') map[k].fuel += r.total_value || 0;
      if (r._type === 'Manutenção') map[k].maint += r.total_value || 0;
      if (r._type === 'Operacional') map[k].op += r.total_value || 0;
    });
    const total = Object.values(map).reduce((s, v) => s + v.total, 0);
    return Object.values(map)
      .map((v) => ({ ...v, pct: total > 0 ? (v.total / total * 100).toFixed(1) : '0.0' }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const grandTotal = useMemo(() => filtered.reduce((s, r) => s + (r.total_value || 0), 0), [filtered]);
  const grandQty = filtered.length;

  const pieData = byCat.map((c) => ({ name: c.name, value: c.total }));

  // Drill-down: vehicles in selected category
  const drillData = useMemo(() => {
    if (!selectedCategory) return [];
    const recs = filtered.filter((r) => r._cat === selectedCategory);
    const map = {};
    recs.forEach((r) => {
      const plate = r.plate || 'Sem Placa';
      if (!map[plate]) map[plate] = { name: plate, model: plateModelMap[plate] || r.vehicle_model || '', Abastecimento: 0, Manutenção: 0, Operacional: 0, total: 0 };
      if (!map[plate].model && r.vehicle_model) map[plate].model = r.vehicle_model;
      map[plate][r._type] = (map[plate][r._type] || 0) + (r.total_value || 0);
      map[plate].total += r.total_value || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 20);
  }, [filtered, selectedCategory]);

  const clearFilters = () => {
    setFilterCategory('Todas');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Custos Totais por Categoria</h3>
            <p className="text-xs text-slate-400 mt-0.5">Abastecimento + Manutenção + Operacional</p>
          </div>
          <button onClick={() => setExpanded(true)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <Filter className="w-4 h-4 text-slate-400 self-center" />
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Categoria</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1.5 outline-none"
            >
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">De</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1.5 outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Até</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1.5 outline-none" />
          </div>
          <button onClick={clearFilters}
            className="px-3 py-1.5 rounded-lg bg-slate-200 text-xs text-slate-700 hover:bg-slate-300 transition-colors">
            Limpar
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Pie Chart */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-semibold">Total</span>
                <span className="text-xs font-extrabold text-slate-800 text-center leading-tight">{fmtCompact(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2 px-2 text-left text-slate-500 font-semibold uppercase tracking-wider">Categoria</th>
                  <th className="py-2 px-2 text-right text-slate-500 font-semibold uppercase tracking-wider">Qtd</th>
                  <th className="py-2 px-2 text-right text-slate-500 font-semibold uppercase tracking-wider">Custo Total (R$)</th>
                  <th className="py-2 px-2 text-right text-slate-500 font-semibold uppercase tracking-wider">% do Total</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {byCat.map((row, i) => (
                  <tr key={row.name}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedCategory(row.name)}>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-slate-700 font-medium">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600">{row.qty}</td>
                    <td className="py-2 px-2 text-right text-slate-800 font-bold">{row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-2 text-right text-slate-500">{row.pct}%</td>
                    <td className="py-2 px-2 text-slate-400"><ChevronRight className="w-3.5 h-3.5" /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td className="py-2 px-2 font-bold text-slate-800">TOTAL</td>
                  <td className="py-2 px-2 text-right font-bold text-slate-800">{grandQty}</td>
                  <td className="py-2 px-2 text-right font-bold text-slate-800">{grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="py-2 px-2 text-right font-bold text-slate-800">100%</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setExpanded(false)}>
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Custos Totais por Categoria</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Abastecimento + Manutenção + Operacional</p>
                </div>
                <button onClick={() => setExpanded(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-end p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Filter className="w-4 h-4 text-slate-400 self-center" />
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Categoria</label>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                      className="text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1.5 outline-none">
                      {categories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">De</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                      className="text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1.5 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Até</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                      className="text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1.5 outline-none" />
                  </div>
                  <button onClick={clearFilters}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 text-xs text-slate-700 hover:bg-slate-300 transition-colors">
                    Limpar
                  </button>
                </div>
                {/* Content */}
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="relative w-56 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-slate-400 font-semibold">Total</span>
                        <span className="text-sm font-extrabold text-slate-800 text-center leading-tight">{fmtCompact(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="py-2 px-2 text-left text-slate-500 font-semibold uppercase tracking-wider">Categoria</th>
                          <th className="py-2 px-2 text-right text-slate-500 font-semibold uppercase tracking-wider">Qtd</th>
                          <th className="py-2 px-2 text-right text-slate-500 font-semibold uppercase tracking-wider">Custo Total (R$)</th>
                          <th className="py-2 px-2 text-right text-slate-500 font-semibold uppercase tracking-wider">% do Total</th>
                          <th className="py-2 px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {byCat.map((row, i) => (
                          <tr key={row.name}
                            className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => setSelectedCategory(row.name)}>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                <span className="text-slate-700 font-medium">{row.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right text-slate-600">{row.qty}</td>
                            <td className="py-2 px-2 text-right text-slate-800 font-bold">{row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 px-2 text-right text-slate-500">{row.pct}%</td>
                            <td className="py-2 px-2 text-slate-400"><ChevronRight className="w-3.5 h-3.5" /></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200">
                          <td className="py-2 px-2 font-bold text-slate-800">TOTAL</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-800">{grandQty}</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-800">{grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-800">100%</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drill-Down Modal */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setSelectedCategory(null)}>
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between z-10">
                <div>
                  <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Detalhes — {selectedCategory}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Custos por veículo (placa)</p>
                </div>
                <button onClick={() => setSelectedCategory(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Stacked Bar Chart */}
                <div style={{ height: Math.max(250, drillData.length * 36) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={drillData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<DrillDownTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Abastecimento" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Manutenção" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Operacional" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Detail Table */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-2 px-2 text-left text-slate-500 font-semibold uppercase tracking-wider">Placa</th>
                      <th className="py-2 px-2 text-right text-amber-600 font-semibold uppercase tracking-wider">Abastecimento</th>
                      <th className="py-2 px-2 text-right text-red-500 font-semibold uppercase tracking-wider">Manutenção</th>
                      <th className="py-2 px-2 text-right text-emerald-600 font-semibold uppercase tracking-wider">Operacional</th>
                      <th className="py-2 px-2 text-right text-slate-700 font-semibold uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillData.map((row) => (
                      <tr key={row.name} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-2">
                          <div className="font-bold text-slate-800 text-xs">{row.name}</div>
                          {row.model && <div className="text-[10px] text-slate-400 leading-tight">{row.model}</div>}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600">{fmt(row.Abastecimento)}</td>
                        <td className="py-2 px-2 text-right text-slate-600">{fmt(row.Manutenção)}</td>
                        <td className="py-2 px-2 text-right text-slate-600">{fmt(row.Operacional)}</td>
                        <td className="py-2 px-2 text-right font-bold text-slate-800">{fmt(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200">
                      <td className="py-2 px-2 font-bold text-slate-800">TOTAL</td>
                      <td className="py-2 px-2 text-right font-bold text-amber-600">{fmt(drillData.reduce((s, r) => s + r.Abastecimento, 0))}</td>
                      <td className="py-2 px-2 text-right font-bold text-red-500">{fmt(drillData.reduce((s, r) => s + r.Manutenção, 0))}</td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-600">{fmt(drillData.reduce((s, r) => s + r.Operacional, 0))}</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-800">{fmt(drillData.reduce((s, r) => s + r.total, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}