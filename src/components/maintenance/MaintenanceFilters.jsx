import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';

export default function MaintenanceFilters({ filters, onChange, classifications, costGroups, vehicles, categories }) {
  const set = (k, v) => onChange({ ...filters, [k]: v });
  const hasFilter = Object.values(filters).some(v => v && v !== 'all');

  return (
    <div className="bg-card rounded-2xl border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 font-bold text-sm">
          <Filter className="w-4 h-4 text-rose-500" /> FILTROS
        </div>
        {hasFilter && (
          <button onClick={() => onChange({ dateFrom: '', dateTo: '', classification: 'all', costGroup: 'all', plate: 'all', category: 'all' })}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Período</label>
          <div className="flex flex-col gap-1.5 mt-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-6">De</span>
              <Input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} className="text-xs h-8 flex-1" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-6">Até</span>
              <Input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} className="text-xs h-8 flex-1" />
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Classificação</label>
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {['all', ...classifications].map(c => (
              <button key={c} onClick={() => set('classification', c)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filters.classification === c || (!filters.classification && c === 'all')
                  ? c === 'all' ? 'bg-foreground text-background border-foreground'
                  : c.toUpperCase().includes('PREVENTIV') ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-orange-500 text-white border-orange-500'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}>
                {c === 'all' ? 'Todas' : c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo de Custo</label>
          <Select value={filters.costGroup || 'all'} onValueChange={v => set('costGroup', v)}>
            <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {costGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoria</label>
          <Select value={filters.category || 'all'} onValueChange={v => set('category', v)}>
            <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {(categories || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Veículo</label>
          <Select value={filters.plate || 'all'} onValueChange={v => set('plate', v)}>
            <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {vehicles.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}