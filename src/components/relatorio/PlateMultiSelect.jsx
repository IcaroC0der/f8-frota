import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check, Search } from 'lucide-react';

export default function PlateMultiSelect({ plates = [], selectedPlates, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allSelected = selectedPlates.length === 0;
  const filtered = plates.filter(p => p.toLowerCase().includes(search.toLowerCase()));

  const toggle = (plate) => {
    if (selectedPlates.includes(plate)) {
      onChange(selectedPlates.filter(p => p !== plate));
    } else {
      onChange([...selectedPlates, plate]);
    }
  };

  const toggleAll = () => onChange([]);

  const label = allSelected
    ? 'Todas as placas'
    : selectedPlates.length === 1
    ? selectedPlates[0]
    : `${selectedPlates.length} placas selecionadas`;

  return (
    <div className="relative" ref={ref}>
      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Placa(s)</label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 border transition-all outline-none min-w-[160px] max-w-[260px] ${
          !allSelected
            ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
            : 'bg-white border-slate-200 text-slate-700'
        }`}
      >
        <span className="flex-1 text-left truncate">{label}</span>
        {!allSelected && (
          <span
            className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold shrink-0"
          >
            {selectedPlates.length}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Selected tags (compact, shown below trigger) */}
      {!allSelected && (
        <div className="flex flex-wrap gap-1 mt-1 max-w-[260px]">
          {selectedPlates.map(p => (
            <span key={p} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-semibold">
              {p}
              <button type="button" onClick={() => toggle(p)} className="hover:text-red-500 transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-56 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-100">
            <Search className="w-3 h-3 text-slate-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar placa..."
              className="flex-1 text-xs outline-none text-slate-700 placeholder-slate-400"
            />
          </div>

          {/* All option */}
          <button
            type="button"
            onClick={toggleAll}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors border-b border-slate-100 ${allSelected ? 'font-bold text-blue-600' : 'text-slate-600'}`}
          >
            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${allSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
              {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
            </span>
            Todas as placas
          </button>

          {/* Plate list */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">Nenhuma placa encontrada</p>
            ) : (
              filtered.map(plate => {
                const checked = selectedPlates.includes(plate);
                return (
                  <button
                    key={plate}
                    type="button"
                    onClick={() => toggle(plate)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                      {checked && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                    <span className={`font-mono tracking-widest ${checked ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>{plate}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}