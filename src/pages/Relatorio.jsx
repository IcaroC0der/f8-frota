import React, { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Download, Printer, Filter, X, RefreshCw, BarChart3 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import RelatorioKPIs from '@/components/relatorio/RelatorioKPIs';
import RelatorioCharts from '@/components/relatorio/RelatorioCharts';
import RelatorioTable from '@/components/relatorio/RelatorioTable';
import RelatorioFilters from '@/components/relatorio/RelatorioFilters';
import PlatesSummaryTable from '@/components/relatorio/PlatesSummaryTable';
import { gerarPDF } from '@/components/relatorio/relatorioPDF';
import ExportAnalise from '@/components/relatorio/ExportAnalise';

export default function Relatorio() {
  const reportRef = useRef(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    category: 'Todos',
    supplier: 'Todos',
    costCenter: 'Todos',
    type: 'Todos',
    plates: [],
    costName: 'Todos',
  });

  const { data: fuelRecords = [], isLoading: l1 } = useQuery({
    queryKey: ['fuel-relatorio'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 5000),
  });
  const { data: maintenanceRecords = [], isLoading: l2 } = useQuery({
    queryKey: ['maint-relatorio'],
    queryFn: () => base44.entities.MaintenanceRecord.list('-date', 5000),
  });
  const { data: operationalRecords = [], isLoading: l3 } = useQuery({
    queryKey: ['op-relatorio'],
    queryFn: () => base44.entities.OperationalCostRecord.list('-date', 5000),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-relatorio'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const isLoading = l1 || l2 || l3;

  // Map plate -> category_name and vehicle_model from Vehicle entity
  const plateVehicleMap = useMemo(() => {
    const map = {};
    vehicles.forEach(v => {
      if (v.plate) map[v.plate] = { category: v.category_name || '', model: v.vehicle_model || '' };
    });
    return map;
  }, [vehicles]);

  // Unify all records — category and model always resolved from Vehicle plate map first
  const allRecords = useMemo(() => {
    const getCategory = (r) =>
      (r.plate ? plateVehicleMap[r.plate]?.category : null) || r.category_name || 'Sem Categoria';
    const getModel = (r) =>
      (r.plate ? plateVehicleMap[r.plate]?.model : null) || r.vehicle_model || '';

    const fuel = fuelRecords.map(r => ({ ...r, _type: 'Abastecimento', _category: getCategory(r), vehicle_model: getModel(r) }));
    const maint = maintenanceRecords.map(r => ({ ...r, _type: 'Manutenção', _category: getCategory(r), vehicle_model: getModel(r) }));
    const op = operationalRecords.map(r => ({ ...r, _type: 'Operacional', _category: getCategory(r), vehicle_model: getModel(r) }));
    return [...fuel, ...maint, ...op];
  }, [fuelRecords, maintenanceRecords, operationalRecords, plateVehicleMap]);

  // Filter options
  const filterOptions = useMemo(() => {
    const categories = ['Todos', ...new Set(allRecords.map(r => r._category).filter(Boolean))].sort();
    const suppliers = ['Todos', ...new Set(allRecords.map(r => r.supplier).filter(Boolean))].sort();
    const plates = ['Todos', ...new Set(allRecords.map(r => r.plate).filter(Boolean))].sort();
    const types = ['Todos', 'Abastecimento', 'Manutenção', 'Operacional'];
    const costNames = ['Todos', ...new Set(allRecords.map(r => r.cost_name || r.classification || '').filter(Boolean))].sort();
    return { categories, suppliers, plates, types, costNames };
  }, [allRecords]);

  // Apply filters
  const filtered = useMemo(() => {
    return allRecords.filter(r => {
      if (filters.dateFrom && r.date < filters.dateFrom) return false;
      if (filters.dateTo && r.date > filters.dateTo) return false;
      if (filters.category !== 'Todos' && r._category !== filters.category) return false;
      if (filters.supplier !== 'Todos' && r.supplier !== filters.supplier) return false;
      if (filters.type !== 'Todos' && r._type !== filters.type) return false;
      if (filters.plates && filters.plates.length > 0 && !filters.plates.includes(r.plate)) return false;
      if (filters.costName !== 'Todos') {
        const costField = r.cost_name || r.classification || '';
        if (costField !== filters.costName) return false;
      }
      return true;
    });
  }, [allRecords, filters]);

  const handleExportPDF = () => {
    gerarPDF({ filtered, filters, vehicles });
  };

  const handlePrint = () => {
    window.print();
  };

  const clearFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', category: 'Todos', supplier: 'Todos', costCenter: 'Todos', type: 'Todos', plates: [], costName: 'Todos' });
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo ||
    filters.category !== 'Todos' || filters.supplier !== 'Todos' || filters.type !== 'Todos' || (filters.plates && filters.plates.length > 0) || filters.costName !== 'Todos';

  return (
    <>
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="max-w-screen-2xl mx-auto p-4 md:p-6 space-y-5" ref={reportRef}>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Relatório Geral de Custos</h1>
              <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-widest">Visão consolidada · Todos os módulos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200 transition-colors">
                <X className="w-3.5 h-3.5" /> Limpar filtros
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
            >
              <Filter className="w-3.5 h-3.5" /> Filtros
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-400" />}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:border-slate-300 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-blue-500 text-white text-xs font-bold shadow-md shadow-violet-500/20 hover:shadow-lg transition-all"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Exportar Análise
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Exportar PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="print:hidden">
            <RelatorioFilters filters={filters} setFilters={setFilters} options={filterOptions} />
          </motion.div>
        )}

        {isLoading ? (
          <div className="h-64 flex items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Carregando dados...</span>
          </div>
        ) : (
          <>
            {/* Print Header */}
            <div className="hidden print:block mb-6 border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Relatório Geral de Custos</h1>
                  <p className="text-sm text-slate-500 mt-1">Emitido em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  {filters.dateFrom && <p>De: {filters.dateFrom}</p>}
                  {filters.dateTo && <p>Até: {filters.dateTo}</p>}
                </div>
              </div>
            </div>

            {/* KPIs */}
            <RelatorioKPIs filtered={filtered} allRecords={allRecords} />

            {/* Charts */}
            <RelatorioCharts filtered={filtered} />

            {/* Plates Summary — shown only when plates are selected */}
            {filters.plates && filters.plates.length > 0 && (
              <PlatesSummaryTable filtered={filtered} />
            )}

            {/* Table */}
            <RelatorioTable filtered={filtered} />
          </>
        )}
      </div>
    </div>
    <ExportAnalise open={showExport} onClose={() => setShowExport(false)} filtered={filtered} allRecords={allRecords} filters={filters} vehicles={vehicles} />
    </>
  );
}