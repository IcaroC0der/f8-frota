import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';

export default function FuelForm({ open, onClose, onSubmit, isLoading, record }) {
  const [form, setForm] = useState({
    date: '',
    invoice_number: '',
    supplier: '',
    plate: '',
    vehicle_model: '',
    category_name: '',
    category_id: '',
    cost_name: '',
    cost_type: '',
    km: '',
    quantity: '',
    unit: 'LT',
    total_value: '',
    observation: '',
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-form'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: vehicleCategories = [] } = useQuery({
    queryKey: ['vehicle-categories'],
    queryFn: () => base44.entities.VehicleCategory.list(),
  });

  const { data: fuelCostTypes = [] } = useQuery({
    queryKey: ['fuel-cost-types'],
    queryFn: () => base44.entities.FuelCostType.list(),
  });

  // Unique cost_name list
  const costNames = [...new Set(fuelCostTypes.map(f => f.cost_name))];

  const costTypesForName = fuelCostTypes.filter(f => f.cost_name === form.cost_name).map(f => f.cost_type);

  // Category options from VehicleCategory entity
  const categoryOptions = ['Todas', ...vehicleCategories.filter(c => c.is_active).map(c => c.name).sort()];

  useEffect(() => {
    if (record) {
      setForm({ ...record, km: record.km || '', quantity: record.quantity || '', total_value: record.total_value || '' });
    } else {
      setForm({ date: '', invoice_number: '', supplier: '', plate: '', vehicle_model: '', category_name: '', category_id: '', cost_name: '', cost_type: '', km: '', quantity: '', unit: 'LT', total_value: '', observation: '' });
    }
  }, [record, open]);

  const handlePlateChange = (plate) => {
    const v = vehicles.find(v => v.plate === plate);
    setForm(f => ({
      ...f,
      plate,
      vehicle_model: v ? v.vehicle_model : '',
      category_name: v ? v.category_name : '',
      category_id: v ? v.category_id : '',
    }));
  };

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      km: form.km ? Number(form.km) : null,
      quantity: Number(form.quantity),
      total_value: Number(form.total_value),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? 'Editar Abastecimento' : 'Lançar Abastecimento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Nro Nota</Label>
              <Input value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} placeholder="Ex: 13918" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Fornecedor</Label>
            <Input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Nome do fornecedor" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Veículo (Placa) *</Label>
              <Select value={form.plate} onValueChange={handlePlateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a placa" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.plate}>{v.plate} — {v.vehicle_model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category_name} onValueChange={v => set('category_name', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Custo *</Label>
              <Select value={form.cost_name} onValueChange={v => set('cost_name', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {costNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de Custo *</Label>
              <Select value={form.cost_type} onValueChange={v => set('cost_type', v)} disabled={!form.cost_name}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {costTypesForName.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>KM</Label>
              <Input type="number" value={form.km} onChange={e => set('km', e.target.value)} placeholder="Ex: 88855" />
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade *</Label>
              <Input type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} required placeholder="Ex: 201" />
            </div>
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Select value={form.unit} onValueChange={v => set('unit', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LT">LT</SelectItem>
                  <SelectItem value="UN">UN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Valor Total (R$) *</Label>
            <Input type="number" step="0.01" value={form.total_value} onChange={e => set('total_value', e.target.value)} required placeholder="Ex: 1477.35" />
          </div>

          <div className="space-y-1.5">
            <Label>Observação</Label>
            <Input value={form.observation} onChange={e => set('observation', e.target.value)} placeholder="Ex: JUNIOR" />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="gap-2">
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2 bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}