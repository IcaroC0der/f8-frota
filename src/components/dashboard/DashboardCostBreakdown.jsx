import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Maximize2, X } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
const pct = (v, t) => t > 0 ? ((v / t) * 100).toFixed(1) : '0.0';

const SEGMENTS = [
  { key: 'fuel', label: 'Abastecimento', color: '#f59e0b' },
  { key: 'maint', label: 'Manutenção', color: '#ef4444' },
  { key: 'op', label: 'Operacional', color: '#10b981' },
];

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

export default function DashboardCostBreakdown({ fuelTotal, maintTotal, opTotal }) {
  const [expanded, setExpanded] = useState(false);
  const total = fuelTotal + maintTotal + opTotal;
  const data = [
    { name: 'Abastecimento', value: fuelTotal, color: '#f59e0b' },
    { name: 'Manutenção', value: maintTotal, color: '#ef4444' },
    { name: 'Operacional', value: opTotal, color: '#10b981' },
  ].filter(d => d.value > 0);

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Composição de Custos</h3>
          <p className="text-xs text-slate-400 mt-0.5">Participação por categoria</p>
        </div>
        <button onClick={() => setExpanded(true)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Maximize2 className="w-4 h-4" /></button>
      </div>

      {total === 0 ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Nenhum dado disponível</div>
      ) : (
        <>
          <div className="flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={data} cx={75} cy={75} innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={3}>
                    {data.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-semibold">Total</span>
                <span className="text-sm font-extrabold text-slate-800">{fmt(total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {SEGMENTS.map(seg => {
              const val = seg.key === 'fuel' ? fuelTotal : seg.key === 'maint' ? maintTotal : opTotal;
              return (
                <div key={seg.key} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                  <span className="text-xs text-slate-600 flex-1">{seg.label}</span>
                  <span className="text-xs font-bold text-slate-800">{fmt(val)}</span>
                  <span className="text-xs text-slate-400 w-10 text-right">{pct(val, total)}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
            onClick={() => setExpanded(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800 uppercase tracking-widest">Composição de Custos</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Participação por categoria</p>
                </div>
                <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              {total === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Nenhum dado disponível</div>
              ) : (
                <>
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie data={data} cx={95} cy={95} innerRadius={65} outerRadius={88} dataKey="value" paddingAngle={3}>
                            {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-slate-400 font-semibold">Total</span>
                        <span className="text-base font-extrabold text-slate-800">{fmt(total)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {SEGMENTS.map(seg => {
                      const val = seg.key === 'fuel' ? fuelTotal : seg.key === 'maint' ? maintTotal : opTotal;
                      return (
                        <div key={seg.key} className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                          <span className="text-sm text-slate-600 flex-1">{seg.label}</span>
                          <span className="text-sm font-bold text-slate-800">{fmt(val)}</span>
                          <span className="text-sm text-slate-400 w-12 text-right">{pct(val, total)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}