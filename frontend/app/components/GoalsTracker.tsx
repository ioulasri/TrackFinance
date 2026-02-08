import React from 'react';
import { Target, PiggyBank, Plane, Plus } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

// TODO: Connect to backend API when goals feature is implemented
const goals = [
  {
    id: 1,
    name: 'Emergency Fund',
    icon: Target,
    current: 3500,
    target: 10000,
    daysRemaining: 120,
    color: 'emerald',
  },
  {
    id: 2,
    name: 'New Laptop',
    icon: PiggyBank,
    current: 850,
    target: 1500,
    daysRemaining: 45,
    color: 'blue',
  },
  {
    id: 3,
    name: 'Summer Vacation',
    icon: Plane,
    current: 1200,
    target: 3000,
    daysRemaining: 90,
    color: 'purple',
  },
];

export function GoalsTracker() {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-gray-900">Goals Tracker</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
          <Plus size={16} />
          Add Goal
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {goals.map((goal) => {
          const Icon = goal.icon;
          const percentage = (goal.current / goal.target) * 100;

          return (
            <div key={goal.id} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${colorClasses[goal.color]}`}>
                  <Icon size={20} />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm">{goal.name}</h4>
              </div>

              <ProgressBar current={goal.current} max={goal.target} showPercentage={false} />

              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Current</span>
                  <span className="font-semibold text-gray-900">
                    MAD {goal.current.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Target</span>
                  <span className="font-semibold text-gray-900">
                    MAD {goal.target.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    {goal.daysRemaining} days remaining
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
