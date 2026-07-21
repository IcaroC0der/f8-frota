import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LabelList } from 'recharts';
import { Maximize2, X, Calendar } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const fmtCompact = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-slate-300 font-semibold mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardCostComparison({ fuelRecords, maintenanceRecords, operationalRecords }) {
  const [expanded, setExpanded] = useState(false);
  const now = new Date();
  const [selectedCurrentMonth, setSelectedCurrentMonth] = useState(now.getMonth());
  const [selectedCurrentYear, setSelectedCurrentYear] = useState(now.getFullYear());
  const [selectedPreviousMonth, setSelectedPreviousMonth] = useState(now.getMonth() - 1);
  const [selectedPreviousYear, setSelectedPreviousYear] = useState(now.getMonth() - 1 < 0 ? now.getFullYear() - 1 : now.getFullYear());

  const { current, previous, periodLabels } = useMemo(() => {
    const currentStart = new Date(selectedCurrentYear, selectedCurrentMonth, 1).toISOString().split('T')[0];
    const currentEnd = new Date(selectedCurrentYear, selectedCurrentMonth + 1, 0).toISOString().split('T')[0];
    const previousStart = new Date(selectedPreviousYear, selectedPreviousMonth, 1).toISOString().split('T')[0];
    const previousEnd = new Date(selectedPreviousYear, selectedPreviousMonth + 1, 0).toISOString().split('T')[0];

    const currentLabel = new Date(selectedCurrentYear, selectedCurrentMonth).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    const previousLabel = new Date(selectedPreviousYear, selectedPreviousMonth).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

    const filterByDate = (records, start, end) => records.filter(r => r.date && r.date >= start && r.date <= end);

    const calcTotals = (fuel, maint, op) => ({
      fuel: fuel.reduce((s, r) => s + (r.total_value || 0), 0),
      maint: maint.reduce((s, r) => s + (r.total_value || 0), 0),
      op: op.reduce((s, r) => s + (r.total_value || 0), 0),
    });

    const currentFuel = filterByDate(fuelRecords, currentStart, currentEnd);
    const currentMaint = filterByDate(maintenanceRecords, currentStart, currentEnd);
    const currentOp = filterByDate(operationalRecords, currentStart, currentEnd);

    const prevFuel = filterByDate(fuelRecords, previousStart, previousEnd);
    const prevMaint = filterByDate(maintenanceRecords, previousStart, previousEnd);
    const prevOp = filterByDate(operationalRecords, previousStart, previousEnd);

    return {
      current: calcTotals(currentFuel, currentMaint, currentOp),
      previous: calcTotals(prevFuel, prevMaint, prevOp),
      periodLabels: { current: currentLabel, previous: previousLabel },
    };
  }, [fuelRecords, maintenanceRecords, operationalRecords, selectedCurrentMonth, selectedCurrentYear, selectedPreviousMonth, selectedPreviousYear]);

  const data = [
    { name: 'Abastecimentos', atual: current.fuel, anterior: previous.fuel },
    { name: 'Manutenções', atual: current.maint, anterior: previous.maint },
    { name: 'Operacionais', atual: current.op, anterior: previous.op },
  ];

  const ChartContent = ({ height, expanded }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="atual" name={`Atual (${periodLabels.current})`} fill="#8b5cf6" radius={[6, 6, 0, 0]}>
          {expanded && <LabelList dataKey="atual" position="top" formatter={fmt} style={{ fontSize: 12, fontWeight: 700, fill: '#7c3aed' }} />}
        </Bar>
        <Bar dataKey="anterior" name={`Anterior (${periodLabels.previous})`} fill="#f59e0b" radius={[6, 6, 0, 0]}>
          {expanded && <LabelList dataKey="anterior" position="top" formatter={fmt} style={{ fontSize: 12, fontWeight: 700, fill: '#d97706' }} />}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">TOTAL POR CUSTO</h3>
            <p className="text-xs text-slate-400 mt-0.5">{periodLabels.previous} vs {periodLabels.current}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1" />
              <select
                value={selectedPreviousMonth}
                onChange={(e) => setSelectedPreviousMonth(Number(e.target.value))}
                className="text-xs bg-transparent text-slate-700 font-semibold outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{new Date(2024, i).toLocaleDateString('pt-BR', { month: 'short' })}</option>
                ))}
              </select>
              <select
                value={selectedPreviousYear}
                onChange={(e) => setSelectedPreviousYear(Number(e.target.value))}
                className="text-xs bg-transparent text-slate-700 font-semibold outline-none cursor-pointer"
              >
                {[now.getFullYear() - 1, now.getFullYear()].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <span className="text-slate-400 text-xs self-center">vs</span>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1" />
              <select
                value={selectedCurrentMonth}
                onChange={(e) => setSelectedCurrentMonth(Number(e.target.value))}
                className="text-xs bg-transparent text-slate-700 font-semibold outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{new Date(2024, i).toLocaleDateString('pt-BR', { month: 'short' })}</option>
                ))}
              </select>
              <select
                value={selectedCurrentYear}
                onChange={(e) => setSelectedCurrentYear(Number(e.target.value))}
                className="text-xs bg-transparent text-slate-700 font-semibold outline-none cursor-pointer"
              >
                {[now.getFullYear() - 1, now.getFullYear()].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={() => setExpanded(true)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <ChartContent height={240} expanded={false} />
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
            onClick={() => setExpanded(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800 uppercase tracking-widest">TOTAL POR CUSTO</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{periodLabels.previous} vs {periodLabels.current}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1" />
                    <select
                      value={selectedPreviousMonth}
                      onChange={(e) => setSelectedPreviousMonth(Number(e.target.value))}
                      className="text-xs bg-transparent text-slate-700 font-semibold outline-none cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>{new Date(2024, i).toLocaleDateString('pt-BR', { month: 'short' })}</option>
                      ))}
                    </select>
                    <select
                      value={selectedPreviousYear}
                      onChange={(e) => setSelectedPreviousYear(Number(e.target.value))}
                      className="text-xs bg-transparent text-slate-700 font-semibold outline-none cursor-pointer"
                    >
                      {[now.getFullYear() - 1, now.getFullYear()].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-slate-400 text-xs self-center">vs</span>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1" />
                    <select
                      value={selectedCurrentMonth}
                      onChange={(e) => setSelectedCurrentMonth(Number(e.target.value))}
                      className="text-xs bg-transparent text-slate-700 font-semibold outline-none cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>{new Date(2024, i).toLocaleDateString('pt-BR', { month: 'short' })}</option>
                      ))}
                    </select>
                    <select
                      value={selectedCurrentYear}
                      onChange={(e) => setSelectedCurrentYear(Number(e.target.value))}
                      className="text-xs bg-transparent text-slate-700 font-semibold outline-none cursor-pointer"
                    >
                      {[now.getFullYear() - 1, now.getFullYear()].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ChartContent height={420} expanded={true} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}