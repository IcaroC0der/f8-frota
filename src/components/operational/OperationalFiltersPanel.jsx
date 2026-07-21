import React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OperationalFiltersPanel({ filters, setFilters, costNameList, plateList }) {
  const hasFilters = filters.dateFrom || filters.dateTo || filters.costName !== 'all' || filters.plate !== 'all';
  const clearFilters = () => setFilters((f) => ({ ...f, dateFrom: '', dateTo: '', costName: 'all', plate: 'all' }));

  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold uppercase tracking-wider text-primary">FILTROS</span>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Período</Label>
          <div className="flex flex-col gap-1.5 mt-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-6">DE</span>
              <Input type="date" className="h-8 text-xs flex-1"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-6">ATÉ</span>
              <Input type="date" className="h-8 text-xs flex-1"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Veículo</Label>
          <Select value={filters.plate} onValueChange={(v) => setFilters((f) => ({ ...f, plate: v }))}>
            <SelectTrigger className="h-8 text-xs mt-1.5">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {plateList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Custo</Label>
          <Select value={filters.costName} onValueChange={(v) => setFilters((f) => ({ ...f, costName: v }))}>
            <SelectTrigger className="h-8 text-xs mt-1.5">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {costNameList.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" className="w-full h-8 text-xs bg-primary" onClick={() => {}}>
          <Filter className="w-3 h-3 mr-1" /> Filtrar
        </Button>
        {hasFilters && (
          <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={clearFilters}>
            Limpar Filtros
          </Button>
        )}
      </div>
    </div>
  );
}