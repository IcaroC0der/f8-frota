import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({ title, subtitle, icon: Icon, iconColor, breadcrumbs }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      {breadcrumbs && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
              {crumb.path ? (
                <Link to={crumb.path} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={`w-12 h-12 rounded-2xl ${iconColor || 'bg-primary/10'} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${iconColor ? iconColor.replace('bg-', 'text-').replace('/10', '') : 'text-primary'}`} />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
}