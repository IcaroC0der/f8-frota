import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2, Search, Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
'@/components/ui/alert-dialog';

export default function DataTable({
  columns,
  data,
  onEdit,
  onDelete,
  onAdd,
  addLabel = "Adicionar",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum registro encontrado"
}) {
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const filteredData = data.filter((row) =>
  columns.some((col) => {
    const val = row[col.key];
    return val && String(val).toLowerCase().includes(search.toLowerCase());
  })
  );

  return (
    <Card className="overflow-hidden border shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-4 border-b bg-card">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background" />
          
        </div>
        {onAdd &&
        <Button onClick={onAdd} className="gap-2 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20">
            <Plus className="w-4 h-4" />
            {addLabel}
          </Button>
        }
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table className="opacity-100">
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col) =>
              <TableHead key={col.key} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  {col.label}
                </TableHead>
              )}
              {(onEdit || onDelete) &&
              <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground w-28">
                  Ações
                </TableHead>
              }
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredData.length === 0 ?
              <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center py-12 text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow> :

              filteredData.map((row, idx) =>
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ delay: idx * 0.02 }}
                className="border-b hover:bg-muted/30 transition-colors">
                
                    {columns.map((col) =>
                <TableCell key={col.key} className="py-3">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </TableCell>
                )}
                    {(onEdit || onDelete) &&
                <TableCell className="text-right py-3">
                        <div className="flex items-center justify-end gap-1">
                          {onEdit &&
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onEdit(row)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                    }
                          {onDelete &&
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(row.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                    }
                        </div>
                      </TableCell>
                }
                  </motion.tr>
              )
              }
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      <div className="px-4 py-2.5 bg-muted/30 border-t text-xs text-muted-foreground">
        {filteredData.length} de {data.length} registro(s)
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                onDelete(deleteId);
                setDeleteId(null);
              }}>
              
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>);

}