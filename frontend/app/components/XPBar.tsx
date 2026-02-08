import React from 'react';

interface XPBarProps {
  currentXP: number;
  requiredXP: number;
  level: number;
}

export function XPBar({ currentXP, requiredXP, level }: XPBarProps) {
  const percentage = (currentXP / requiredXP) * 100;

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
      <div className="flex items-center justify-center w-8 h-8 bg-purple-600 rounded-lg">
        <span className="text-xs font-bold text-white">{level}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">Level {level}</span>
          <span className="text-xs font-semibold text-purple-600">
            {currentXP} / {requiredXP} XP
          </span>
        </div>
        <div className="h-2 bg-purple-50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
