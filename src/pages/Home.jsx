import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Fuel, Wrench, DollarSign, Truck, BarChart2, Settings, Bell } from 'lucide-react';

const modules = [
  {
    label: 'Abastecimento',
    path: '/abastecimentos',
    bg: 'from-teal-600 to-emerald-700',
    iconBg: 'bg-teal-500/30',
    emoji: '⛽',
    icon: Fuel,
  },
  {
    label: 'Manutenção',
    path: '/manutencao',
    bg: 'from-blue-600 to-blue-800',
    iconBg: 'bg-blue-500/30',
    emoji: '🔧',
    icon: Wrench,
  },
  {
    label: 'Custos Operacionais',
    path: '/custos-operacionais',
    bg: 'from-orange-500 to-amber-600',
    iconBg: 'bg-orange-400/30',
    emoji: '💰',
    icon: DollarSign,
  },
  {
    label: 'Analise',
    path: '/analises',
    bg: 'from-violet-600 to-purple-800',
    iconBg: 'bg-violet-500/30',
    emoji: '📊',
    icon: BarChart2,
  },
  {
    label: 'Configurações',
    path: '/parametrizacoes',
    bg: 'from-cyan-600 to-teal-700',
    iconBg: 'bg-cyan-500/30',
    emoji: '⚙️',
    icon: Settings,
  },
];

const fmtCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtNum = (v) => new Intl.NumberFormat('pt-BR').format(v || 0);

const last30Days = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

export default function Home() {
  const [period, setPeriod] = React.useState('30d');
  const since = period === '30d' ? last30Days() : null;

  const { data: fuelRecords = [] } = useQuery({
    queryKey: ['home-fuel'],
    queryFn: () => base44.entities.FuelRecord.list('-date', 2000),
  });
  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['home-maint'],
    queryFn: () => base44.entities.MaintenanceRecord.list('-date', 2000),
  });
  const { data: operationalRecords = [] } = useQuery({
    queryKey: ['home-op'],
    queryFn: () => base44.entities.OperationalCostRecord.list('-date', 2000),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['home-vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const kpis = useMemo(() => {
    const maint30 = since ? maintenanceRecords.filter(r => r.date >= since) : maintenanceRecords;
    const op30 = since ? operationalRecords.filter(r => r.date >= since) : operationalRecords;

    const totalAbastecido = fuelRecords.reduce((s, r) => s + (r.quantity || 0), 0);
    const custoOperacional = op30.reduce((s, r) => s + (r.total_value || 0), 0);
    const totalManutencoes = maint30.length;
    const custoManutencoes = maint30.reduce((s, r) => s + (r.total_value || 0), 0);
    const activeVehicles = vehicles.filter(v => v.is_active !== false).length || vehicles.length;

    return { totalAbastecido, custoOperacional, totalManutencoes, custoManutencoes, activeVehicles };
  }, [fuelRecords, maintenanceRecords, operationalRecords, vehicles, since]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="min-h-screen bg-[#0d1b2a] text-white">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-xl font-bold text-white">{greeting}, bem-vindo!</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </motion.div>
        <button className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <Bell className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="px-6 py-8 space-y-8">

        {/* Module Cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {modules.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <motion.div
                  key={mod.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                  className="shrink-0"
                >
                  <Link to={mod.path}>
                    <div className={`relative w-44 h-44 rounded-2xl bg-gradient-to-br ${mod.bg} flex flex-col items-center justify-center gap-3 shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-200 cursor-pointer overflow-hidden`}>
                      {/* Glow circle */}
                      <div className={`w-20 h-20 rounded-full ${mod.iconBg} flex items-center justify-center`}>
                        <Icon className="w-10 h-10 text-white drop-shadow-lg" />
                      </div>
                      <span className="text-sm font-bold text-white text-center leading-tight px-2">
                        {mod.label}
                      </span>
                      {/* Bottom indicator */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-2xl" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Resumo da Frota */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.45 }}
          className="bg-[#152032] rounded-2xl border border-white/5 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-white">Resumo da Frota</h2>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-white/80 outline-none cursor-pointer"
            >
              <option value="30d" className="bg-[#152032]">Últimos 30 dias</option>
              <option value="all" className="bg-[#152032]">Período todo</option>
            </select>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Veículos */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-white leading-none">{fmtNum(kpis.activeVehicles)}</p>
                <p className="text-xs font-semibold text-white/60 mt-0.5">Total de Veículos</p>
                <p className="text-[10px] text-white/30">Ativos na frota</p>
              </div>
            </div>

            {/* Total Abastecido */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Fuel className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-white leading-none">{fmtNum(Math.round(kpis.totalAbastecido))} L</p>
                <p className="text-xs font-semibold text-white/60 mt-0.5">Total Abastecido</p>
                <p className="text-[10px] text-white/30">Acumulado geral</p>
              </div>
            </div>

            {/* Custo Operacional */}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-white leading-none">{fmtCurrency(kpis.custoOperacional)}</p>
                <p className="text-xs font-semibold text-white/60 mt-0.5">Custo Operacional</p>
                <p className="text-[10px] text-white/30">No período</p>
              </div>
            </div>

            {/* Manutenções */}
            <Link to="/analises?tab=manutencao" className="flex items-center gap-3 bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors group">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-white leading-none">{fmtCurrency(kpis.custoManutencoes)}</p>
                <p className="text-xs font-semibold text-white/60 mt-0.5">Manutenções</p>
                <p className="text-[10px] text-violet-400/70 group-hover:text-violet-300 transition-colors">Ver análises →</p>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Banner / Trucks visual */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.45 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0e2a4a] via-[#0d3a6a] to-[#0a2240] border border-white/5 p-6 min-h-[120px]"
        >
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 70% 50%, #3b82f6 0%, transparent 60%)`,
            }}
          />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Gestão Completa da sua Frota</h3>
              <p className="text-sm text-white/50 mt-1">Monitore, analise e otimize seus custos em tempo real</p>
              <Link
                to="/analises"
                className="inline-flex items-center gap-2 mt-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <BarChart2 className="w-4 h-4" />
                Ver Análises
              </Link>
            </div>
            <div className="hidden md:flex gap-3 opacity-60">
              <div className="text-6xl">🚛</div>
              <div className="text-5xl self-end">🚐</div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}