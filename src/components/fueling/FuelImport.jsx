import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react';

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const FUEL_RECORD_SCHEMA = {
  type: 'object',
  properties: {
    date: { type: 'string', description: 'Data do abastecimento (AAAA-MM-DD)' },
    invoice_number: { type: 'string', description: 'Número da nota fiscal' },
    supplier: { type: 'string', description: 'Fornecedor' },
    plate: { type: 'string', description: 'Placa do veículo' },
    vehicle_model: { type: 'string', description: 'Modelo do veículo' },
    category_name: { type: 'string', description: 'Categoria do veículo' },
    category_id: { type: 'string', description: 'ID da categoria do veículo' },
    cost_name: { type: 'string', description: 'Custo (ex: TANQUE, COMBUSTÍVEIS)' },
    cost_type: { type: 'string', description: 'Tipo de custo (ex: DIESEL, GASOLINA)' },
    km: { type: 'number', description: 'Quilometragem' },
    quantity: { type: 'number', description: 'Quantidade abastecida' },
    unit: { type: 'string', description: 'Unidade (LT ou UN)' },
    total_value: { type: 'number', description: 'Valor total' },
    observation: { type: 'string', description: 'Observação' },
  },
  required: ['date', 'plate', 'cost_name', 'cost_type', 'quantity', 'total_value'],
};

export default function FuelImport({ open, onClose }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('upload'); // upload | extracting | preview | importing | done
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError('');
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setStep('extracting');
    setError('');
    try {
      // Upload file
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      // Extract data
      const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadRes.file_url,
        json_schema: FUEL_RECORD_SCHEMA,
      });
      if (extractRes.status === 'error') {
        throw new Error(extractRes.details || 'Erro ao extrair dados do arquivo');
      }
      const output = Array.isArray(extractRes.output) ? extractRes.output : (extractRes.output ? [extractRes.output] : []);
      if (output.length === 0) {
        throw new Error('Nenhum dado encontrado no arquivo');
      }
      setExtractedData(output);
      setStep('preview');
    } catch (err) {
      setError(err.message || 'Erro ao processar arquivo');
      setStep('upload');
    }
  };

  const handleImport = async () => {
    setStep('importing');
    setError('');
    try {
      const records = extractedData.map((r) => ({
        date: r.date || '',
        invoice_number: r.invoice_number || '',
        supplier: r.supplier || '',
        plate: r.plate || '',
        vehicle_model: r.vehicle_model || '',
        category_name: r.category_name || '',
        category_id: r.category_id || '',
        cost_name: r.cost_name || '',
        cost_type: r.cost_type || '',
        km: r.km != null ? Number(r.km) : null,
        quantity: r.quantity != null ? Number(r.quantity) : 0,
        unit: r.unit || 'LT',
        total_value: r.total_value != null ? Number(r.total_value) : 0,
        observation: r.observation || '',
      }));

      await base44.entities.FuelRecord.bulkCreate(records);
      setImportResult({ total: records.length });
      queryClient.invalidateQueries({ queryKey: ['fuel-records'] });
      setStep('done');
    } catch (err) {
      setError(err.message || 'Erro ao importar registros');
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setExtractedData([]);
    setImportResult(null);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {step === 'done' ? 'Importação Concluída' : 'Importar Abastecimentos'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">
                Selecione um arquivo CSV, Excel, JSON ou PDF
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Os dados serão extraídos e mapeados automaticamente para os campos de abastecimento
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.json,.pdf"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500
                  file:mr-4 file:py-2 file:px-6 file:rounded-lg file:border-0
                  file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90 file:cursor-pointer"
              />
              {file && (
                <p className="text-xs text-emerald-600 mt-3 font-medium">
                  ✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} className="gap-2">
                <X className="w-4 h-4" /> Cancelar
              </Button>
              <Button onClick={handleExtract} disabled={!file} className="gap-2">
                <Upload className="w-4 h-4" /> Extrair Dados
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Extracting */}
        {step === 'extracting' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-slate-600">Processando arquivo e extraindo dados...</p>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                {extractedData.length} registro(s) encontrado(s)
              </p>
              <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                Pré-visualização
              </Badge>
            </div>

            <ScrollArea className="h-64 rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b sticky top-0">
                    <th className="py-2 px-2 text-left text-slate-500 font-semibold uppercase whitespace-nowrap">Data</th>
                    <th className="py-2 px-2 text-left text-slate-500 font-semibold uppercase whitespace-nowrap">Placa</th>
                    <th className="py-2 px-2 text-left text-slate-500 font-semibold uppercase whitespace-nowrap">Custo</th>
                    <th className="py-2 px-2 text-left text-slate-500 font-semibold uppercase whitespace-nowrap">Tipo</th>
                    <th className="py-2 px-2 text-right text-slate-500 font-semibold uppercase whitespace-nowrap">Qtd</th>
                    <th className="py-2 px-2 text-right text-slate-500 font-semibold uppercase whitespace-nowrap">Valor</th>
                    <th className="py-2 px-2 text-left text-slate-500 font-semibold uppercase whitespace-nowrap">Fornecedor</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedData.map((r, i) => (
                    <tr key={i} className={`border-b hover:bg-blue-50/30 ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                      <td className="py-1.5 px-2 whitespace-nowrap">{r.date || '—'}</td>
                      <td className="py-1.5 px-2 font-mono font-bold whitespace-nowrap">{r.plate || '—'}</td>
                      <td className="py-1.5 px-2 max-w-[100px] truncate">{r.cost_name || '—'}</td>
                      <td className="py-1.5 px-2 whitespace-nowrap">{r.cost_type || '—'}</td>
                      <td className="py-1.5 px-2 text-right whitespace-nowrap">{r.quantity || '—'}</td>
                      <td className="py-1.5 px-2 text-right font-semibold whitespace-nowrap">{formatCurrency(r.total_value)}</td>
                      <td className="py-1.5 px-2 max-w-[120px] truncate">{r.supplier || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { setStep('upload'); setExtractedData([]); }} className="gap-2">
                <X className="w-4 h-4" /> Voltar
              </Button>
              <Button onClick={handleImport} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Confirmar Importação ({extractedData.length})
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <p className="text-sm text-slate-600">Importando {extractedData.length} registro(s)...</p>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 'done' && importResult && (
          <div className="space-y-4 py-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-lg font-bold text-emerald-700">
                {importResult.total} registro(s) importado(s) com sucesso!
              </p>
              <p className="text-sm text-emerald-600 mt-1">
                Os lançamentos já estão disponíveis na base de dados para consultas, relatórios e análises.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}