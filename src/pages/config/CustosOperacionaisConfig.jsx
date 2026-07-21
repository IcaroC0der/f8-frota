import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormDialog from '@/components/shared/FormDialog';

export default function CustosOperacionaisConfig() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const queryClient = useQueryClient();

  const { data: costs = [], isLoading } = useQuery({
    queryKey: ['operationalCosts'],
    queryFn: () => base44.entities.OperationalCost.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationalCost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operationalCosts'] });
      closeDialog();
      toast.success('Custo criado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OperationalCost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operationalCosts'] });
      closeDialog();
      toast.success('Custo atualizado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OperationalCost.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operationalCosts'] });
      toast.success('Custo excluído!');
    },
  });

  const openAdd = () => {
    setEditing(null);
    setFormData({ name: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({ name: row.name, description: row.description || '' });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Informe o nome do custo');
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
      key: 'name',
      label: 'Custo Operacional',
      render: (val) => <span className="font-semibold text-foreground">{val}</span>
    },
    {
      key: 'description',
      label: 'Descrição',
      render: (val) => <span className="text-muted-foreground">{val || '—'}</span>
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <Badge variant="secondary" className={val !== false ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}>
          {val !== false ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <PageHeader
        title="Custos Operacionais"
        subtitle="Gerencie os tipos de custos operacionais"
        icon={DollarSign}
        iconColor="bg-emerald-500/10"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Parametrizações', path: '/parametrizacoes' },
          { label: 'Estrutura dos Módulos', path: '/parametrizacoes/estrutura-modulos' },
          { label: 'Custos Operacionais' }
        ]}
      />

      <DataTable
        columns={columns}
        data={costs}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        addLabel="Novo Custo"
        searchPlaceholder="Buscar custo..."
      />

      <FormDialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editing ? 'Editar Custo' : 'Novo Custo'}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Custo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              placeholder="Ex: LAVAGEM DE VEÍCULOS"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="desc">Descrição</Label>
            <Input
              id="desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição opcional"
              className="mt-1.5"
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}