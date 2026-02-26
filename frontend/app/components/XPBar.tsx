import React from 'react';

interface XPBarProps {
  currentXP: number;
  requiredXP: number;
  level: number;
}

export function XPBar({ currentXP, requiredXP, level }: XPBarProps) {
  const percentage = Math.min((currentXP / Math.max(requiredXP, 1)) * 100, 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Progress</span>
        <span className="text-[10px] font-medium text-primary">
          {currentXP} / {requiredXP} XP
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}