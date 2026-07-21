import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function DashboardKPICard({ title, value, subtitle, icon: Icon, gradient, trend, trendLabel, delay = 0 }) {
  const trendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor = trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-rose-400' : 'text-slate-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group"
    >
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient}`} />

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor} bg-slate-50 px-1.5 py-0.5 rounded-full`}>
              <TrendIcon className="w-2.5 h-2.5" />
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-tight text-slate-400 leading-tight">{title}</p>
          <p className="text-lg font-extrabold text-slate-800 leading-tight">{value}</p>
          {subtitle && <p className="text-[10px] text-slate-500 pt-0.5 leading-tight">{subtitle}</p>}
          {trendLabel && <p className="text-[10px] text-slate-400 italic leading-tight">{trendLabel}</p>}
        </div>
      </div>
    </motion.div>
  );
}