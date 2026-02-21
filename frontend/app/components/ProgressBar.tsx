import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  showPercentage?: boolean;
}

export function ProgressBar({ current, max, showPercentage = true }: ProgressBarProps) {
  // Calculate true percentage, allowing > 100
  const percentage = max > 0 ? (current / max) * 100 : 0;

  // Dynamic color based on percentage
  const getColor = () => {
    if (percentage > 100) return 'bg-red-600';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-blue-600';
    return 'bg-emerald-600';
  };

  const getBackgroundColor = () => {
    return 'bg-secondary';
  };

  return (
    <div className="space-y-3">
      <div className={`h-3 rounded-full overflow-hidden ${getBackgroundColor()}`}>
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${percentage > 100 ? 'bg-destructive' :
            percentage >= 80 ? 'bg-orange-500' :
              percentage >= 60 ? 'bg-blue-500' :
                'bg-emerald-500'
            }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showPercentage && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">Progress</span>
          <span className={`font-bold ${percentage > 100 ? 'text-destructive' :
            percentage >= 80 ? 'text-orange-500' :
              percentage >= 60 ? 'text-blue-500' :
                'text-emerald-500'
            }`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
