import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Wrench } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormDialog from '@/components/shared/FormDialog';

export default function ManutencaoConfig() {
  const [tab, setTab] = useState('cost_types');
  const queryClient = useQueryClient();

  // Classifications
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [classEditing, setClassEditing] = useState(null);
  const [classForm, setClassForm] = useState({ name: '' });

  const { data: classifications = [], isLoading: loadingClass } = useQuery({
    queryKey: ['maintenanceClassifications'],
    queryFn: () => base44.entities.MaintenanceClassification.list(),
  });

  const createClassMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceClassification.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceClassifications'] });
      setClassDialogOpen(false);
      toast.success('Classificação criada!');
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceClassification.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceClassifications'] });
      setClassDialogOpen(false);
      toast.success('Classificação atualizada!');
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceClassification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceClassifications'] });
      toast.success('Classificação excluída!');
    },
  });

  // Cost Types
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [costEditing, setCostEditing] = useState(null);
  const [costForm, setCostForm] = useState({ classification: '', cost_group: '', cost_type: '' });

  const { data: costTypes = [], isLoading: loadingCosts } = useQuery({
    queryKey: ['maintenanceCostTypes'],
    queryFn: () => base44.entities.MaintenanceCostType.list(),
  });

  const createCostMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceCostType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceCostTypes'] });
      setCostDialogOpen(false);
      toast.success('Tipo de custo criado!');
    },
  });

  const updateCostMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceCostType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceCostTypes'] });
      setCostDialogOpen(false);
      toast.success('Tipo de custo atualizado!');
    },
  });

  const deleteCostMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceCostType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceCostTypes'] });
      toast.success('Tipo de custo excluído!');
    },
  });

  const classColumns = [
    { key: 'name', label: 'Classificação', render: (val) => <span className="font-semibold">{val}</span> },
    {
      key: 'is_active', label: 'Status',
      render: (val) => <Badge variant="secondary" className={val !== false ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}>{val !== false ? 'Ativo' : 'Inativo'}</Badge>
    },
  ];

  const classificationColorMap = {
    'CORRETIVO': 'bg-rose-100 text-rose-700 border-rose-200',
    'PREVENTIVO': 'bg-blue-100 text-blue-700 border-blue-200',
  };

  const costGroupColorMap = {
    'PNEU': 'bg-orange-100 text-orange-700 border-orange-200',
    'PEÇAS': 'bg-purple-100 text-purple-700 border-purple-200',
    'SERVIÇOS': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  };

  const costColumns = [
    {
      key: 'classification', label: 'Classificação',
      render: (val) => <Badge className={classificationColorMap[val] || 'bg-muted text-muted-foreground'}>{val}</Badge>
    },
    {
      key: 'cost_group', label: 'Custo',
      render: (val) => <Badge className={costGroupColorMap[val] || 'bg-muted text-muted-foreground'}>{val}</Badge>
    },
    { key: 'cost_type', label: 'Tipo de Custo', render: (val) => <span className="font-semibold">{val}</span> },
    {
      key: 'is_active', label: 'Status',
      render: (val) => <Badge variant="secondary" className={val !== false ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}>{val !== false ? 'Ativo' : 'Inativo'}</Badge>
    },
  ];

  if (loadingClass || loadingCosts) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <PageHeader
        title="Manutenção"
        subtitle="Gerencie classificações e tipos de custo de manutenção"
        icon={Wrench}
        iconColor="bg-rose-500/10"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Parametrizações', path: '/parametrizacoes' },
          { label: 'Estrutura dos Módulos', path: '/parametrizacoes/estrutura-modulos' },
          { label: 'Manutenção' }
        ]}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 bg-card border shadow-sm">
          <TabsTrigger value="cost_types" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Tipos de Custo
          </TabsTrigger>
          <TabsTrigger value="classifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Classificações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classifications">
          <DataTable
            columns={classColumns}
            data={classifications}
            onAdd={() => { setClassEditing(null); setClassForm({ name: '' }); setClassDialogOpen(true); }}
            onEdit={(row) => { setClassEditing(row); setClassForm({ name: row.name }); setClassDialogOpen(true); }}
            onDelete={(id) => deleteClassMutation.mutate(id)}
            addLabel="Nova Classificação"
            searchPlaceholder="Buscar classificação..."
          />
          <FormDialog
            open={classDialogOpen}
            onClose={() => setClassDialogOpen(false)}
            title={classEditing ? 'Editar Classificação' : 'Nova Classificação'}
            onSubmit={() => {
              if (!classForm.name.trim()) { toast.error('Informe o nome'); return; }
              if (classEditing) {
                updateClassMutation.mutate({ id: classEditing.id, data: { ...classForm, is_active: true } });
              } else {
                createClassMutation.mutate({ ...classForm, is_active: true });
              }
            }}
          >
            <div>
              <Label>Nome *</Label>
              <Input value={classForm.name} onChange={(e) => setClassForm({ name: e.target.value.toUpperCase() })} placeholder="Ex: PREVENTIVO" className="mt-1.5" />
            </div>
          </FormDialog>
        </TabsContent>

        <TabsContent value="cost_types">
          <DataTable
            columns={costColumns}
            data={costTypes}
            onAdd={() => { setCostEditing(null); setCostForm({ classification: '', cost_group: '', cost_type: '' }); setCostDialogOpen(true); }}
            onEdit={(row) => { setCostEditing(row); setCostForm({ classification: row.classification, cost_group: row.cost_group, cost_type: row.cost_type }); setCostDialogOpen(true); }}
            onDelete={(id) => deleteCostMutation.mutate(id)}
            addLabel="Novo Tipo de Custo"
            searchPlaceholder="Buscar tipo de custo..."
          />
          <FormDialog
            open={costDialogOpen}
            onClose={() => setCostDialogOpen(false)}
            title={costEditing ? 'Editar Tipo de Custo' : 'Novo Tipo de Custo'}
            onSubmit={() => {
              if (!costForm.classification || !costForm.cost_group || !costForm.cost_type.trim()) {
                toast.error('Preencha todos os campos obrigatórios');
                return;
              }
              if (costEditing) {
                updateCostMutation.mutate({ id: costEditing.id, data: { ...costForm, is_active: true } });
              } else {
                createCostMutation.mutate({ ...costForm, is_active: true });
              }
            }}
          >
            <div className="space-y-4">
              <div>
                <Label>Classificação *</Label>
                <Select value={costForm.classification} onValueChange={(v) => setCostForm({ ...costForm, classification: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {classifications.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Custo *</Label>
                <Select value={costForm.cost_group} onValueChange={(v) => setCostForm({ ...costForm, cost_group: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PNEU">PNEU</SelectItem>
                    <SelectItem value="PEÇAS">PEÇAS</SelectItem>
                    <SelectItem value="SERVIÇOS">SERVIÇOS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Custo *</Label>
                <Input value={costForm.cost_type} onChange={(e) => setCostForm({ ...costForm, cost_type: e.target.value.toUpperCase() })} placeholder="Ex: FREIOS" className="mt-1.5" />
              </div>
            </div>
          </FormDialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}