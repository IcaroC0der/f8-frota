import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, Search, FileSpreadsheet } from 'lucide-react';
import { exportAnaliseExcel } from '@/utils/exportAnaliseExcel';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const TYPE_BADGE = {
  Abastecimento: 'bg-amber-100 text-amber-700',
  Manutenção: 'bg-red-100 text-red-700',
  Operacional: 'bg-emerald-100 text-emerald-700',
};

const COLS = [
  { key: 'date', label: 'Data' },
  { key: '_type', label: 'Tipo' },
  { key: '_category', label: 'Categoria' },
  { key: 'plate', label: 'Placa' },
  { key: 'vehicle_model', label: 'Modelo' },
  { key: 'supplier', label: 'Fornecedor' },
  { key: 'cost_name', label: 'Custo / Classificação' },
  { key: 'invoice_number', label: 'NF' },
  { key: 'km', label: 'KM' },
  { key: 'total_value', label: 'Valor (R$)' },
];

const PAGE_SIZE = 10000;

export default function RelatorioTable({ filtered }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('Todos');
  const types = ['Todos', 'Abastecimento', 'Manutenção', 'Operacional'];

  const searched = useMemo(() => {
    let data = filtered;
    if (typeFilter !== 'Todos') data = data.filter(r => r._type === typeFilter);
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(r =>
      (r.plate || '').toLowerCase().includes(q) ||
      (r.supplier || '').toLowerCase().includes(q) ||
      (r._category || '').toLowerCase().includes(q) ||
      (r._type || '').toLowerCase().includes(q) ||
      (r.cost_name || '').toLowerCase().includes(q) ||
      (r.vehicle_model || '').toLowerCase().includes(q) ||
      (r.invoice_number || '').toLowerCase().includes(q) ||
      (r.cost_type || r.classification || '').toLowerCase().includes(q)
    );
  }, [filtered, search, typeFilter]);

  const sorted = useMemo(() => {
    return [...searched].sort((a, b) => {
      let va = a[sortKey] ?? '';
      let vb = b[sortKey] ?? '';
      if (sortKey === 'total_value' || sortKey === 'km') { va = Number(va); vb = Number(vb); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searched, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page]);
  const total = useMemo(() => sorted.reduce((s, r) => s + (r.total_value || 0), 0), [sorted]);

  const toggleSort = useCallback((key) => {
    setPage(1);
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }, [sortKey]);

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />;
  };

  return (
    <>
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Tabela de Lançamentos</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {sorted.length.toLocaleString('pt-BR')} registros · Total: <span className="font-bold text-slate-700">{fmt(total)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type quick filter */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {types.map(t => (
              <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
                className={`px-2.5 py-1.5 text-[10px] font-semibold transition-colors whitespace-nowrap ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                {t}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar..."
              className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 w-44"
            />
          </div>
          {/* Export */}
          <button
            onClick={() => exportAnaliseExcel({ filtered: sorted })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            EXPORTAR EXCEL
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="py-2 px-2 text-left text-slate-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, i) => (
              <tr key={`${r.id || i}`} className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                <td className="py-2 px-2 text-slate-600 whitespace-nowrap">
                  {r.date ? new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="py-2 px-2 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TYPE_BADGE[r._type] || 'bg-slate-100 text-slate-600'}`}>
                    {r._type}
                  </span>
                </td>
                <td className="py-2 px-2 text-slate-600 max-w-[120px] truncate">{r._category || '—'}</td>
                <td className="py-2 px-2 font-mono text-slate-800 font-bold whitespace-nowrap">{r.plate || '—'}</td>
                <td className="py-2 px-2 text-slate-600 max-w-[120px] truncate">{r.vehicle_model || '—'}</td>
                <td className="py-2 px-2 text-slate-600 max-w-[140px] truncate" title={r.supplier}>{r.supplier || '—'}</td>
                <td className="py-2 px-2 text-slate-600 max-w-[140px] truncate" title={r.cost_name || r.cost_type || r.classification}>{r.cost_name || r.cost_type || r.classification || '—'}</td>
                <td className="py-2 px-2 text-slate-500 whitespace-nowrap">{r.invoice_number || '—'}</td>
                <td className="py-2 px-2 text-slate-500 text-right whitespace-nowrap">{r.km ? Number(r.km).toLocaleString('pt-BR') : '—'}</td>
                <td className="py-2 px-2 font-bold text-slate-800 text-right whitespace-nowrap">{fmt(r.total_value)}</td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={10} className="py-10 text-center text-slate-400">Nenhum registro encontrado</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td colSpan={9} className="py-2.5 px-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
                TOTAL ({sorted.length.toLocaleString('pt-BR')} registros)
              </td>
              <td className="py-2.5 px-2 font-bold text-slate-900 text-right text-sm">{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Página {page} de {totalPages} · exibindo {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length.toLocaleString('pt-BR')}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30">‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = page - 2 + i;
              if (p < 1) p = i + 1;
              if (p > totalPages) p = totalPages - (4 - i);
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${page === p ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-2 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30">»</button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}