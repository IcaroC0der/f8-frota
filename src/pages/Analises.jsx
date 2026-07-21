import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart2, Wrench, Fuel } from 'lucide-react';

import DashboardKPIs from '@/components/dashboard/DashboardKPIs';
import DashboardCostEvolution from '@/components/dashboard/DashboardCostEvolution';
import DashboardCostBreakdown from '@/components/dashboard/DashboardCostBreakdown';
import DashboardTopVehicles from '@/components/dashboard/DashboardTopVehicles';
import DashboardMaintenanceByGroup from '@/components/dashboard/DashboardMaintenanceByGroup';
import DashboardOperationalCosts from '@/components/dashboard/DashboardOperationalCosts';
import DashboardCostComparison from '@/components/dashboard/DashboardCostComparison';
import DashboardCostByCategory from '@/components/dashboard/DashboardCostByCategory';
import MaintenanceAnalysisCharts from '@/components/maintenance/MaintenanceAnalysisCharts';
import MaintenanceDashboard from '@/components/maintenance/MaintenanceDashboard';
import FuelDashboard from '@/components/fuel/FuelDashboard';

const TABS = [
  { id: 'geral', label: 'Visão Geral', icon: BarChart2 },
  { id: 'manutencao', label: 'Manutenção', icon: Wrench },
  { id: 'abastecimento', label: 'Abastecimento', icon: Fuel },
];

export default function Analises() {
  const [tab, setTab] = useState('geral');

  // Check for ?tab=manutencao in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'manutencao') setTab('manutencao');
  }, []);

  const { data: fuelRecords = [] } = useQuery({
    queryKey: ['fuel-records-analises'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 2000),
  });
  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['maint-records-analises'],
    queryFn: () => base44.entities.MaintenanceRecord.list('-date', 2000),
  });
  const { data: operationalRecords = [] } = useQuery({
    queryKey: ['op-records-analises'],
    queryFn: () => base44.entities.OperationalCostRecord.list('-date', 2000),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-analises'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const totals = useMemo(() => ({
    fuelTotal: fuelRecords.reduce((s, r) => s + (r.total_value || 0), 0),
    maintTotal: maintenanceRecords.reduce((s, r) => s + (r.total_value || 0), 0),
    opTotal: operationalRecords.reduce((s, r) => s + (r.total_value || 0), 0),
  }), [fuelRecords, maintenanceRecords, operationalRecords]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-screen-xl mx-auto p-6 md:p-8 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Análises e Levantamentos</h1>
            <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-widest">Visão estratégica · Dados operacionais</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-0">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                  active
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {tab === 'geral' && (
          <motion.div
            key="geral"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <DashboardKPIs
              fuelRecords={fuelRecords}
              maintenanceRecords={maintenanceRecords}
              operationalRecords={operationalRecords}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <DashboardCostEvolution
                  fuelRecords={fuelRecords}
                  maintenanceRecords={maintenanceRecords}
                  operationalRecords={operationalRecords}
                />
              </div>
              <DashboardCostBreakdown
                fuelTotal={totals.fuelTotal}
                maintTotal={totals.maintTotal}
                opTotal={totals.opTotal}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <DashboardTopVehicles
                fuelRecords={fuelRecords}
                maintenanceRecords={maintenanceRecords}
                operationalRecords={operationalRecords}
                vehicles={vehicles}
              />
              <DashboardMaintenanceByGroup maintenanceRecords={maintenanceRecords} />
            </div>
            <DashboardCostByCategory
              fuelRecords={fuelRecords}
              maintenanceRecords={maintenanceRecords}
              operationalRecords={operationalRecords}
              vehicles={vehicles}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <DashboardCostComparison
                fuelRecords={fuelRecords}
                maintenanceRecords={maintenanceRecords}
                operationalRecords={operationalRecords}
              />
              <DashboardOperationalCosts operationalRecords={operationalRecords} />
            </div>
          </motion.div>
        )}

        {tab === 'manutencao' && (
          <motion.div
            key="manutencao"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MaintenanceDashboard maintenanceRecords={maintenanceRecords} vehicles={vehicles} />
          </motion.div>
        )}

        {tab === 'abastecimento' && (
          <motion.div
            key="abastecimento"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <FuelDashboard fuelRecords={fuelRecords} vehicles={vehicles} />
          </motion.div>
        )}

      </div>
    </div>
  );
}