import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  showPercentage?: boolean;
}

/**
 * Single-color emerald fill that promotes to amber > 80% then coral > 100%.
 * Cleaner than the previous 4-color tier system; reads more like a real
 * finance UI than a status indicator.
 */
export function ProgressBar({ current, max, showPercentage = true }: ProgressBarProps) {
  const percentage = max > 0 ? (current / max) * 100 : 0;

  const isOver = percentage > 100;
  const isWarn = percentage >= 80 && percentage <= 100;

  const fillClass = isOver
    ? 'bg-rose-500'
    : isWarn
    ? 'bg-amber-500'
    : 'bg-emerald-600';

  const textClass = isOver
    ? 'text-rose-600'
    : isWarn
    ? 'text-amber-600'
    : 'text-emerald-700';

  return (
    <div className="space-y-2">
      <div className="h-2 rounded-full overflow-hidden bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${fillClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showPercentage && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Progress</span>
          <span className={`font-semibold tabular-nums ${textClass}`}>{percentage.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
