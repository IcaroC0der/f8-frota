import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Wrench, Car, Paperclip, Eye } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shared/PageHeader';
import MaintenanceForm from '@/components/maintenance/MaintenanceForm';
import MaintenanceSummaryCards from '@/components/maintenance/MaintenanceSummaryCards';
import MaintenanceCharts from '@/components/maintenance/MaintenanceCharts';
import MaintenanceFilters from '@/components/maintenance/MaintenanceFilters';
import { format } from 'date-fns';

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const formatNum = (v) => v != null ? Number(v).toLocaleString('pt-BR') : '-';

const PAGE_SIZE = 8;

export default function Manutencao() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', classification: 'all', costGroup: 'all', plate: 'all', category: 'all' });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['maintenance-records'],
    queryFn: () => base44.entities.MaintenanceRecord.list('-date', 10000)
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list()
  });

  const { data: costTypes = [] } = useQuery({
    queryKey: ['maintenanceCostTypes'],
    queryFn: () => base44.entities.MaintenanceCostType.list()
  });

  const { data: classifications = [] } = useQuery({
    queryKey: ['maintenanceClassifications'],
    queryFn: () => base44.entities.MaintenanceClassification.list()
  });

  const vehicleMap = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => {map[v.plate] = v;});
    return map;
  }, [vehicles]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceRecord.create(data),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['maintenance-records'] });setShowForm(false);}
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceRecord.update(id, data),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['maintenance-records'] });setShowForm(false);setEditRecord(null);}
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceRecord.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance-records'] })
  });

  const handleSubmit = (data) => {
    if (editRecord) updateMutation.mutate({ id: editRecord.id, data });else
    createMutation.mutate(data);
  };

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filters.dateFrom && r.date < filters.dateFrom) return false;
      if (filters.dateTo && r.date > filters.dateTo) return false;
      if (filters.classification && filters.classification !== 'all' && r.classification !== filters.classification) return false;
      if (filters.costGroup && filters.costGroup !== 'all' && r.cost_group !== filters.costGroup) return false;
      if (filters.plate && filters.plate !== 'all' && r.plate !== filters.plate) return false;
      if (filters.category && filters.category !== 'all') {
        const cat = vehicleMap[r.plate]?.category_name || r.category_name;
        if (cat !== filters.category) return false;
      }
      return true;
    });
  }, [records, filters]);

  useEffect(() => {setCurrentPage(1);}, [filters]);

  const classificationList = useMemo(() => classifications.filter((c) => c.is_active !== false).map((c) => c.name).sort(), [classifications]);
  const costGroupList = useMemo(() => [...new Set(costTypes.map((ct) => ct.cost_group).filter(Boolean))].sort(), [costTypes]);
  const plateList = useMemo(() => [...new Set(records.map((r) => r.plate).filter(Boolean))].sort(), [records]);
  const categoryList = useMemo(() => [...new Set(records.map((r) => vehicleMap[r.plate]?.category_name || r.category_name).filter(Boolean))].sort(), [records, vehicleMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedRecords = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalValue = filtered.reduce((s, r) => s + (r.total_value || 0), 0);

  const classColor = (cl) => {
    if (!cl) return 'bg-muted text-muted-foreground border';
    if (cl.toUpperCase().includes('PREVENTIV')) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (cl.toUpperCase().includes('CORRETIV')) return 'bg-orange-50 text-orange-700 border border-orange-200';
    return 'bg-muted text-muted-foreground border';
  };

  const costGroupColor = (cg) => {
    const map = {
      'PNEU': 'bg-orange-50 text-orange-700 border border-orange-200',
      'PEÇAS': 'bg-purple-50 text-purple-700 border border-purple-200',
      'SERVIÇOS': 'bg-cyan-50 text-cyan-700 border border-cyan-200'
    };
    return map[cg?.toUpperCase()] || 'bg-muted text-muted-foreground border';
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Manutenção"
        subtitle="Gerencie os lançamentos e custos de manutenção da sua frota"
        icon={Wrench}
        iconColor="bg-rose-500/10"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Manutenção' }]} />
      

      {/* Layout: main content + sidebar filters */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => {setEditRecord(null);setShowForm(true);}}
              className="gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20">
              
              <Plus className="w-4 h-4" /> Novo Lançamento
            </Button>
          </div>

          {/* Summary cards */}
          <MaintenanceSummaryCards records={filtered} />

          {/* Charts */}
          <MaintenanceCharts records={filtered} />

          {/* Table */}
          <Card className="overflow-hidden border shadow-sm">
            <div className="flex items-center justify-between gap-4 p-4 border-b bg-card">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-rose-500" />
                <p className="text-sm font-bold uppercase tracking-wider">LANÇAMENTOS DE MANUTENÇÃO</p>
                <Badge variant="outline" className="text-xs">{filtered.length}</Badge>
              </div>
            </div>

            {isLoading ?
            <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-muted border-t-rose-500 rounded-full animate-spin" />
              </div> :

            <div className="overflow-x-auto overflow-y-auto px-1" style={{ maxHeight: '420px' }}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Data</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Veículo</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Categoria</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Classificação</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Custo</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Tipo</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Fornecedor</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right">Valor (R$)</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right">KM</TableHead>
                      <TableHead className="w-24 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ?
                  <TableRow>
                        <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                          Nenhum registro encontrado
                        </TableCell>
                      </TableRow> :
                  paginatedRecords.map((r, idx) => {
                    const veh = vehicleMap[r.plate];
                    const model = veh?.vehicle_model || r.vehicle_model;
                    const category = veh?.category_name || r.category_name;
                    return (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.01 }}
                        className="border-b hover:bg-muted/30 transition-colors">
                        
                          <TableCell className="py-3 text-sm font-medium whitespace-nowrap">
                            {r.date ? format(new Date(r.date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                                <Car className="w-3.5 h-3.5 text-rose-400" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold font-mono tracking-widest">{r.plate}</span>
                                {model && <span className="text-xs text-muted-foreground leading-tight">{model}</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant="outline" className="text-xs font-medium">{category || '-'}</Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${classColor(r.classification)}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                              {r.classification || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${costGroupColor(r.cost_group)}`}>
                              {r.cost_group || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-xs font-medium text-foreground">{r.cost_type || '-'}</TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col max-w-[160px]">
                              <span className="text-xs font-medium truncate" title={r.supplier}>{r.supplier || '-'}</span>
                              {r.invoice_number && <span className="text-xs text-muted-foreground">NF: {r.invoice_number}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-sm text-right font-semibold text-rose-600 tabular-nums">{formatCurrency(r.total_value)}</TableCell>
                          <TableCell className="py-3 text-sm text-right tabular-nums text-muted-foreground">{r.km ? formatNum(r.km) : '-'}</TableCell>
                          <TableCell className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {r.attachment_url &&
                            <a href={r.attachment_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                                    <Paperclip className="w-3.5 h-3.5" />
                                  </Button>
                                </a>
                            }
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => {setEditRecord(r);setShowForm(true);}}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(r.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>);

                  })}
                  </TableBody>
                </Table>
              </div>
            }

            {filtered.length > 0 &&
            <div className="px-4 py-3 bg-muted/30 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{filtered.length} de {records.length} registro(s)</span>
                  <span className="font-semibold text-foreground">Total filtrado: {formatCurrency(totalValue)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-md text-xs border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">«</button>
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-md text-xs border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).
                filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).
                reduce((acc, p, idx, arr) => {if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');acc.push(p);return acc;}, []).
                map((p, i) => p === '...' ?
                <span key={`e-${i}`} className="h-7 w-7 flex items-center justify-center text-xs text-muted-foreground">…</span> :
                <button key={p} onClick={() => setCurrentPage(p)}
                className={`h-7 w-7 flex items-center justify-center rounded-md text-xs border transition-colors font-medium ${currentPage === p ? 'bg-rose-600 text-white border-rose-600' : 'bg-card hover:bg-muted'}`}>{p}</button>
                )}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-md text-xs border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">›</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-md text-xs border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">»</button>
                </div>
              </div>
            }
          </Card>
        </div>

        {/* Sidebar Filters */}
        <div className="xl:w-64 shrink-0">
          <MaintenanceFilters
            filters={filters}
            onChange={setFilters}
            classifications={classificationList}
            costGroups={costGroupList}
            vehicles={plateList}
            categories={categoryList} />
          
        </div>
      </div>

      <MaintenanceForm
        open={showForm}
        onClose={() => {setShowForm(false);setEditRecord(null);}}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        record={editRecord} />
      

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