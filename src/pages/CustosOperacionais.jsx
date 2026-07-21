import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, DollarSign, Car, Eye, Download } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import OperationalCostForm from '@/components/operational/OperationalCostForm';
import OperationalCostCharts from '@/components/operational/OperationalCostCharts';
import OperationalFiltersPanel from '@/components/operational/OperationalFiltersPanel';
import { format } from 'date-fns';

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const COST_COLORS = {
  'LAVAGEM DE VEÍCULOS': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'LAVAGEM DE VEICULOS': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'RASTREADOR DE VEÍCULOS': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'RASTREADOR DE VEICULOS': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'MULTAS DE TRÂNSITO': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'MULTAS DE TRANSITO': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'PEDÁGIO': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  'PEDAGIO': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  'SEGUROS DE VEÍCULOS': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  'SEGURO': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  'IPVA/LICENCIAMENTO': { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'ESTOQUE': { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
};

const COLOR_PALETTE = [
  { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-lime-50', text: 'text-lime-700', dot: 'bg-lime-500' },
  { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
];

const dynamicColorCache = {};
let colorIndex = 0;
const getCostStyle = (name) => {
  if (!name) return { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400' };
  if (COST_COLORS[name]) return COST_COLORS[name];
  if (!dynamicColorCache[name]) {
    dynamicColorCache[name] = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
    colorIndex++;
  }
  return dynamicColorCache[name];
};

const PAGE_SIZE = 8;

export default function CustosOperacionais() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', costName: 'all', plate: 'all' });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['operational-cost-records'],
    queryFn: () => base44.entities.OperationalCostRecord.list('-date', 10000),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const vehicleMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => { map[v.plate] = v; });
    return map;
  }, [vehicles]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationalCostRecord.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['operational-cost-records'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OperationalCostRecord.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['operational-cost-records'] }); setShowForm(false); setEditRecord(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OperationalCostRecord.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operational-cost-records'] }),
  });

  const handleSubmit = (data) => {
    if (editRecord) updateMutation.mutate({ id: editRecord.id, data });
    else createMutation.mutate(data);
  };

  const costNameList = useMemo(() => [...new Set(records.map((r) => r.cost_name).filter(Boolean))].sort(), [records]);
  const plateList = useMemo(() => [...new Set(records.map((r) => r.plate).filter(Boolean))].sort(), [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filters.dateFrom && r.date < filters.dateFrom) return false;
      if (filters.dateTo && r.date > filters.dateTo) return false;
      if (filters.costName !== 'all' && r.cost_name !== filters.costName) return false;
      if (filters.plate !== 'all' && r.plate !== filters.plate) return false;
      if (search) {
        const s = search.toLowerCase();
        const match = [r.cost_name, r.plate, r.supplier, r.invoice_number, r.observation].some(
          (v) => v && String(v).toLowerCase().includes(s)
        );
        if (!match) return false;
      }
      return true;
    });
  }, [records, filters, search]);

  useEffect(() => { setCurrentPage(1); }, [filters, search]);

  const totalValue = filtered.reduce((s, r) => s + (r.total_value || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Summary cards data
  const avgDaily = (() => {
    if (!filtered.length) return 0;
    const dates = filtered.map((r) => r.date).filter(Boolean).sort();
    if (dates.length < 2) return totalValue;
    const d1 = new Date(dates[0] + 'T12:00:00');
    const d2 = new Date(dates[dates.length - 1] + 'T12:00:00');
    const days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
    return totalValue / days;
  })();

  const avgMonthly = (() => {
    const months = new Set(filtered.map((r) => r.date?.slice(0, 7)).filter(Boolean));
    return months.size > 0 ? totalValue / months.size : totalValue;
  })();

  const summaryCards = [
    { label: 'CUSTO TOTAL (PERÍODO)', value: formatCurrency(totalValue), icon: '💲', gradient: 'from-blue-500 to-blue-600', sub: `${filtered.length} lançamentos` },
    { label: 'TOTAL DE LANÇAMENTOS', value: filtered.length, icon: '📋', gradient: 'from-emerald-500 to-emerald-600', sub: `${costNameList.length} tipos de custo` },
    { label: 'CUSTO MÉDIO DIÁRIO', value: formatCurrency(avgDaily), icon: '📊', gradient: 'from-orange-500 to-orange-600', sub: 'Média por dia' },
    { label: 'CUSTO MÉDIO MENSAL', value: formatCurrency(avgMonthly), icon: '🚚', gradient: 'from-purple-500 to-purple-600', sub: 'Média por mês' },
  ];

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <h1 className="text-2xl font-bold text-foreground">Custos Operacionais</h1>
        <Button
          onClick={() => { setEditRecord(null); setShowForm(true); }}
          className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-md px-5"
        >
          <Plus className="w-4 h-4" /> LANÇAR
        </Button>
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {summaryCards.map((c, i) => (
              <div key={i} className={`rounded-xl bg-gradient-to-br ${c.gradient} text-white p-4 relative overflow-hidden shadow-md`}>
                <div className="absolute right-3 top-3 text-2xl opacity-70">{c.icon}</div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{c.label}</p>
                <p className="text-xl font-bold leading-tight">{c.value}</p>
                <p className="text-[10px] opacity-70 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <OperationalCostCharts records={filtered} />

          {/* Table */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold uppercase tracking-wider">LANÇAMENTOS DE CUSTOS</span>
                <Badge variant="outline" className="text-xs">{filtered.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 text-xs w-48"
                />
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                  <Download className="w-3.5 h-3.5" /> Exportar
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Data</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Veículo</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Custo</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Descrição</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Fornecedor</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Valor (R$)</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                          Nenhum lançamento encontrado
                        </TableCell>
                      </TableRow>
                    ) : paginated.map((r, idx) => {
                      const veh = vehicleMap[r.plate];
                      const model = veh?.vehicle_model || r.vehicle_model;
                      const style = getCostStyle(r.cost_name);
                      return (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.01 }}
                          className="border-b hover:bg-muted/20 transition-colors"
                        >
                          <TableCell className="py-2.5 text-sm font-medium whitespace-nowrap">
                            {r.date ? format(new Date(r.date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="py-2.5">
                            {r.plate ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                  <Car className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold font-mono tracking-widest">{r.plate}</p>
                                  {model && <p className="text-[10px] text-muted-foreground">{model}</p>}
                                </div>
                              </div>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                              {r.cost_name || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 text-xs text-muted-foreground max-w-[180px]">
                            <span className="truncate block" title={r.observation}>{r.observation || '-'}</span>
                          </TableCell>
                          <TableCell className="py-2.5 text-xs font-medium max-w-[140px]">
                            <span className="truncate block" title={r.supplier}>{r.supplier || '-'}</span>
                          </TableCell>
                          <TableCell className="py-2.5 text-sm text-right font-bold text-emerald-600 tabular-nums">
                            {formatCurrency(r.total_value)}
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-primary"
                                onClick={() => { setEditRecord(r); setShowForm(true); }}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-primary"
                                onClick={() => { setEditRecord(r); setShowForm(true); }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-destructive"
                                onClick={() => setDeleteId(r.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Mostrando {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)} a {Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length} registros
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                    className="h-7 w-7 flex items-center justify-center rounded text-xs border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">‹‹</button>
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="h-7 w-7 flex items-center justify-center rounded text-xs border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
                    .map((p, i) => p === '...' ?
                      <span key={`e-${i}`} className="h-7 w-7 flex items-center justify-center text-xs text-muted-foreground">…</span> :
                      <button key={p} onClick={() => setCurrentPage(p)}
                        className={`h-7 w-7 flex items-center justify-center rounded text-xs border transition-colors ${currentPage === p ? 'bg-primary text-white border-primary' : 'bg-card hover:bg-muted'}`}>{p}</button>
                    )}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded text-xs border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">›</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded text-xs border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">››</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right filters panel */}
        <div className="w-52 flex-shrink-0 border-l bg-card p-3 overflow-y-auto">
          <OperationalFiltersPanel
            filters={filters}
            setFilters={setFilters}
            costNameList={costNameList}
            plateList={plateList}
          />
        </div>
      </div>

      <OperationalCostForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditRecord(null); }}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        record={editRecord}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este lançamento?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => { deleteMutation.mutate(deleteId); setDeleteId(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}