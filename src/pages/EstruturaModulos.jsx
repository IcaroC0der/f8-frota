import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Truck, Fuel, Wrench, DollarSign, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';

const modules = [
  {
    label: 'Veículos',
    description: 'Categorias de veículos da frota',
    icon: Truck,
    path: '/parametrizacoes/estrutura-modulos/veiculos',
    gradient: 'from-blue-500 to-cyan-500',
    shadow: 'shadow-blue-500/15',
  },
  {
    label: 'Abastecimentos',
    description: 'Custos e tipos de combustíveis',
    icon: Fuel,
    path: '/parametrizacoes/estrutura-modulos/abastecimentos',
    gradient: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/15',
  },
  {
    label: 'Manutenção',
    description: 'Classificações e tipos de manutenção',
    icon: Wrench,
    path: '/parametrizacoes/estrutura-modulos/manutencao',
    gradient: 'from-rose-500 to-red-500',
    shadow: 'shadow-rose-500/15',
  },
  {
    label: 'Custos Operacionais',
    description: 'Custos administrativos diversos',
    icon: DollarSign,
    path: '/parametrizacoes/estrutura-modulos/custos-operacionais',
    gradient: 'from-emerald-500 to-green-500',
    shadow: 'shadow-emerald-500/15',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

export default function EstruturaModulos() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <PageHeader
        title="Estrutura dos Módulos"
        subtitle="Configure categorias, custos e regras de funcionamento de cada módulo"
        icon={Layers}
        iconColor="bg-accent/10"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Parametrizações', path: '/parametrizacoes' },
          { label: 'Estrutura dos Módulos' }
        ]}
      />

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <motion.div key={mod.label} variants={item}>
              <Link to={mod.path}>
                <Card className={`group relative overflow-hidden border-0 shadow-lg ${mod.shadow} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${mod.gradient} opacity-[0.06] group-hover:opacity-[0.1] transition-opacity`} />
                  <CardContent className="p-6 relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shadow-md`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{mod.label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{mod.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}