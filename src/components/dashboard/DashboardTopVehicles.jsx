import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Maximize2, X, ChevronRight, Fuel, Wrench, Settings2, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0);
const fmtFull = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function PlateDetail({ vehicle, fuelRecords, maintenanceRecords, operationalRecords, onBack }) {
  const plate = vehicle.plate;

  // All records for this plate
  const fuelList = fuelRecords.filter((r) => r.plate === plate);
  const maintList = maintenanceRecords.filter((r) => r.plate === plate);
  const opList = operationalRecords.filter((r) => r.plate === plate);

  // Breakdown by cost_name / cost_type / classification
  const fuelByType = useMemo(() => {
    const map = {};
    fuelList.forEach((r) => {
      const k = r.cost_type || r.cost_name || 'Outros';
      map[k] = (map[k] || 0) + (r.total_value || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [fuelList]);

  const maintByType = useMemo(() => {
    const map = {};
    maintList.forEach((r) => {
      const k = r.cost_type || r.cost_group || 'Outros';
      map[k] = (map[k] || 0) + (r.total_value || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [maintList]);

  const opByType = useMemo(() => {
    const map = {};
    opList.forEach((r) => {
      const k = r.cost_name || 'Outros';
      map[k] = (map[k] || 0) + (r.total_value || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [opList]);

  const totalFuel = fuelList.reduce((s, r) => s + (r.total_value || 0), 0);
  const totalMaint = maintList.reduce((s, r) => s + (r.total_value || 0), 0);
  const totalOp = opList.reduce((s, r) => s + (r.total_value || 0), 0);
  const grandTotal = totalFuel + totalMaint + totalOp;

  const chartData = [
  { name: 'Abastecimento', value: totalFuel, color: '#f59e0b' },
  { name: 'Manutenção', value: totalMaint, color: '#ef4444' },
  { name: 'Operacional', value: totalOp, color: '#10b981' }].
  filter((d) => d.value > 0);

  const Section = ({ icon: Icon, color, bg, title, total, breakdown }) =>
  breakdown.length === 0 ? null :
  <div className={`rounded-xl border p-4 ${bg}`}>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title}</span>
          <span className="ml-auto text-sm font-extrabold text-slate-800">{fmtFull(total)}</span>
        </div>
        <div className="space-y-2">
          {breakdown.map((b) =>
      <div key={b.name} className="flex items-center gap-2">
              <span className="text-xs text-slate-600 flex-1 truncate">{b.name}</span>
              <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div style={{ width: `${total > 0 ? b.value / total * 100 : 0}%` }} className={`h-full rounded-full`} style={{ width: `${total > 0 ? b.value / total * 100 : 0}%`, backgroundColor: color.includes('amber') ? '#f59e0b' : color.includes('red') ? '#ef4444' : '#10b981' }} />
              </div>
              <span className="text-xs font-bold text-slate-700 w-24 text-right">{fmtFull(b.value)}</span>
            </div>
      )}
        </div>
      </div>;



  return (
    <div>
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-500" />
          <div>
            <div className="text-sm font-bold text-slate-800">{plate}</div>
            {vehicle.model && <div className="text-[10px] text-slate-400">{vehicle.model}</div>}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Geral</div>
          <div className="text-base font-extrabold text-slate-900">{fmtFull(grandTotal)}</div>
        </div>
      </div>

      {/* Bar chart overview */}
      {chartData.length > 0 &&
      <div className="mb-5 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={40}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => fmtFull(v)} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      }

      {/* Breakdowns */}
      <div className="space-y-3">
        {totalFuel > 0 &&
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Fuel className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Abastecimento</span>
              <span className="ml-auto text-sm font-extrabold text-slate-800">{fmtFull(totalFuel)}</span>
            </div>
            <div className="space-y-1.5">
              {fuelByType.map((b) =>
            <div key={b.name} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 flex-1 truncate">{b.name}</span>
                  <div className="w-20 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                    <div style={{ width: `${totalFuel > 0 ? b.value / totalFuel * 100 : 0}%`, backgroundColor: '#f59e0b' }} className="h-full rounded-full" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-24 text-right">{fmtFull(b.value)}</span>
                </div>
            )}
            </div>
          </div>
        }

        {totalMaint > 0 &&
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-red-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-700">Manutenção</span>
              <span className="ml-auto text-sm font-extrabold text-slate-800">{fmtFull(totalMaint)}</span>
            </div>
            <div className="space-y-1.5">
              {maintByType.map((b) =>
            <div key={b.name} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 flex-1 truncate">{b.name}</span>
                  <div className="w-20 h-1.5 bg-red-200 rounded-full overflow-hidden">
                    <div style={{ width: `${totalMaint > 0 ? b.value / totalMaint * 100 : 0}%`, backgroundColor: '#ef4444' }} className="h-full rounded-full" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-24 text-right">{fmtFull(b.value)}</span>
                </div>
            )}
            </div>
          </div>
        }

        {totalOp > 0 &&
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Operacional</span>
              <span className="ml-auto text-sm font-extrabold text-slate-800">{fmtFull(totalOp)}</span>
            </div>
            <div className="space-y-1.5">
              {opByType.map((b) =>
            <div key={b.name} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 flex-1 truncate">{b.name}</span>
                  <div className="w-20 h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                    <div style={{ width: `${totalOp > 0 ? b.value / totalOp * 100 : 0}%`, backgroundColor: '#10b981' }} className="h-full rounded-full" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-24 text-right">{fmtFull(b.value)}</span>
                </div>
            )}
            </div>
          </div>
        }

        {grandTotal === 0 &&
        <div className="text-center text-slate-400 text-sm py-6">Nenhum custo registrado para esta placa</div>
        }
      </div>
    </div>);

}

export default function DashboardTopVehicles({ fuelRecords, maintenanceRecords, operationalRecords = [], vehicles = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedPlate, setSelectedPlate] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const inPeriod = (dateStr) => {
    if (!dateStr) return false;
    const d = dateStr.slice(0, 10);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  const filteredFuel = fuelRecords.filter((r) => inPeriod(r.date));
  const filteredMaint = maintenanceRecords.filter((r) => inPeriod(r.date));
  const filteredOp = operationalRecords.filter((r) => inPeriod(r.date));

  const plateModelMap = {};
  vehicles.forEach((v) => {if (v.plate) plateModelMap[v.plate] = v.vehicle_model || '';});

  const byPlate = {};
  filteredFuel.forEach((r) => {
    if (!r.plate || r.plate === '00000') return;
    if (!byPlate[r.plate]) byPlate[r.plate] = { plate: r.plate, model: plateModelMap[r.plate] || r.vehicle_model || '', fuel: 0, maint: 0, op: 0 };
    byPlate[r.plate].fuel += r.total_value || 0;
  });
  filteredMaint.forEach((r) => {
    if (!r.plate) return;
    if (!byPlate[r.plate]) byPlate[r.plate] = { plate: r.plate, model: plateModelMap[r.plate] || r.vehicle_model || '', fuel: 0, maint: 0, op: 0 };
    if (!byPlate[r.plate].model) byPlate[r.plate].model = plateModelMap[r.plate] || r.vehicle_model || '';
    byPlate[r.plate].maint += r.total_value || 0;
  });
  filteredOp.forEach((r) => {
    if (!r.plate) return;
    if (!byPlate[r.plate]) byPlate[r.plate] = { plate: r.plate, model: plateModelMap[r.plate] || r.vehicle_model || '', fuel: 0, maint: 0, op: 0 };
    if (!byPlate[r.plate].model) byPlate[r.plate].model = plateModelMap[r.plate] || r.vehicle_model || '';
    byPlate[r.plate].op = (byPlate[r.plate].op || 0) + (r.total_value || 0);
  });

  const topList = Object.values(byPlate).
  map((v) => ({ ...v, total: v.fuel + v.maint + (v.op || 0) })).
  sort((a, b) => b.total - a.total);

  const previewList = topList.slice(0, 6);
  const max = topList[0]?.total || 1;

  const selectedVehicle = selectedPlate ? topList.find((v) => v.plate === selectedPlate) : null;

  const VehicleRow = ({ v, i, onClick }) =>
  <div key={v.plate} className="group cursor-pointer" onClick={onClick}>
      <div className="flex items-center gap-3 mb-1 hover:bg-slate-50 rounded-lg px-1 py-0.5 transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
          <Truck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-700 truncate">{v.plate}</div>
            {v.model && <div className="text-[10px] text-slate-400 leading-tight truncate">{v.model}</div>}
          </div>
        </div>
        <span className="text-xs font-extrabold text-slate-800 flex-shrink-0">{fmt(v.total)}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-7">
        <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${v.total / max * 100}%` }}
        transition={{ delay: 0.6 + i * 0.05, duration: 0.5 }}
        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
      
      </div>
    </div>;


  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">CUSTOS POR VEÍCULOS</h3>
            <p className="text-xs text-slate-400 mt-0.5">Clique em uma placa para ver o detalhamento</p>
          </div>
          <button onClick={() => setExpanded(true)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Período</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs px-2 py-1 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 text-slate-600"
          />
          <span className="text-xs text-slate-300">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs px-2 py-1 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 text-slate-600"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-[10px] text-slate-400 hover:text-red-500 font-semibold transition-colors"
            >
              Limpar
            </button>
          )}
        </div>

        {topList.length === 0 ?
        <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Nenhum dado disponível</div> :

        <div className="space-y-3">
            {previewList.map((v, i) =>
          <VehicleRow key={v.plate} v={v} i={i} onClick={() => {setSelectedPlate(v.plate);setExpanded(true);}} />
          )}
          </div>
        }
      </motion.div>

      <AnimatePresence>
        {expanded &&
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
        onClick={() => {setExpanded(false);setSelectedPlate(null);}}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">

              <AnimatePresence mode="wait">
                {selectedVehicle ?
              <motion.div key="detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                    <PlateDetail
                  vehicle={selectedVehicle}
                  fuelRecords={filteredFuel}
                  maintenanceRecords={filteredMaint}
                  operationalRecords={filteredOp}
                  onBack={() => setSelectedPlate(null)} />
                
                  </motion.div> :

              <motion.div key="list" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 uppercase tracking-widest">Top Veículos por Custo</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Clique em uma placa para ver o detalhamento</p>
                      </div>
                      <button onClick={() => {setExpanded(false);setSelectedPlate(null);}} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {topList.length === 0 ?
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Nenhum dado disponível</div> :

                <div className="space-y-4">
                        {topList.map((v, i) =>
                  <VehicleRow key={v.plate} v={v} i={i} onClick={() => setSelectedPlate(v.plate)} />
                  )}
                      </div>
                }
                  </motion.div>
              }
              </AnimatePresence>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </>);

}