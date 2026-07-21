import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Paperclip, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT = {
  date: '',
  cost_name: '',
  plate: '',
  supplier: '',
  invoice_number: '',
  total_value: '',
  km: '',
  attachment_url: '',
  observation: '',
};

export default function OperationalCostForm({ open, onClose, onSubmit, record, isLoading }) {
  const [form, setForm] = useState(DEFAULT);
  const [uploading, setUploading] = useState(false);

  const { data: costs = [] } = useQuery({
    queryKey: ['operationalCosts'],
    queryFn: () => base44.entities.OperationalCost.list(),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  useEffect(() => {
    if (record) {
      setForm({
        date: record.date || '',
        cost_name: record.cost_name || '',
        plate: record.plate || '',
        supplier: record.supplier || '',
        invoice_number: record.invoice_number || '',
        total_value: record.total_value != null ? String(record.total_value) : '',
        km: record.km != null ? String(record.km) : '',
        attachment_url: record.attachment_url || '',
        observation: record.observation || '',
      });
    } else {
      setForm({ ...DEFAULT, date: new Date().toISOString().split('T')[0] });
    }
  }, [record, open]);

  const handlePlateChange = (plate) => {
    const v = vehicles.find((v) => v.plate === plate);
    setForm((f) => ({
      ...f,
      plate,
      vehicle_model: v?.vehicle_model || '',
      category_name: v?.category_name || '',
    }));
  };

  const handleSubmit = () => {
    if (!form.date) { toast.error('Informe a data'); return; }
    if (!form.cost_name) { toast.error('Selecione o custo operacional'); return; }
    if (!form.total_value || isNaN(Number(form.total_value))) { toast.error('Informe o valor'); return; }

    onSubmit({
      ...form,
      total_value: Number(form.total_value),
      km: form.km ? Number(form.km) : undefined,
    });
  };

  const activeCosts = costs.filter((c) => c.is_active !== false);
  const f = (field) => (val) => setForm((p) => ({ ...p, [field]: val }));

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((p) => ({ ...p, attachment_url: file_url }));
      toast.success('Arquivo anexado!');
    } catch {
      toast.error('Falha ao enviar arquivo');
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? 'Editar Custo Operacional' : 'Novo Custo Operacional'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          {/* Data */}
          <div>
            <Label>Data *</Label>
            <Input type="date" className="mt-1.5" value={form.date} onChange={(e) => f('date')(e.target.value)} />
          </div>

          {/* Custo Operacional */}
          <div>
            <Label>Custo Operacional *</Label>
            <Select value={form.cost_name} onValueChange={f('cost_name')}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {activeCosts.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Placa */}
          <div>
            <Label>Placa (opcional)</Label>
            <Select value={form.plate || '__none__'} onValueChange={(v) => handlePlateChange(v === '__none__' ? '' : v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {[...vehicles].sort((a, b) => (a.plate || '').localeCompare(b.plate || '')).map((v) => (
                  <SelectItem key={v.id} value={v.plate}>{v.plate} {v.vehicle_model ? `— ${v.vehicle_model}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fornecedor */}
          <div>
            <Label>Fornecedor</Label>
            <Input className="mt-1.5" value={form.supplier} onChange={(e) => f('supplier')(e.target.value)} placeholder="Nome do fornecedor" />
          </div>

          {/* NF */}
          <div>
            <Label>Nº da Nota Fiscal</Label>
            <Input className="mt-1.5" value={form.invoice_number} onChange={(e) => f('invoice_number')(e.target.value)} placeholder="Ex: 12345" />
          </div>

          {/* Valor */}
          <div>
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" min="0" className="mt-1.5" value={form.total_value} onChange={(e) => f('total_value')(e.target.value)} placeholder="0,00" />
          </div>

          {/* KM */}
          <div>
            <Label>KM</Label>
            <Input type="number" min="0" className="mt-1.5" value={form.km} onChange={(e) => f('km')(e.target.value)} placeholder="Quilometragem" />
          </div>

          {/* Anexo */}
          <div className="sm:col-span-2">
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
          <div className="sm:col-span-2">
            <Label>Observação</Label>
            <Input className="mt-1.5" value={form.observation} onChange={(e) => f('observation')(e.target.value)} placeholder="Observações adicionais" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading || uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {record ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}