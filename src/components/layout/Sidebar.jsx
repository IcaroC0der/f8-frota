import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Settings, Truck, Fuel, Wrench, DollarSign, BarChart2, FileText,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { label: 'Início', icon: Home, path: '/', color: 'text-primary' },
  { label: 'Veículos', icon: Truck, path: '/veiculos', color: 'text-info', disabled: false },
  { label: 'Abastecimentos', icon: Fuel, path: '/abastecimentos', color: 'text-warning', disabled: false },
  { label: 'Manutenção', icon: Wrench, path: '/manutencao', color: 'text-destructive', disabled: false },
  { label: 'Custos Operacionais', icon: DollarSign, path: '/custos-operacionais', color: 'text-success', disabled: false },
  { label: 'Análises', icon: BarChart2, path: '/analises', color: 'text-accent', disabled: false },
  { label: 'Relatório', icon: FileText, path: '/relatorio', color: 'text-blue-400', disabled: false },
  { label: 'Parametrizações', icon: Settings, path: '/parametrizacoes', color: 'text-muted-foreground', disabled: false },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside 
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border sticky top-0 z-40"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-wide">FROTA</h1>
                <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Gestão</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.disabled ? '#' : item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-foreground" 
                  : item.disabled
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground"
              )}
              onClick={(e) => item.disabled && e.preventDefault()}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                />
              )}
              <Icon className={cn("w-5 h-5 shrink-0", isActive ? item.color : "")} />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.disabled && !collapsed && (
                <span className="ml-auto text-[9px] uppercase tracking-wider bg-sidebar-accent px-1.5 py-0.5 rounded text-sidebar-foreground/40">
                  Em breve
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-sidebar-foreground/30 text-center"
            >
              Sistema de Gestão de Frota v1.0
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}