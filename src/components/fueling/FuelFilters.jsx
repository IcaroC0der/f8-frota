import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function FuelFilters({ filters, onChange, categories, costNames, costTypes, plates }) {
  const set = (field, val) => onChange({ ...filters, [field]: val });
  const clear = () => onChange({ dateFrom: '', dateTo: '', category: '', costName: '', costType: '', plate: '' });

  const hasFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Filtros</p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clear} className="gap-1 text-muted-foreground h-7 text-xs">
            <X className="w-3 h-3" /> Limpar
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Categoria</Label>
          <Select value={filters.category} onValueChange={v => set('category', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Custo</Label>
          <Select value={filters.costName} onValueChange={v => set('costName', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {costNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo de Custo</Label>
          <Select value={filters.costType} onValueChange={v => set('costType', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {costTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Placa</Label>
          <Select value={filters.plate} onValueChange={v => set('plate', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {plates.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}