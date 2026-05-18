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
  /** Accent color drives the left edge stripe + icon tint. */
  accentColor: 'emerald' | 'teal' | 'amber' | 'rose' | 'slate';
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps['accentColor']>, { edge: string; iconBg: string; iconText: string }> = {
  emerald: { edge: 'bg-emerald-500', iconBg: 'bg-emerald-50',  iconText: 'text-emerald-600' },
  teal:    { edge: 'bg-teal-500',    iconBg: 'bg-teal-50',     iconText: 'text-teal-600' },
  amber:   { edge: 'bg-amber-500',   iconBg: 'bg-amber-50',    iconText: 'text-amber-600' },
  rose:    { edge: 'bg-rose-500',    iconBg: 'bg-rose-50',     iconText: 'text-rose-600' },
  slate:   { edge: 'bg-slate-500',   iconBg: 'bg-slate-100',   iconText: 'text-slate-700' },
};

export function StatCard({ title, value, trend, icon, accentColor }: StatCardProps) {
  const a = ACCENT_CLASSES[accentColor] ?? ACCENT_CLASSES.emerald;

  return (
    <div className="relative bg-card rounded-2xl p-6 border border-border overflow-hidden
                    shadow-[0_1px_2px_rgba(15,30,26,0.04),0_4px_12px_rgba(15,30,26,0.04)]
                    transition-all duration-200 hover:shadow-[0_2px_4px_rgba(15,30,26,0.06),0_8px_24px_rgba(15,30,26,0.08)] hover:-translate-y-0.5">
      {/* Left accent stripe */}
      <span className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${a.edge}`} aria-hidden />

      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${a.iconBg} ${a.iconText}`}>{icon}</div>
        {trend && (
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
              trend.isPositive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">{title}</p>
        <p className="text-3xl font-bold text-foreground tracking-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}
