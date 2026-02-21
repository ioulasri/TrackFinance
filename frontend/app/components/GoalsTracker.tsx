import React, { useState, useEffect } from 'react';
import { Target, PiggyBank, Plane, Plus, TrendingUp, Home, GraduationCap, Heart, Zap } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { CreateGoalModal } from './CreateGoalModal';
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-secondary text-primary',
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

  const handleCreateGoal = async (goalData: any) => {
    try {
      await goalAPI.create(goalData);
      await fetchGoals(); // Refresh the goals list
    } catch (err: any) {
      console.error('Error creating goal:', err);
      alert(err.response?.data?.detail || 'Failed to create goal');
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
      <div className="bg-[#12121a]/80 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl text-foreground font-bold">Goals Tracker</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#12121a]/80 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl text-foreground font-bold">Goals Tracker</h3>
        </div>
        <div className="text-center py-8 text-destructive">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <>
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl text-foreground font-bold tracking-tight">Goals Tracker</h3>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-sm transition-all text-sm font-medium hover:opacity-90"
            >
              <Plus size={16} />
              Add Goal
            </button>
          </div>
          <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50 border-dashed">
            <Target className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-foreground font-medium text-sm">No active goals yet</p>
            <p className="text-muted-foreground text-xs mt-1">Create your first financial goal to get started</p>
          </div>
        </div>
        <CreateGoalModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateGoal}
        />
      </>
    );
  }

  return (
    <>
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border transition-colors">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl text-foreground font-bold tracking-tight">Goals Tracker</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-sm hover:opacity-90 transition-all text-sm font-medium"
          >
            <Plus size={16} />
            Add Goal
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {goals.map((goal) => {
            const IconComponent = iconMap[goal.icon] || Target;
            const color = getColorForCategory(goal.category);
            const percentage = (goal.current_amount / goal.target_amount) * 100;
            const daysRemaining = calculateDaysRemaining(goal.deadline);

            return (
              <div key={goal.id} className="group bg-background rounded-xl p-5 border border-border/60 hover:border-border transition-all duration-300 shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-lg transition-transform duration-300 group-hover:scale-105 ${colorClasses[color]}`}>
                    <IconComponent size={20} />
                  </div>
                  <h4 className="font-semibold text-foreground tracking-tight truncate">{goal.name}</h4>
                </div>

                <ProgressBar current={goal.current_amount} max={goal.target_amount} showPercentage={false} />

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Current</span>
                    <span className="font-semibold text-foreground">
                      MAD {goal.current_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Target</span>
                    <span className="font-semibold text-foreground">
                      MAD {goal.target_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-3 mt-1 border-t border-border">
                    <span className="text-xs font-medium text-muted-foreground">
                      {daysRemaining} remaining
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <CreateGoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateGoal}
      />
    </>
  );
}
