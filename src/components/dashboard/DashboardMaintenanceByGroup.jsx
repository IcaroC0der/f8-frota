import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Maximize2, X, ArrowLeft } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);
const fmtFull = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-slate-300 font-semibold mb-1">{label}</p>
      <p className="text-white font-bold">{fmt(payload[0].value)}</p>
      <p className="text-slate-400 mt-0.5 text-[10px]">Clique para ver detalhes</p>
    </div>
  );
};

function GroupDetail({ group, color, maintenanceRecords, onBack }) {
  const records = maintenanceRecords.filter(r => (r.cost_group || 'Outros') === group);
  const total = records.reduce((s, r) => s + (r.total_value || 0), 0);

  const byCostType = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const k = r.cost_type || 'Outros';
      if (!map[k]) map[k] = { name: k, value: 0, count: 0 };
      map[k].value += r.total_value || 0;
      map[k].count++;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [records]);

  return (
    <div>
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="text-sm font-bold text-slate-800">{group}</div>
          <div className="text-[10px] text-slate-400">Detalhamento por tipo de custo</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total</div>
          <div className="text-base font-extrabold text-slate-900">{fmtFull(total)}</div>
        </div>
      </div>

      {/* Table breakdown */}
      <div className="rounded-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 flex text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <span className="flex-1">Tipo de Custo</span>
          <span className="w-16 text-right">Lançtos</span>
          <span className="w-28 text-right">Total</span>
          <span className="w-16 text-right">%</span>
        </div>
        {byCostType.map((ct, i) => (
          <div key={ct.name} className={`px-4 py-2.5 flex items-center gap-2 border-t border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="flex-1 text-xs text-slate-700 font-medium truncate">{ct.name}</span>
            <span className="w-16 text-right text-xs text-slate-500">{ct.count}</span>
            <span className="w-28 text-right text-xs font-bold text-slate-800">{fmtFull(ct.value)}</span>
            <span className="w-16 text-right text-xs text-slate-400">{total > 0 ? ((ct.value / total) * 100).toFixed(1) : 0}%</span>
          </div>
        ))}
        <div className="px-4 py-2.5 flex items-center bg-slate-100 border-t border-slate-200">
          <span className="flex-1 text-xs font-bold text-slate-700 uppercase">Total</span>
          <span className="w-16 text-right text-xs font-bold text-slate-700">{records.length}</span>
          <span className="w-28 text-right text-xs font-bold text-slate-900">{fmtFull(total)}</span>
          <span className="w-16 text-right text-xs font-bold text-slate-500">100%</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardMaintenanceByGroup({ maintenanceRecords }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const byGroup = {};
  maintenanceRecords.forEach(r => {
    const g = r.cost_group || 'Outros';
    byGroup[g] = (byGroup[g] || 0) + (r.total_value || 0);
  });

  const data = Object.entries(byGroup)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const handleBarClick = (entry) => {
    if (entry?.activePayload?.[0]) {
      setSelectedGroup(entry.activePayload[0].payload.name);
      setExpanded(true);
    }
  };

  const selectedColor = selectedGroup ? COLORS[data.findIndex(d => d.name === selectedGroup) % COLORS.length] : COLORS[0];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Manutenção por Grupo</h3>
            <p className="text-xs text-slate-400 mt-0.5">Clique numa barra para ver o detalhamento</p>
          </div>
          <button onClick={() => { setSelectedGroup(null); setExpanded(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Nenhum dado disponível</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 24, right: 4, left: 0, bottom: 0 }} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#000000', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#000000', fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                <LabelList dataKey="value" position="top" formatter={(v) => fmt(v)} style={{ fontSize: 10, fontWeight: 700, fill: '#000000' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
            onClick={() => { setExpanded(false); setSelectedGroup(null); }}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">

              <AnimatePresence mode="wait">
                {selectedGroup ? (
                  <motion.div key="detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                    <GroupDetail
                      group={selectedGroup}
                      color={selectedColor}
                      maintenanceRecords={maintenanceRecords}
                      onBack={() => setSelectedGroup(null)}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="list" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 uppercase tracking-widest">Manutenção por Grupo</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Clique numa barra para ver o detalhamento por tipo de custo</p>
                      </div>
                      <button onClick={() => { setExpanded(false); setSelectedGroup(null); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {data.length === 0 ? (
                      <div className="h-80 flex items-center justify-center text-slate-400 text-sm">Nenhum dado disponível</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={380}>
                        <BarChart data={data} margin={{ top: 28, right: 4, left: 0, bottom: 0 }}
                          onClick={(e) => { if (e?.activePayload?.[0]) setSelectedGroup(e.activePayload[0].payload.name); }}
                          style={{ cursor: 'pointer' }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#000000', fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#000000', fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            <LabelList dataKey="value" position="top" formatter={(v) => fmt(v)} style={{ fontSize: 11, fontWeight: 700, fill: '#000000' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}