import React from 'react';
import { Filter } from 'lucide-react';
import PlateMultiSelect from './PlateMultiSelect';

export default function RelatorioFilters({ filters, setFilters, options }) {
  const { categories, suppliers, plates, types, costNames } = options;

  const set = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const selectClass = "text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all";
  const inputClass = "text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all";

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Filtros</span>
      </div>
      <div className="flex flex-wrap gap-4 items-start">
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Período — De</label>
          <input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Período — Até</label>
          <input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Tipo de Custo</label>
          <select value={filters.type} onChange={e => set('type', e.target.value)} className={selectClass}>
            {types.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Categoria</label>
          <select value={filters.category} onChange={e => set('category', e.target.value)} className={selectClass}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Fornecedor</label>
          <select value={filters.supplier} onChange={e => set('supplier', e.target.value)} className={selectClass}>
            {suppliers.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Custo / Classificação</label>
          <select value={filters.costName || 'Todos'} onChange={e => set('costName', e.target.value)} className={selectClass}>
            {(costNames || ['Todos']).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <PlateMultiSelect
          plates={plates || []}
          selectedPlates={filters.plates || []}
          onChange={(val) => set('plates', val)}
        />
      </div>
    </div>
  );
}