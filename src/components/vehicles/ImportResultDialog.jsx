import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Copy, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

export default function ImportResultDialog({ result, onClose }) {
  if (!result) return null;

  const total = result.imported.length + result.duplicates.length;

  return (
    <Dialog open={!!result} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Info className="w-5 h-5 text-primary" />
            Resultado da Importação
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{result.imported.length}</p>
            <p className="text-xs text-emerald-700 mt-0.5">Importados</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{result.duplicates.length}</p>
            <p className="text-xs text-amber-700 mt-0.5">Duplicados</p>
          </div>
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-center">
            <p className="text-2xl font-bold text-rose-600">{result.noCategory.length}</p>
            <p className="text-xs text-rose-700 mt-0.5">Sem Categoria</p>
          </div>
        </div>

        {result.imported.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Importados com sucesso
            </p>
            <ScrollArea className="h-32 rounded-lg border bg-muted/30 p-2">
              <div className="flex flex-wrap gap-1.5">
                {result.imported.map((v) => (
                  <div key={v.plate} className="flex items-center gap-1">
                    <Badge className={`text-xs ${v.hasCategory ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                      {!v.hasCategory && <AlertTriangle className="w-2.5 h-2.5 mr-1" />}
                      {v.plate}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {result.duplicates.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-amber-500" /> Placas já cadastradas (ignoradas)
            </p>
            <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/30 p-2">
              {result.duplicates.map((p) => (
                <Badge key={p} className="bg-amber-100 text-amber-700 border-amber-200 text-xs">{p}</Badge>
              ))}
            </div>
          </div>
        )}

        {result.noCategory.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Categoria não encontrada no sistema
            </p>
            <p className="text-xs text-amber-600 mb-2">
              As placas abaixo foram importadas, mas requerem vinculação manual de categoria:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.noCategory.map((v) => (
                <Badge key={v.plate} className="bg-white border-amber-300 text-amber-700 text-xs">
                  {v.plate} <span className="ml-1 opacity-60">({v.category})</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button onClick={onClose} className="w-full mt-1 bg-primary hover:bg-primary/90">
          Fechar
        </Button>
      </DialogContent>
    </Dialog>
  );
}