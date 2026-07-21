import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtPct = (v, total) => total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '0%';

export default function PlatesSummaryTable({ filtered }) {
  const [sortKey, setSortKey] = useState('total');
  const [sortDir, setSortDir] = useState('desc');

  const byPlate = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const plate = r.plate || 'Sem placa';
      if (!map[plate]) map[plate] = { plate, model: r.vehicle_model || '', fuel: 0, maint: 0, op: 0, total: 0, count: 0 };
      if (!map[plate].model && r.vehicle_model) map[plate].model = r.vehicle_model;
      const val = r.total_value || 0;
      map[plate].total += val;
      map[plate].count++;
      if (r._type === 'Abastecimento') map[plate].fuel += val;
      else if (r._type === 'Manutenção') map[plate].maint += val;
      else if (r._type === 'Operacional') map[plate].op += val;
    });
    return Object.values(map);
  }, [filtered]);

  const grandTotal = useMemo(() => byPlate.reduce((s, p) => s + p.total, 0), [byPlate]);

  const sorted = useMemo(() => {
    return [...byPlate].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [byPlate, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />;
  };

  const cols = [
    { key: 'plate', label: 'Placa' },
    { key: 'count', label: 'Lançamentos' },
    { key: 'fuel', label: 'Abastecimento' },
    { key: 'maint', label: 'Manutenção' },
    { key: 'op', label: 'Operacional' },
    { key: 'total', label: 'Total' },
    { key: '_pct', label: '% do Total' },
  ];

  if (byPlate.length === 0) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Resumo por Placa</h3>
        <p className="text-xs text-slate-400 mt-0.5">{sorted.length} placa(s) · Total consolidado: <span className="font-bold text-slate-700">{fmt(grandTotal)}</span></p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              {cols.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.key !== '_pct' && toggleSort(col.key)}
                  className={`py-2 px-3 text-left text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap select-none ${col.key !== '_pct' ? 'cursor-pointer hover:text-slate-700' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.key !== '_pct' && <SortIcon col={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                <td className="py-2.5 px-3">
                  <span className="font-mono font-bold text-slate-800 block">{row.plate}</span>
                  {row.model && <span className="text-[10px] text-slate-400 block leading-tight">{row.model}</span>}
                </td>
                <td className="py-2.5 px-3 text-slate-600 text-center">{row.count}</td>
                <td className="py-2.5 px-3 text-amber-700 font-semibold text-right">{fmt(row.fuel)}</td>
                <td className="py-2.5 px-3 text-red-700 font-semibold text-right">{fmt(row.maint)}</td>
                <td className="py-2.5 px-3 text-emerald-700 font-semibold text-right">{fmt(row.op)}</td>
                <td className="py-2.5 px-3 font-bold text-slate-900 text-right">{fmt(row.total)}</td>
                <td className="py-2.5 px-3 text-slate-500 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: fmtPct(row.total, grandTotal) }} />
                    </div>
                    <span>{fmtPct(row.total, grandTotal)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50">
              <td className="py-3 px-3 font-bold text-slate-900 uppercase text-xs tracking-wider">TOTAL GERAL</td>
              <td className="py-3 px-3 font-bold text-slate-900 text-center">{filtered.length}</td>
              <td className="py-3 px-3 font-bold text-amber-700 text-right">{fmt(byPlate.reduce((s, p) => s + p.fuel, 0))}</td>
              <td className="py-3 px-3 font-bold text-red-700 text-right">{fmt(byPlate.reduce((s, p) => s + p.maint, 0))}</td>
              <td className="py-3 px-3 font-bold text-emerald-700 text-right">{fmt(byPlate.reduce((s, p) => s + p.op, 0))}</td>
              <td className="py-3 px-3 font-bold text-slate-900 text-right">{fmt(grandTotal)}</td>
              <td className="py-3 px-3 font-bold text-slate-900 text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}