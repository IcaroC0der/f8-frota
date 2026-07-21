import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, Layers, ArrowRight, Sun, Moon, FileText } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { useTheme } from 'next-themes';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

export default function Parametrizacoes() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <PageHeader
        title="Parametrizações"
        subtitle="Configurações gerais e regras de funcionamento do sistema"
        icon={Settings}
        iconColor="bg-accent/10"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Parametrizações' }
        ]}
      />

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Theme Toggle Card */}
        <motion.div variants={item}>
          <Card className="border-0 shadow-lg shadow-amber-500/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 opacity-[0.06]" />
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                  {theme === 'dark' ? <Moon className="w-6 h-6 text-white" /> : <Sun className="w-6 h-6 text-white" />}
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Aparência</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Alterne entre o tema claro e escuro do sistema.
              </p>
              <div className="flex items-center gap-2 p-1 rounded-xl bg-muted w-fit">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${theme === 'light' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Sun className="w-4 h-4" /> Claro
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Moon className="w-4 h-4" /> Escuro
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Link to="/relatorio">
            <Card className="group relative overflow-hidden border-0 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Relatório</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Relatório geral consolidado com todos os custos lançados, gráficos dinâmicos e exportação em PDF.
                </p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link to="/parametrizacoes/estrutura-modulos">
            <Card className="group relative overflow-hidden border-0 shadow-lg shadow-accent/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Estrutura dos Módulos</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Configuração de categorias, tipos de custo e regras de lançamento para cada módulo do sistema.
                </p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}