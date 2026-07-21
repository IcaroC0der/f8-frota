import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { X, Download, Loader2, FileBarChart } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, LabelList
} from 'recharts';
import { buildAnalisePDF } from './exportAnalisePDF';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
const fmtC = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

const TYPE_COLORS = { Abastecimento: '#f59e0b', Manutenção: '#ef4444', Operacional: '#10b981' };
const CAT_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#a78bfa'];

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', padding: 12, borderRadius: 12, fontSize: 12, border: '1px solid #475569' }}>
      {label && <div style={{ color: '#cbd5e1', fontWeight: 700, marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color || p.payload?.fill }} />
          <span style={{ color: '#94a3b8' }}>{p.name}:</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const PieTT = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: '#1e293b', padding: 12, borderRadius: 12, fontSize: 12, border: '1px solid #475569' }}>
      <div style={{ color: '#fff', fontWeight: 700 }}>{d.name}</div>
      <div style={{ color: '#cbd5e1' }}>{fmt(d.value)}</div>
      <div style={{ color: '#94a3b8' }}>{d.payload.pct}%</div>
    </div>
  );
};

export default function ExportAnalise({ open, onClose, filtered, allRecords, filters, vehicles }) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');

  const evolutionRef = useRef(null);
  const pieRef = useRef(null);
  const lineRef = useRef(null);
  const categoryRef = useRef(null);
  const supplierRef = useRef(null);

  const data = useMemo(() => {
    const total = filtered.reduce((s, r) => s + (r.total_value || 0), 0);
    const fuel = filtered.filter(r => r._type === 'Abastecimento').reduce((s, r) => s + (r.total_value || 0), 0);
    const maint = filtered.filter(r => r._type === 'Manutenção').reduce((s, r) => s + (r.total_value || 0), 0);
    const op = filtered.filter(r => r._type === 'Operacional').reduce((s, r) => s + (r.total_value || 0), 0);
    const count = filtered.length;

    const monthSet = new Set(filtered.map(r => r.date?.slice(0, 7)).filter(Boolean));
    const monthsCount = monthSet.size;
    const avgMonthly = monthsCount > 0 ? total / monthsCount : 0;

    const plateSet = new Set(filtered.map(r => r.plate).filter(Boolean));
    const vehicleCount = plateSet.size;
    const avgPerVehicle = vehicleCount > 0 ? total / vehicleCount : 0;

    const dates = filtered.map(r => r.date).filter(Boolean).sort();
    const from = filters.dateFrom || (dates[0] || '');
    const to = filters.dateTo || (dates[dates.length - 1] || '');
    const periodLabel = (from || to)
      ? `${from ? new Date(from + 'T00:00:00').toLocaleDateString('pt-BR') : 'Início'} a ${to ? new Date(to + 'T00:00:00').toLocaleDateString('pt-BR') : 'Atual'}`
      : 'Todos os períodos';

    const byType = [
      { name: 'Abastecimento', value: fuel, pct: total > 0 ? ((fuel / total) * 100).toFixed(1) : '0', color: [245, 158, 11] },
      { name: 'Manutenção', value: maint, pct: total > 0 ? ((maint / total) * 100).toFixed(1) : '0', color: [239, 68, 68] },
      { name: 'Operacional', value: op, pct: total > 0 ? ((op / total) * 100).toFixed(1) : '0', color: [16, 185, 129] },
    ].filter(t => t.value > 0);

    const byMonthMap = {};
    filtered.forEach(r => {
      if (!r.date) return;
      const key = r.date.slice(0, 7);
      const label = `${key.slice(5, 7)}/${key.slice(0, 4)}`;
      if (!byMonthMap[key]) byMonthMap[key] = { label, Abastecimento: 0, Manutenção: 0, Operacional: 0, total: 0 };
      byMonthMap[key][r._type] = (byMonthMap[key][r._type] || 0) + (r.total_value || 0);
      byMonthMap[key].total += r.total_value || 0;
    });
    const byMonth = Object.entries(byMonthMap).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);

    const catMap = {};
    filtered.forEach(r => {
      const k = r._category || 'Outros';
      catMap[k] = (catMap[k] || 0) + (r.total_value || 0);
    });
    const byCategory = Object.entries(catMap)
      .map(([name, value]) => ({ name, value, pct: total > 0 ? ((value / total) * 100).toFixed(1) : '0' }))
      .sort((a, b) => b.value - a.value);

    const supMap = {};
    filtered.forEach(r => {
      const k = r.supplier || 'Não informado';
      supMap[k] = (supMap[k] || 0) + (r.total_value || 0);
    });
    const bySupplier = Object.entries(supMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

    const costMap = {};
    filtered.forEach(r => {
      const k = r.cost_name || r.cost_type || r.classification || 'Outros';
      costMap[k] = (costMap[k] || 0) + (r.total_value || 0);
    });
    const byCostType = Object.entries(costMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const plateMap = {};
    filtered.forEach(r => {
      const plate = r.plate || 'Sem placa';
      if (!plateMap[plate]) plateMap[plate] = { plate, model: r.vehicle_model || '', category: r._category || '', fuel: 0, maint: 0, op: 0, total: 0, count: 0 };
      if (!plateMap[plate].model && r.vehicle_model) plateMap[plate].model = r.vehicle_model;
      if (!plateMap[plate].category && r._category) plateMap[plate].category = r._category;
      const val = r.total_value || 0;
      plateMap[plate].total += val;
      plateMap[plate].count++;
      if (r._type === 'Abastecimento') plateMap[plate].fuel += val;
      else if (r._type === 'Manutenção') plateMap[plate].maint += val;
      else if (r._type === 'Operacional') plateMap[plate].op += val;
    });
    const byPlate = Object.values(plateMap).sort((a, b) => b.total - a.total);
    const topVehicles = [...byPlate].slice(0, 10);
    const bottomVehicles = byPlate.length > 10 ? [...byPlate].slice(-10).reverse() : [];

    return {
      kpis: { total, fuel, maint, op, count, monthsCount, vehicleCount, avgPerVehicle, avgMonthly },
      period: { from, to, label: periodLabel },
      byType, byMonth, byCategory, bySupplier, byCostType, byPlate, topVehicles, bottomVehicles,
    };
  }, [filtered, filters]);

  const captureChart = async (ref) => {
    if (!ref.current) return null;
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      width: ref.current.offsetWidth,
      height: ref.current.offsetHeight,
    });
    return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      setProgress('Renderizando gráficos...');
      await new Promise(r => setTimeout(r, 1200));

      setProgress('Capturando evolução mensal...');
      const evolution = await captureChart(evolutionRef);
      await new Promise(r => setTimeout(r, 300));

      setProgress('Capturando distribuição por tipo...');
      const pie = await captureChart(pieRef);
      await new Promise(r => setTimeout(r, 300));

      setProgress('Capturando evolução do total...');
      const line = await captureChart(lineRef);
      await new Promise(r => setTimeout(r, 300));

      setProgress('Capturando categorias...');
      const category = await captureChart(categoryRef);
      await new Promise(r => setTimeout(r, 300));

      setProgress('Capturando fornecedores...');
      const supplier = await captureChart(supplierRef);
      await new Promise(r => setTimeout(r, 300));

      setProgress('Gerando PDF...');
      await new Promise(r => setTimeout(r, 200));
      const doc = buildAnalisePDF({ chartImages: { evolution, pie, line, category, supplier }, data, filters });
      doc.save(`analise-despesas-frota-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('Erro ao exportar:', e);
    }
    setExporting(false);
    setProgress('');
  };

  const titleStyle = { fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 };
  const subStyle = { fontSize: 11, color: '#94a3b8', marginBottom: 12 };

  return (
    <>
      {/* Hidden chart rendering area (off-screen) */}
      <div style={{ position: 'fixed', left: -10000, top: 0, width: 1000, background: '#fff' }}>
        {/* Evolution by type */}
        <div ref={evolutionRef} style={{ width: 1000, padding: 24, background: '#fff' }}>
          <div style={titleStyle}>Evolução Mensal por Tipo</div>
          <div style={subStyle}>Barras empilhadas com totais por mês</div>
          {data.byMonth.length > 0 && (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={data.byMonth} margin={{ top: 30, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtC} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TT />} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="Abastecimento" stackId="a" fill={TYPE_COLORS.Abastecimento} name="Abastecimento" />
                <Bar dataKey="Manutenção" stackId="a" fill={TYPE_COLORS.Manutenção} name="Manutenção" />
                <Bar dataKey="Operacional" stackId="a" fill={TYPE_COLORS.Operacional} name="Operacional" radius={[4, 4, 0, 0]}>
                  <LabelList
                    position="top"
                    valueAccessor={(entry) => entry.Abastecimento + entry.Manutenção + entry.Operacional}
                    formatter={(v) => fmtC(v)}
                    style={{ fontSize: 15, fill: '#0f172a', fontWeight: 800 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie */}
        <div ref={pieRef} style={{ width: 1000, padding: 24, background: '#fff' }}>
          <div style={titleStyle}>Distribuição por Tipo de Custo</div>
          <div style={subStyle}>Participação percentual com valores</div>
          {data.byType.length > 0 && (
            <ResponsiveContainer width="100%" height={380}>
              <PieChart>
                <Pie
                  data={data.byType}
                  cx="50%"
                  cy="50%"
                  outerRadius={140}
                  innerRadius={70}
                  dataKey="value"
                  paddingAngle={3}
                  label={({ name, pct }) => `${name}: ${pct}%`}
                  labelLine={{ stroke: '#cbd5e1' }}
                >
                  {data.byType.map((d, i) => (
                    <Cell key={i} fill={TYPE_COLORS[d.name] || CAT_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTT />} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line */}
        <div ref={lineRef} style={{ width: 1000, padding: 24, background: '#fff' }}>
          <div style={titleStyle}>Evolução do Custo Total</div>
          <div style={subStyle}>Tendência mensal com valores nos pontos</div>
          {data.byMonth.length > 0 && (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.byMonth} margin={{ top: 30, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtC} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TT />} />
                <Line type="monotone" dataKey="total" name="Total" stroke="#6366f1" strokeWidth={3} dot={{ r: 6, fill: '#6366f1' }} activeDot={{ r: 8 }}>
                  <LabelList dataKey="total" position="top" formatter={(v) => fmtC(v)} style={{ fontSize: 14, fill: '#1e293b', fontWeight: 800 }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By category */}
        <div ref={categoryRef} style={{ width: 1000, padding: 24, background: '#fff' }}>
          <div style={titleStyle}>Despesas por Categoria de Veículo</div>
          <div style={subStyle}>Categorias com valores e percentuais</div>
          {data.byCategory.length > 0 && (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.byCategory} layout="vertical" margin={{ top: 10, right: 50, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtC} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TT />} />
                <Bar dataKey="value" name="Valor" radius={[0, 4, 4, 0]}>
                  {data.byCategory.map((_, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                  <LabelList dataKey="value" position="right" formatter={(v) => fmtC(v)} style={{ fontSize: 11, fill: '#1e293b', fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By supplier */}
        <div ref={supplierRef} style={{ width: 1000, padding: 24, background: '#fff' }}>
          <div style={titleStyle}>Top 10 Fornecedores</div>
          <div style={subStyle}>Maiores despesas por fornecedor com valores</div>
          {data.bySupplier.length > 0 && (
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={data.bySupplier} layout="vertical" margin={{ top: 10, right: 50, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtC} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={280} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<TT />} />
                <Bar dataKey="value" name="Valor" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="value" position="right" formatter={(v) => fmtC(v)} style={{ fontSize: 11, fill: '#1e293b', fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
            onClick={exporting ? undefined : onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
            >
              {!exporting ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg">
                        <FileBarChart className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">Exportar Análise</h3>
                        <p className="text-xs text-slate-400">PDF gerencial completo com gráficos e tabelas</p>
                      </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2 mb-5">
                    <p className="text-sm font-semibold text-slate-700">O documento incluirá:</p>
                    {[
                      'Capa com período e filtros aplicados',
                      'Resumo executivo com KPIs',
                      'Gráficos em alta qualidade com valores',
                      'Comparativo entre períodos',
                      'Ranking de veículos (maiores/menores)',
                      'Custo por veículo e fornecedor',
                      'Rodapé com data/hora e numeração de páginas',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 mb-5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-2">Filtros atuais</p>
                    <p className="text-xs text-slate-600">
                      {data.period.label}
                      {filters.type !== 'Todos' && ` · Tipo: ${filters.type}`}
                      {filters.category !== 'Todos' && ` · Categoria: ${filters.category}`}
                      {filters.plates?.length ? ` · ${filters.plates.length} placa(s)` : ''}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleExport}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-500 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
                    >
                      <Download className="w-4 h-4" /> Gerar PDF
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-8 flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                  <p className="text-sm font-semibold text-slate-700">{progress}</p>
                  <p className="text-xs text-slate-400">Aguarde, gerando documento profissional...</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}