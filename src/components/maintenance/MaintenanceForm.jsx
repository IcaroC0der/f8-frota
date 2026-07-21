import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const empty = {
  date: new Date().toISOString().split('T')[0],
  plate: '',
  vehicle_model: '',
  category_name: '',
  classification: '',
  cost_group: '',
  cost_type: '',
  supplier: '',
  invoice_number: '',
  total_value: '',
  km: '',
  attachment_url: '',
  observation: '',
};

export default function MaintenanceForm({ open, onClose, onSubmit, isLoading, record }) {
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);

  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list() });
  const { data: costTypes = [] } = useQuery({ queryKey: ['maintenanceCostTypes'], queryFn: () => base44.entities.MaintenanceCostType.list() });
  const { data: classifications = [] } = useQuery({ queryKey: ['maintenanceClassifications'], queryFn: () => base44.entities.MaintenanceClassification.list() });

  useEffect(() => {
    if (open) setForm(record ? { ...empty, ...record, total_value: record.total_value ?? '', km: record.km ?? '' } : empty);
  }, [open, record]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePlateChange = (plate) => {
    const veh = vehicles.find(v => v.plate === plate);
    setForm(f => ({
      ...f,
      plate,
      vehicle_model: veh?.vehicle_model || '',
      category_name: veh?.category_name || '',
    }));
  };

  const handleClassificationChange = (val) => {
    setForm(f => ({ ...f, classification: val, cost_group: '', cost_type: '' }));
  };

  const handleCostGroupChange = (val) => {
    setForm(f => ({ ...f, cost_group: val, cost_type: '' }));
  };

  const filteredGroups = [...new Set(
    costTypes.filter(ct => !form.classification || ct.classification === form.classification).map(ct => ct.cost_group)
  )];

  const filteredTypes = costTypes.filter(
    ct => (!form.classification || ct.classification === form.classification) && (!form.cost_group || ct.cost_group === form.cost_group)
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('attachment_url', file_url);
    setUploading(false);
    toast.success('Arquivo anexado!');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.plate || !form.classification || !form.cost_group || !form.cost_type || !form.total_value) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    onSubmit({
      ...form,
      total_value: Number(form.total_value),
      km: form.km ? Number(form.km) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            {record ? 'Editar Lançamento' : 'Novo Lançamento de Manutenção'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Data */}
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="mt-1.5" />
            </div>
            {/* Placa */}
            <div>
              <Label>Placa *</Label>
              <Select value={form.plate} onValueChange={handlePlateChange}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione a placa..." /></SelectTrigger>
                <SelectContent>
                  {vehicles.filter(v => v.is_active !== false).sort((a, b) => (a.plate || '').localeCompare(b.plate || '')).map(v => (
                    <SelectItem key={v.id} value={v.plate}>{v.plate} {v.vehicle_model ? `— ${v.vehicle_model}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Categoria (auto) */}
            <div>
              <Label>Categoria do Veículo</Label>
              <Input value={form.category_name} readOnly className="mt-1.5 bg-muted/50 cursor-default" placeholder="Preenchido automaticamente" />
            </div>
            {/* Classificação */}
            <div>
              <Label>Classificação *</Label>
              <Select value={form.classification} onValueChange={handleClassificationChange}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {classifications.filter(c => c.is_active !== false).map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Custo */}
            <div>
              <Label>Custo (Grupo) *</Label>
              <Select value={form.cost_group} onValueChange={handleCostGroupChange} disabled={!form.classification}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {filteredGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Tipo de custo */}
            <div>
              <Label>Tipo de Custo *</Label>
              <Select value={form.cost_type} onValueChange={v => set('cost_type', v)} disabled={!form.cost_group}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {filteredTypes.map(ct => <SelectItem key={ct.id} value={ct.cost_type}>{ct.cost_type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Fornecedor */}
            <div>
              <Label>Fornecedor</Label>
              <Input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Nome do fornecedor" className="mt-1.5" />
            </div>
            {/* Nº Nota */}
            <div>
              <Label>Nº da Nota Fiscal</Label>
              <Input value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} placeholder="Número da NF" className="mt-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Valor */}
            <div>
              <Label>Valor Total (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={form.total_value} onChange={e => set('total_value', e.target.value)} placeholder="0,00" className="mt-1.5" />
            </div>
            {/* KM */}
            <div>
              <Label>KM</Label>
              <Input type="number" min="0" value={form.km} onChange={e => set('km', e.target.value)} placeholder="Ex: 125000" className="mt-1.5" />
            </div>
          </div>

          {/* Anexo */}
          <div>
            <Label>Anexar Arquivo (PDF ou Imagem)</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                {uploading ? 'Enviando...' : 'Escolher arquivo'}
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
              {form.attachment_url && (
                <a href={form.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline truncate max-w-[200px]">
                  Visualizar anexo
                </a>
              )}
            </div>
          </div>

          {/* Observação */}
          <div>
            <Label>Observação</Label>
            <Textarea value={form.observation} onChange={e => set('observation', e.target.value)} placeholder="Informações adicionais..." className="mt-1.5 h-20 resize-none" />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading || uploading} className="bg-rose-600 hover:bg-rose-700 text-white">
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : record ? 'Salvar Alterações' : 'Lançar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}