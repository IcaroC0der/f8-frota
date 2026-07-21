import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Fuel, Trash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormDialog from '@/components/shared/FormDialog';

export default function AbastecimentosConfig() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ cost_name: 'COMBUSTÍVEIS', cost_type: '' });
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkCostName, setBulkCostName] = useState('');
  const [bulkCostType, setBulkCostType] = useState('');
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['fuelCostTypes'],
    queryFn: () => base44.entities.FuelCostType.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FuelCostType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelCostTypes'] });
      closeDialog();
      toast.success('Tipo de custo criado!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FuelCostType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelCostTypes'] });
      closeDialog();
      toast.success('Tipo de custo atualizado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FuelCostType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelCostTypes'] });
      toast.success('Tipo de custo excluído!');
    }
  });

  const { data: fuelRecords = [] } = useQuery({
    queryKey: ['fuel-records-bulk'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 10000),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ costName, costType }) => {
      const toDelete = fuelRecords.filter(r =>
        r.cost_name === costName && (!costType || r.cost_type === costType)
      );
      await Promise.all(toDelete.map(r => base44.entities.FuelRecord.delete(r.id)));
      return toDelete.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['fuel-records'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-records-bulk'] });
      setShowBulkDelete(false);
      setBulkCostName('');
      setBulkCostType('');
      toast.success(`${count} lançamento(s) excluído(s)!`);
    },
  });

  const costNames = useMemo(() => [...new Set(fuelRecords.map(r => r.cost_name).filter(Boolean))].sort(), [fuelRecords]);
  const bulkCostTypes = useMemo(() => {
    if (!bulkCostName) return [...new Set(fuelRecords.map(r => r.cost_type).filter(Boolean))].sort();
    return [...new Set(fuelRecords.filter(r => r.cost_name === bulkCostName).map(r => r.cost_type).filter(Boolean))].sort();
  }, [fuelRecords, bulkCostName]);

  const bulkDeleteCount = useMemo(() => {
    if (!bulkCostName) return 0;
    return fuelRecords.filter(r =>
      r.cost_name === bulkCostName && (!bulkCostType || r.cost_type === bulkCostType)
    ).length;
  }, [fuelRecords, bulkCostName, bulkCostType]);

  const openAdd = () => {
    setEditing(null);
    setFormData({ cost_name: 'COMBUSTÍVEIS', cost_type: '' });
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({ cost_name: row.cost_name, cost_type: row.cost_type });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = () => {
    if (!formData.cost_type.trim()) {
      toast.error('Informe o tipo de custo');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { ...formData, is_active: true } });
    } else {
      createMutation.mutate({ ...formData, is_active: true });
    }
  };

  const columns = [
  {
    key: 'cost_name',
    label: 'Custo',
    render: (val) =>
    <Badge className="border-amber-200 font-medium bg-[hsl(var(--warning))] text-[hsl(var(--card))]">{val}</Badge>

  },
  {
    key: 'cost_type',
    label: 'Tipo de Custo',
    render: (val) => <span className="font-semibold text-[hsl(var(--chart-3))]">{val}</span>
  },
  {
    key: 'is_active',
    label: 'Status',
    render: (val) =>
    <Badge variant="secondary" className={val !== false ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}>
          {val !== false ? 'Ativo' : 'Inativo'}
        </Badge>

  }];


  if (isLoading) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>);

  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <PageHeader
        title="Abastecimentos"
        subtitle="Gerencie os custos e tipos de combustíveis"
        icon={Fuel}
        iconColor="bg-amber-500/10"
        breadcrumbs={[
        { label: 'Dashboard', path: '/' },
        { label: 'Parametrizações', path: '/parametrizacoes' },
        { label: 'Estrutura dos Módulos', path: '/parametrizacoes/estrutura-modulos' },
        { label: 'Abastecimentos' }]
        } />
      

      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={() => setShowBulkDelete(true)} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
          <Trash className="w-4 h-4" /> Excluir Lançamentos por Custo
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        addLabel="Novo Tipo de Custo"
        searchPlaceholder="Buscar tipo de custo..." />
      

      {/* Bulk Delete Dialog */}
      <Dialog open={showBulkDelete} onOpenChange={(v) => { setShowBulkDelete(v); if (!v) { setBulkCostName(''); setBulkCostType(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash className="w-5 h-5" /> Excluir Lançamentos por Custo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Selecione o custo e opcionalmente o tipo para excluir <strong>todos</strong> os lançamentos relacionados em Abastecimentos.</p>
            <div className="space-y-2">
              <Label>Custo *</Label>
              <Select value={bulkCostName} onValueChange={(v) => { setBulkCostName(v); setBulkCostType(''); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o custo..." /></SelectTrigger>
                <SelectContent>
                  {costNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Custo <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Select value={bulkCostType} onValueChange={setBulkCostType} disabled={!bulkCostName}>
                <SelectTrigger><SelectValue placeholder="Todos os tipos..." /></SelectTrigger>
                <SelectContent>
                  {bulkCostTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {bulkCostName && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive font-medium">
                ⚠️ {bulkDeleteCount} lançamento(s) serão excluídos permanentemente.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDelete(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!bulkCostName || bulkDeleteCount === 0 || bulkDeleteMutation.isPending}
              onClick={() => bulkDeleteMutation.mutate({ costName: bulkCostName, costType: bulkCostType })}
            >
              {bulkDeleteMutation.isPending ? 'Excluindo...' : `Excluir ${bulkDeleteCount} registro(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FormDialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editing ? 'Editar Tipo de Custo' : 'Novo Tipo de Custo'}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="costName">Custo</Label>
            <Input
              id="costName"
              value={formData.cost_name}
              onChange={(e) => setFormData({ ...formData, cost_name: e.target.value.toUpperCase() })}
              placeholder="Ex: COMBUSTÍVEIS"
              className="mt-1.5" />
            
          </div>
          <div>
            <Label htmlFor="costType">Tipo de Custo *</Label>
            <Input
              id="costType"
              value={formData.cost_type}
              onChange={(e) => setFormData({ ...formData, cost_type: e.target.value.toUpperCase() })}
              placeholder="Ex: DIESEL"
              className="mt-1.5" />
            
          </div>
        </div>
      </FormDialog>
    </div>);

}