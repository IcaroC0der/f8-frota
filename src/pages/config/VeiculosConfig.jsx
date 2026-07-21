import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormDialog from '@/components/shared/FormDialog';

export default function VeiculosConfig() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['vehicleCategories'],
    queryFn: () => base44.entities.VehicleCategory.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VehicleCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleCategories'] });
      closeDialog();
      toast.success('Categoria criada com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VehicleCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleCategories'] });
      closeDialog();
      toast.success('Categoria atualizada com sucesso!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VehicleCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleCategories'] });
      toast.success('Categoria excluída com sucesso!');
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
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Informe o nome da categoria');
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
      label: 'Categoria',
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
        title="Categorias de Veículos"
        subtitle="Gerencie as categorias de veículos da frota"
        icon={Truck}
        iconColor="bg-blue-500/10"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Parametrizações', path: '/parametrizacoes' },
          { label: 'Estrutura dos Módulos', path: '/parametrizacoes/estrutura-modulos' },
          { label: 'Veículos' }
        ]}
      />

      <DataTable
        columns={columns}
        data={categories}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        addLabel="Nova Categoria"
        searchPlaceholder="Buscar categoria..."
      />

      <FormDialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editing ? 'Editar Categoria' : 'Nova Categoria'}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Categoria *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              placeholder="Ex: AMAROK"
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