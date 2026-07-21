import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Gauge, Fuel, Wrench, DollarSign, Truck, Activity, AlertTriangle, TrendingUp } from 'lucide-react';

import DashboardKPICard from '@/components/dashboard/DashboardKPICard';
import DashboardCostEvolution from '@/components/dashboard/DashboardCostEvolution';
import DashboardCostBreakdown from '@/components/dashboard/DashboardCostBreakdown';
import DashboardTopVehicles from '@/components/dashboard/DashboardTopVehicles';
import DashboardRecentActivity from '@/components/dashboard/DashboardRecentActivity';
import DashboardMaintenanceByGroup from '@/components/dashboard/DashboardMaintenanceByGroup';

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
const fmtNum = (v) => new Intl.NumberFormat('pt-BR').format(v);

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const prevMonth = () => {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const monthKey = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function Dashboard() {
  const { data: fuelRecords = [] } = useQuery({
    queryKey: ['fuel-records-dash'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 2000),
  });
  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['maint-records-dash'],
    queryFn: () => base44.entities.MaintenanceRecord.list('-date', 2000),
  });
  const { data: operationalRecords = [] } = useQuery({
    queryKey: ['op-records-dash'],
    queryFn: () => base44.entities.OperationalCostRecord.list('-date', 2000),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-dash'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const cm = currentMonth();
  const pm = prevMonth();

  const kpis = useMemo(() => {
    const fuelTotal = fuelRecords.reduce((s, r) => s + (r.total_value || 0), 0);
    const maintTotal = maintenanceRecords.reduce((s, r) => s + (r.total_value || 0), 0);
    const opTotal = operationalRecords.reduce((s, r) => s + (r.total_value || 0), 0);
    const grandTotal = fuelTotal + maintTotal + opTotal;

    const fuelCM = fuelRecords.filter(r => monthKey(r.date) === cm).reduce((s, r) => s + (r.total_value || 0), 0);
    const maintCM = maintenanceRecords.filter(r => monthKey(r.date) === cm).reduce((s, r) => s + (r.total_value || 0), 0);
    const opCM = operationalRecords.filter(r => monthKey(r.date) === cm).reduce((s, r) => s + (r.total_value || 0), 0);
    const totalCM = fuelCM + maintCM + opCM;

    const fuelPM = fuelRecords.filter(r => monthKey(r.date) === pm).reduce((s, r) => s + (r.total_value || 0), 0);
    const maintPM = maintenanceRecords.filter(r => monthKey(r.date) === pm).reduce((s, r) => s + (r.total_value || 0), 0);
    const opPM = operationalRecords.filter(r => monthKey(r.date) === pm).reduce((s, r) => s + (r.total_value || 0), 0);
    const totalPM = fuelPM + maintPM + opPM;

    const trendTotal = totalPM > 0 ? Math.round(((totalCM - totalPM) / totalPM) * 100) : 0;
    const trendFuel = fuelPM > 0 ? Math.round(((fuelCM - fuelPM) / fuelPM) * 100) : 0;
    const trendMaint = maintPM > 0 ? Math.round(((maintCM - maintPM) / maintPM) * 100) : 0;

    const activeVehicles = vehicles.filter(v => v.is_active !== false).length;

    const plates = new Set([
      ...fuelRecords.filter(r => r.plate && r.plate !== '00000').map(r => r.plate),
      ...maintenanceRecords.filter(r => r.plate).map(r => r.plate),
    ]);

    return {
      grandTotal, fuelTotal, maintTotal, opTotal,
      totalCM, fuelCM, maintCM, opCM,
      trendTotal, trendFuel, trendMaint,
      activeVehicles: activeVehicles || plates.size,
      totalRecords: fuelRecords.length + maintenanceRecords.length + operationalRecords.length,
      fuelLiters: fuelRecords.reduce((s, r) => s + (r.quantity || 0), 0),
    };
  }, [fuelRecords, maintenanceRecords, operationalRecords, vehicles]);

  const now = new Date();
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-screen-xl mx-auto p-6 md:p-8 space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Gauge className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Dashboard Executivo</h1>
              <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-widest">Gestão de Frota · Visão Estratégica</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-600 capitalize">{monthLabel}</span>
          </div>
        </motion.div>

        {/* KPIs Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardKPICard
            title="Custo Total Geral"
            value={fmt(kpis.grandTotal)}
            subtitle={`${fmtNum(kpis.totalRecords)} lançamentos`}
            icon={TrendingUp}
            gradient="from-blue-500 to-blue-700"
            delay={0.05}
          />
          <DashboardKPICard
            title="Custo no Mês"
            value={fmt(kpis.totalCM)}
            subtitle="Mês corrente"
            icon={Activity}
            gradient="from-violet-500 to-purple-700"
            trend={kpis.trendTotal}
            trendLabel="vs. mês anterior"
            delay={0.1}
          />
          <DashboardKPICard
            title="Abastecimento"
            value={fmt(kpis.fuelCM)}
            subtitle={`${fmtNum(Math.round(kpis.fuelLiters))} litros total`}
            icon={Fuel}
            gradient="from-amber-400 to-orange-500"
            trend={kpis.trendFuel}
            trendLabel="vs. mês anterior"
            delay={0.15}
          />
          <DashboardKPICard
            title="Manutenção"
            value={fmt(kpis.maintCM)}
            subtitle="Mês corrente"
            icon={Wrench}
            gradient="from-rose-500 to-red-600"
            trend={kpis.trendMaint}
            trendLabel="vs. mês anterior"
            delay={0.2}
          />
        </div>

        {/* Second KPIs Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardKPICard
            title="Frota Ativa"
            value={fmtNum(kpis.activeVehicles)}
            subtitle="veículos cadastrados"
            icon={Truck}
            gradient="from-cyan-500 to-blue-500"
            delay={0.25}
          />
          <DashboardKPICard
            title="Total Abastecimento"
            value={fmt(kpis.fuelTotal)}
            subtitle="acumulado"
            icon={Fuel}
            gradient="from-amber-400 to-amber-600"
            delay={0.3}
          />
          <DashboardKPICard
            title="Total Manutenção"
            value={fmt(kpis.maintTotal)}
            subtitle="acumulado"
            icon={Wrench}
            gradient="from-rose-400 to-rose-600"
            delay={0.35}
          />
          <DashboardKPICard
            title="Total Operacional"
            value={fmt(kpis.opTotal)}
            subtitle="acumulado"
            icon={DollarSign}
            gradient="from-emerald-400 to-emerald-600"
            delay={0.4}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <DashboardCostEvolution
              fuelRecords={fuelRecords}
              maintenanceRecords={maintenanceRecords}
              operationalRecords={operationalRecords}
            />
          </div>
          <DashboardCostBreakdown
            fuelTotal={kpis.fuelTotal}
            maintTotal={kpis.maintTotal}
            opTotal={kpis.opTotal}
          />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DashboardTopVehicles
            fuelRecords={fuelRecords}
            maintenanceRecords={maintenanceRecords}
          />
          <DashboardMaintenanceByGroup maintenanceRecords={maintenanceRecords} />
        </div>

        {/* Activity */}
        <DashboardRecentActivity
          fuelRecords={fuelRecords}
          maintenanceRecords={maintenanceRecords}
          operationalRecords={operationalRecords}
        />

      </div>
    </div>
  );
}