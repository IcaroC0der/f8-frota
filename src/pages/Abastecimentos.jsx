import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Fuel, Car, Trash, Upload } from 'lucide-react';
import FuelImport from '@/components/fueling/FuelImport';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/shared/PageHeader';
import FuelForm from '@/components/fueling/FuelForm';
import FuelFilters from '@/components/fueling/FuelFilters';
import FuelSummaryCards from '@/components/fueling/FuelSummaryCards';
import FuelCharts from '@/components/fueling/FuelCharts';
import { format } from 'date-fns';

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const formatNum = (v) => v != null ? Number(v).toLocaleString('pt-BR') : '-';

export default function Abastecimentos() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkCostName, setBulkCostName] = useState('');
  const [bulkCostType, setBulkCostType] = useState('');
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', category: '', costName: '', costType: '', plate: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['fuel-records'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000)
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const { data: vehicleCategories = [] } = useQuery({
    queryKey: ['vehicle-categories-filter'],
    queryFn: () => base44.entities.VehicleCategory.list()
  });

  const vehicleMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => {map[v.plate] = v;});
    return map;
  }, [vehicles]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FuelRecord.create(data),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['fuel-records'] });setShowForm(false);}
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FuelRecord.update(id, data),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['fuel-records'] });setShowForm(false);setEditRecord(null);}
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FuelRecord.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fuel-records'] })
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ costName, costType }) => {
      const toDelete = records.filter((r) =>
      r.cost_name === costName && (!costType || r.cost_type === costType)
      );
      await Promise.all(toDelete.map((r) => base44.entities.FuelRecord.delete(r.id)));
      return toDelete.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-records'] });
      setShowBulkDelete(false);
      setBulkCostName('');
      setBulkCostType('');
    }
  });

  const bulkDeleteCount = useMemo(() => {
    if (!bulkCostName) return 0;
    return records.filter((r) =>
    r.cost_name === bulkCostName && (!bulkCostType || r.cost_type === bulkCostType)
    ).length;
  }, [records, bulkCostName, bulkCostType]);

  const handleSubmit = (data) => {
    if (editRecord) updateMutation.mutate({ id: editRecord.id, data });else
    createMutation.mutate(data);
  };

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filters.dateFrom && r.date < filters.dateFrom) return false;
      if (filters.dateTo && r.date > filters.dateTo) return false;
      if (filters.category && filters.category !== 'all' && r.category_name !== filters.category) return false;
      if (filters.costName && filters.costName !== 'all' && r.cost_name !== filters.costName) return false;
      if (filters.costType && filters.costType !== 'all' && r.cost_type !== filters.costType) return false;
      if (filters.plate && filters.plate !== 'all' && r.plate !== filters.plate) return false;
      return true;
    });
  }, [records, filters]);

  const categories = useMemo(() => vehicleCategories.filter((c) => c.is_active).map((c) => c.name).sort(), [vehicleCategories]);
  const costNames = useMemo(() => [...new Set(records.map((r) => r.cost_name).filter(Boolean))].sort(), [records]);
  const costTypes = useMemo(() => [...new Set(records.map((r) => r.cost_type).filter(Boolean))].sort(), [records]);
  const plates = useMemo(() => [...new Set(records.map((r) => r.plate).filter(Boolean))].sort(), [records]);

  const bulkCostTypes = useMemo(() => {
    if (!bulkCostName) return costTypes;
    return [...new Set(records.filter((r) => r.cost_name === bulkCostName).map((r) => r.cost_type).filter(Boolean))].sort();
  }, [records, bulkCostName, costTypes]);

  const totalValue = filtered.reduce((s, r) => s + (r.total_value || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedRecords = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {setCurrentPage(1);}, [filters]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Abastecimentos"
        subtitle="Controle de custos com combustíveis"
        icon={Fuel}
        iconColor="bg-warning/10"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Abastecimentos' }]} />
      

      {/* Summary cards */}
      <FuelSummaryCards records={filtered} />

      {/* Charts */}
      <FuelCharts records={filtered} />

      {/* Filters */}
      <FuelFilters filters={filters} onChange={setFilters} categories={categories} costNames={costNames} costTypes={costTypes} plates={plates} />

      {/* Table */}
      <Card className="overflow-hidden border shadow-sm">
        <div className="flex items-center justify-between gap-4 p-4 border-b bg-card">
          <p className="text-sm font-semibold">{filtered.length} registro(s)</p>
          <div className="flex items-center gap-2">
            <Button onClick={() => {setEditRecord(null);setShowForm(true);}} className="gap-2 hover:bg-warning/90 text-warning-foreground shadow-md shadow-warning/20 bg-[hsl(var(--muted-foreground))]">
              <Plus className="w-4 h-4" /> Lançar
            </Button>
            <Button onClick={() => setShowImport(true)} variant="outline" className="gap-2">
              <Upload className="w-4 h-4" /> Importar
            </Button>
          </div>
        </div>

        {isLoading ?
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-muted border-t-warning rounded-full animate-spin" />
          </div> :

        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '420px' }}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Data</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Veículo</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Categoria</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Tipo de Custo</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Custo</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right">Litros</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right">Valor (R$)</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right">KM</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Fornecedor</TableHead>
                  <TableHead className="w-20 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ?
              <TableRow>
                    <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow> :

              paginatedRecords.map((r, idx) => {
                const veh = vehicleMap[r.plate];
                const model = veh?.vehicle_model || r.vehicle_model;
                const category = veh?.category_name || r.category_name;
                const costTypeColors = {
                  DIESEL: 'bg-blue-50 text-blue-700 border border-blue-200',
                  GASOLINA: 'bg-orange-50 text-orange-600 border border-orange-200',
                  ETANOL: 'bg-green-50 text-green-700 border border-green-200',
                  ARLA: 'bg-purple-50 text-purple-700 border border-purple-200'
                };
                const costTypeColor = costTypeColors[r.cost_type?.toUpperCase()] || 'bg-muted text-muted-foreground border';
                return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.01 }}
                    className="border-b hover:bg-muted/30 transition-colors">
                    
                        {/* Data */}
                        <TableCell className="py-3 text-sm font-medium whitespace-nowrap">
                          {r.date ? format(new Date(r.date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                        </TableCell>

                        {/* Veículo: placa + modelo */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <Car className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold font-mono tracking-widest text-foreground">{r.plate}</span>
                              {model && <span className="text-xs text-muted-foreground leading-tight">{model}</span>}
                            </div>
                          </div>
                        </TableCell>

                        {/* Categoria (automática pela placa) */}
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-xs font-medium">{category || '-'}</Badge>
                        </TableCell>

                        {/* Tipo de Custo com badge colorido */}
                        <TableCell className="py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${costTypeColor}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                            {r.cost_type}
                          </span>
                        </TableCell>

                        {/* Custo */}
                        <TableCell className="py-3">
                          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">{r.cost_name}</Badge>
                        </TableCell>

                        {/* Litros */}
                        <TableCell className="py-3 text-sm text-right font-medium tabular-nums">{formatNum(r.quantity)}</TableCell>

                        {/* Valor */}
                        <TableCell className="py-3 text-sm text-right font-semibold text-success tabular-nums">{formatCurrency(r.total_value)}</TableCell>

                        {/* KM */}
                        <TableCell className="py-3 text-sm text-right tabular-nums text-muted-foreground">{r.km ? formatNum(r.km, 0) : '-'}</TableCell>

                        {/* Fornecedor */}
                        <TableCell className="py-3">
                          <div className="flex flex-col max-w-[180px]">
                            <span className="text-xs font-medium text-foreground leading-tight truncate" title={r.supplier}>{r.supplier || '-'}</span>
                            {r.invoice_number && <span className="text-xs text-muted-foreground">Nota: {r.invoice_number}</span>}
                          </div>
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => {setEditRecord(r);setShowForm(true);}}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(r.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>);

              })
              }
              </TableBody>
            </Table>
          </div>
        }

        {filtered.length > 0 &&
        <div className="px-4 py-3 bg-muted/30 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{filtered.length} de {records.length} registro(s)</span>
              <span className="font-semibold text-foreground">Total filtrado: {formatCurrency(totalValue)}</span>
            </div>
            {/* Pagination */}
            <div className="flex items-center gap-1">
              <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-7 w-7 flex items-center justify-center rounded-md text-xs border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
              «</button>
              <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 w-7 flex items-center justify-center rounded-md text-xs border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
              ‹</button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).
            filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).
            reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, []).
            map((p, i) =>
            p === '...' ?
            <span key={`ellipsis-${i}`} className="h-7 w-7 flex items-center justify-center text-xs text-muted-foreground">…</span> :
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`h-7 w-7 flex items-center justify-center rounded-md text-xs border transition-colors font-medium
                          ${currentPage === p ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>
              {p}</button>
            )
            }

              <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 w-7 flex items-center justify-center rounded-md text-xs border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
              ›</button>
              <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-7 w-7 flex items-center justify-center rounded-md text-xs border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
              »</button>
            </div>
          </div>
        }
      </Card>

      <FuelForm
        open={showForm}
        onClose={() => {setShowForm(false);setEditRecord(null);}}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        record={editRecord} />
      

      {/* Bulk Delete Dialog */}
      <Dialog open={showBulkDelete} onOpenChange={(v) => {setShowBulkDelete(v);if (!v) {setBulkCostName('');setBulkCostType('');}}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash className="w-5 h-5" /> Excluir por Custo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Selecione o custo e opcionalmente o tipo de custo para excluir <strong>todos</strong> os lançamentos relacionados.</p>
            <div className="space-y-2">
              <Label>Custo *</Label>
              <Select value={bulkCostName} onValueChange={(v) => {setBulkCostName(v);setBulkCostType('');}}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o custo..." />
                </SelectTrigger>
                <SelectContent>
                  {costNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Custo <span className="text-muted-foreground text-xs">(opcional — deixe em branco para todos)</span></Label>
              <Select value={bulkCostType} onValueChange={setBulkCostType} disabled={!bulkCostName}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos..." />
                </SelectTrigger>
                <SelectContent>
                  {bulkCostTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {bulkCostName &&
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive font-medium">
                ⚠️ {bulkDeleteCount} lançamento(s) serão excluídos permanentemente.
              </div>
            }
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDelete(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!bulkCostName || bulkDeleteCount === 0 || bulkDeleteMutation.isPending}
              onClick={() => bulkDeleteMutation.mutate({ costName: bulkCostName, costType: bulkCostType })}>
              
              {bulkDeleteMutation.isPending ? 'Excluindo...' : `Excluir ${bulkDeleteCount} registro(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FuelImport open={showImport} onClose={() => setShowImport(false)} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => {deleteMutation.mutate(deleteId);setDeleteId(null);}}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}