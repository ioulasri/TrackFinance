import React, { useState, useEffect } from 'react';
import { Target, PiggyBank, Plane, Plus, TrendingUp, Home, GraduationCap, Heart, Zap } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { goalAPI } from '../api';

interface Goal {
  id: number;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Emoji to icon component mapping
const iconMap: Record<string, React.ComponentType<any>> = {
  '🎯': Target,
  '💰': PiggyBank,
  '✈️': Plane,
  '📈': TrendingUp,
  '🏠': Home,
  '🎓': GraduationCap,
  '❤️': Heart,
  '⚡': Zap,
};

// Color mapping for different goal types
const getColorForCategory = (category: string | null): string => {
  if (!category) return 'purple';
  const lowerCategory = category.toLowerCase();
  if (lowerCategory.includes('emergency') || lowerCategory.includes('fund')) return 'emerald';
  if (lowerCategory.includes('travel') || lowerCategory.includes('vacation')) return 'blue';
  if (lowerCategory.includes('house') || lowerCategory.includes('home')) return 'purple';
  return 'blue';
};

export function GoalsTracker() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await goalAPI.getActive();
      setGoals(response.data.slice(0, 3)); // Show only top 3 active goals
    } catch (err: any) {
      console.error('Error fetching goals:', err);
      setError(err.response?.data?.detail || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (deadline: string | null): string => {
    if (!deadline) return 'No deadline';
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff < 0) return 'Overdue';
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return '1 day';
    return `${daysDiff} days`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-gray-900">Goals Tracker</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-gray-900">Goals Tracker</h3>
        </div>
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-gray-900">Goals Tracker</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
            <Plus size={16} />
            Add Goal
          </button>
        </div>
        <div className="text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No active goals yet</p>
          <p className="text-gray-400 text-xs mt-1">Create your first financial goal to get started</p>
        </div>
      </div>
    );
  }

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
          const IconComponent = iconMap[goal.icon] || Target;
          const color = getColorForCategory(goal.category);
          const percentage = (goal.current_amount / goal.target_amount) * 100;
          const daysRemaining = calculateDaysRemaining(goal.deadline);

          return (
            <div key={goal.id} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${colorClasses[color]}`}>
                  <IconComponent size={20} />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm">{goal.name}</h4>
              </div>

              <ProgressBar current={goal.current_amount} max={goal.target_amount} showPercentage={false} />

              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Current</span>
                  <span className="font-semibold text-gray-900">
                    MAD {goal.current_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Target</span>
                  <span className="font-semibold text-gray-900">
                    MAD {goal.target_amount.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    {daysRemaining} remaining
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
