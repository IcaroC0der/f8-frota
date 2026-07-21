import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Upload, Plus, Filter, CheckCircle2, AlertTriangle, X, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormDialog from '@/components/shared/FormDialog';
import ImportResultDialog from '@/components/vehicles/ImportResultDialog';

const EMPTY_FORM = {
  plate: '', category_name: '', category_id: '',
  vehicle_model: '', chassis: '', renavan: '',
  year: '', company: '', driver: '', tracker: false, is_active: true
};

export default function Veiculos() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['vehicleCategories'],
    queryFn: () => base44.entities.VehicleCategory.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      closeDialog();
      toast.success('Veículo cadastrado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      closeDialog();
      toast.success('Veículo atualizado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Veículo excluído!');
    },
  });

  const openAdd = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({
      plate: row.plate || '',
      category_name: row.category_name || '',
      category_id: row.category_id || '',
      vehicle_model: row.vehicle_model || '',
      chassis: row.chassis || '',
      renavan: row.renavan || '',
      year: row.year || '',
      company: row.company || '',
      driver: row.driver || '',
      tracker: row.tracker || false,
      is_active: row.is_active !== false,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setFormData(EMPTY_FORM);
  };

  const handleCategorySelect = (catName) => {
    const cat = categories.find(c => c.name === catName);
    setFormData(prev => ({
      ...prev,
      category_name: catName,
      category_id: cat ? cat.id : '',
    }));
  };

  const handleSubmit = () => {
    if (!formData.plate.trim()) { toast.error('Informe a placa'); return; }
    if (!formData.category_name) { toast.error('Selecione uma categoria'); return; }
    const plateUpper = formData.plate.toUpperCase().trim();
    const duplicate = vehicles.find(v => v.plate === plateUpper && (!editing || v.id !== editing.id));
    if (duplicate) { toast.error('Placa já cadastrada no sistema!'); return; }
    const payload = { ...formData, plate: plateUpper };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Import from file
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          vehicles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                vehicle_model: { type: "string" },
                chassis: { type: "string" },
                renavan: { type: "string" },
                tracker: { type: "string" },
                plate: { type: "string" },
                year: { type: "string" },
                company: { type: "string" },
                driver: { type: "string" }
              }
            }
          }
        }
      }
    });

    const rows = extracted?.output?.vehicles || [];
    const existingPlates = new Set(vehicles.map(v => v.plate?.toUpperCase()));
    const results = { imported: [], duplicates: [], noCategory: [], errors: [] };

    for (const row of rows) {
      const plate = (row.plate || '').toUpperCase().trim();
      if (!plate) continue;
      if (existingPlates.has(plate)) { results.duplicates.push(plate); continue; }

      const catRaw = (row.category || '').toUpperCase().trim()
        .replace('BI - CAÇAMBA', 'BI-CAÇAMBA')
        .replace('CESTO AEREO', 'CESTO AÉREO')
        .replace('PRESIDENCIA', 'PRESIDÊNCIA')
        .replace('OUTROS ', 'OUTROS');

      const cat = categories.find(c =>
        c.name.toUpperCase() === catRaw ||
        c.name.toUpperCase().replace(/[^A-Z0-9]/g, '') === catRaw.replace(/[^A-Z0-9]/g, '')
      );

      const payload = {
        plate,
        category_name: cat ? cat.name : (row.category || '').toUpperCase().trim(),
        category_id: cat ? cat.id : '',
        vehicle_model: (row.vehicle_model || '').toUpperCase(),
        chassis: row.chassis || '',
        renavan: row.renavan || '',
        year: row.year || '',
        company: row.company || '',
        driver: row.driver || '',
        tracker: (row.tracker || '').toUpperCase() === 'SIM',
        is_active: true,
      };

      await base44.entities.Vehicle.create(payload);
      existingPlates.add(plate);
      results.imported.push({ plate, category: payload.category_name, hasCategory: !!cat });
      if (!cat) results.noCategory.push({ plate, category: payload.category_name });
    }

    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    setImportResult(results);
    setImporting(false);
    fileInputRef.current.value = '';
  };

  // Filter data
  const companies = [...new Set(vehicles.map(v => v.company).filter(Boolean))].sort();
  const filteredVehicles = vehicles.filter(v => {
    const catMatch = filterCategory === 'all' || v.category_name === filterCategory;
    const compMatch = filterCompany === 'all' || v.company === filterCompany;
    return catMatch && compMatch;
  });

  // Stats
  const stats = [
    { label: 'Total de Veículos', value: vehicles.length, color: 'bg-blue-500', text: 'text-blue-600' },
    { label: 'Com Rastreador', value: vehicles.filter(v => v.tracker).length, color: 'bg-emerald-500', text: 'text-emerald-600' },
    { label: 'Sem Rastreador', value: vehicles.filter(v => !v.tracker).length, color: 'bg-amber-500', text: 'text-amber-600' },
    { label: 'Categorias Ativas', value: [...new Set(vehicles.map(v => v.category_name))].length, color: 'bg-violet-500', text: 'text-violet-600' },
  ];

  const columns = [
    {
      key: 'plate',
      label: 'Placa',
      render: (val) => (
        <span className="font-bold text-foreground tracking-widest bg-muted px-2 py-0.5 rounded text-sm">{val}</span>
      )
    },
    {
      key: 'category_name',
      label: 'Categoria',
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          {!row.category_id && (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Categoria não vinculada ao cadastro" />
          )}
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-medium">{val}</Badge>
        </div>
      )
    },
    {
      key: 'vehicle_model',
      label: 'Modelo',
      render: (val) => <span className="text-sm text-foreground">{val || '—'}</span>
    },
    {
      key: 'year',
      label: 'Ano',
      render: (val) => <span className="text-sm text-muted-foreground">{val || '—'}</span>
    },
    {
      key: 'company',
      label: 'Empresa',
      render: (val) => <span className="text-xs text-muted-foreground">{val || '—'}</span>
    },
    {
      key: 'tracker',
      label: 'Rastreador',
      render: (val) => val
        ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"><Wifi className="w-3 h-3" />SIM</Badge>
        : <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><WifiOff className="w-3 h-3" />NÃO</Badge>
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <Badge variant="secondary" className={val !== false ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>
          {val !== false ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
  ];

  if (loadingVehicles) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <PageHeader
        title="Veículos"
        subtitle="Cadastro e gerenciamento da frota"
        icon={Truck}
        iconColor="bg-blue-500/10"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Veículos' }
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.color} bg-opacity-15 flex items-center justify-center`}>
                  <span className={`text-xl font-extrabold ${s.text}`}>{s.value}</span>
                </div>
                <span className="text-sm text-muted-foreground font-medium">{s.label}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters + Import */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-card border rounded-xl px-3 py-2 shadow-sm">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="border-0 shadow-none h-7 w-44 bg-transparent focus:ring-0 p-0 text-sm">
              <SelectValue placeholder="Filtrar Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 bg-card border rounded-xl px-3 py-2 shadow-sm">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="border-0 shadow-none h-7 w-52 bg-transparent focus:ring-0 p-0 text-sm">
              <SelectValue placeholder="Filtrar Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Empresas</SelectItem>
              {companies.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex gap-2">
          <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="gap-2 border-dashed"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importando...' : 'Importar Arquivo'}
          </Button>
          <Button onClick={openAdd} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20">
            <Plus className="w-4 h-4" /> Novo Veículo
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredVehicles}
        onEdit={openEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        searchPlaceholder="Buscar por placa, modelo, empresa..."
      />

      {/* Form Dialog */}
      <FormDialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editing ? 'Editar Veículo' : 'Novo Veículo'}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <Label>Placa *</Label>
            <Input value={formData.plate} onChange={e => setFormData(p => ({ ...p, plate: e.target.value.toUpperCase() }))} placeholder="AAA-0000" className="mt-1.5" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>Categoria *</Label>
            <Select value={formData.category_name} onValueChange={handleCategorySelect}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Modelo do Veículo</Label>
            <Input value={formData.vehicle_model} onChange={e => setFormData(p => ({ ...p, vehicle_model: e.target.value.toUpperCase() }))} placeholder="Ex: VW GOL" className="mt-1.5" />
          </div>
          <div>
            <Label>Chassi</Label>
            <Input value={formData.chassis} onChange={e => setFormData(p => ({ ...p, chassis: e.target.value }))} placeholder="Nº chassi" className="mt-1.5" />
          </div>
          <div>
            <Label>RENAVAN</Label>
            <Input value={formData.renavan} onChange={e => setFormData(p => ({ ...p, renavan: e.target.value }))} placeholder="Nº RENAVAN" className="mt-1.5" />
          </div>
          <div>
            <Label>Ano</Label>
            <Input value={formData.year} onChange={e => setFormData(p => ({ ...p, year: e.target.value }))} placeholder="Ex: 2024" className="mt-1.5" />
          </div>
          <div>
            <Label>Empresa</Label>
            <Input value={formData.company} onChange={e => setFormData(p => ({ ...p, company: e.target.value }))} placeholder="Empresa proprietária" className="mt-1.5" />
          </div>
          <div className="col-span-2">
            <Label>Motorista</Label>
            <Input value={formData.driver} onChange={e => setFormData(p => ({ ...p, driver: e.target.value }))} placeholder="Nome do motorista" className="mt-1.5" />
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-xl border p-3 bg-muted/30">
            <div>
              <p className="text-sm font-medium">Rastreador</p>
              <p className="text-xs text-muted-foreground">Possui sistema de rastreamento</p>
            </div>
            <Switch checked={formData.tracker} onCheckedChange={v => setFormData(p => ({ ...p, tracker: v }))} />
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-xl border p-3 bg-muted/30">
            <div>
              <p className="text-sm font-medium">Veículo Ativo</p>
              <p className="text-xs text-muted-foreground">Veículo em operação na frota</p>
            </div>
            <Switch checked={formData.is_active} onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))} />
          </div>
        </div>
      </FormDialog>

      {/* Import Result */}
      <ImportResultDialog result={importResult} onClose={() => setImportResult(null)} />
    </div>
  );
}