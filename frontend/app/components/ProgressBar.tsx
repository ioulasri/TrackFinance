import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  showPercentage?: boolean;
}

export function ProgressBar({ current, max, showPercentage = true }: ProgressBarProps) {
  const percentage = Math.min((current / max) * 100, 100);
  
  // Dynamic color based on percentage
  const getColor = () => {
    if (percentage > 100) return 'bg-red-600';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-blue-600';
    return 'bg-emerald-600';
  };

  const getBackgroundColor = () => {
    if (percentage > 100) return 'bg-red-50';
    if (percentage >= 80) return 'bg-orange-50';
    if (percentage >= 60) return 'bg-blue-50';
    return 'bg-emerald-50';
  };

  return (
    <div className="space-y-2">
      <div className={`h-3 rounded-full overflow-hidden ${getBackgroundColor()}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-in-out ${getColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showPercentage && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className={`font-semibold ${
            percentage > 100 ? 'text-red-600' : 
            percentage >= 80 ? 'text-orange-500' : 
            percentage >= 60 ? 'text-blue-600' : 
            'text-emerald-600'
          }`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
