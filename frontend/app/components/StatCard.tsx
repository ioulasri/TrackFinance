import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  accentColor: 'emerald' | 'blue' | 'purple';
}

export function StatCard({ title, value, trend, icon, accentColor }: StatCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-secondary text-primary',
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`p-3 rounded-xl transition-transform duration-300 group-hover:scale-105 ${colorClasses[accentColor]}`}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${trend.isPositive
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-destructive/10 text-destructive'
              }`}
          >
            {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1 font-medium">{title}</p>
        <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
      </div>
    </div>
  );
}
