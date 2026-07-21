import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';

export default function FormDialog({ open, onClose, title, onSubmit, children, isLoading }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4 py-2">
          {children}
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