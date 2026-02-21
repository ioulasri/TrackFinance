import React, { useState, useEffect } from 'react';
import { Plus, Target, PiggyBank, Plane, TrendingUp, Home, GraduationCap, Heart, Zap, Edit, Trash2, Calendar, TrendingDown } from 'lucide-react';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { CreateGoalModal } from './CreateGoalModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { goalAPI } from '../api';

const iconMap: Record<string, any> = {
  '💰': PiggyBank,
  '✈️': Plane,
  '🏠': Home,
  '🎓': GraduationCap,
  '📈': TrendingUp,
  '❤️': Heart,
  '⚡': Zap,
  '🎯': Target,
};

export function Goals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredGoal, setHoveredGoal] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');

  useEffect(() => {
    fetchGoals();
  }, [activeTab]);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      let response;
      if (activeTab === 'active') {
        response = await goalAPI.getActive();
      } else if (activeTab === 'completed') {
        response = await goalAPI.getCompleted();
      } else {
        response = await goalAPI.list();
      }
      setGoals(response.data);
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (data: any) => {
    try {
      if (editingGoal) {
        await goalAPI.update(editingGoal.id, data);
      } else {
        await goalAPI.create(data);
      }
      await fetchGoals();
      setEditingGoal(null);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create/update goal:', error);
      alert('Failed to save goal. Please try again.');
    }
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;
    try {
      await goalAPI.delete(selectedGoal.id);
      await fetchGoals();
      setIsDeleteModalOpen(false);
      setSelectedGoal(null);
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert('Failed to delete goal. Please try again.');
    }
  };

  const calculateDaysRemaining = (deadline: string | null): { text: string; isOverdue: boolean } => {
    if (!deadline) return { text: 'No deadline', isOverdue: false };
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) return { text: `${Math.abs(daysDiff)} days overdue`, isOverdue: true };
    if (daysDiff === 0) return { text: 'Due today', isOverdue: false };
    if (daysDiff === 1) return { text: '1 day left', isOverdue: false };
    return { text: `${daysDiff} days left`, isOverdue: false };
  };

  const getGoalStatus = (current: number, target: number, deadline: string | null) => {
    const percentage = (current / target) * 100;
    const daysInfo = calculateDaysRemaining(deadline);

    if (percentage >= 100) return { color: 'emerald', text: 'Completed', bgColor: 'bg-emerald-500/10 border border-emerald-500/20', textColor: 'text-emerald-500' };
    if (daysInfo.isOverdue) return { color: 'red', text: 'Overdue', bgColor: 'bg-destructive/10 border border-destructive/20', textColor: 'text-destructive' };
    if (percentage >= 75) return { color: 'blue', text: 'Almost There', bgColor: 'bg-blue-500/10 border border-blue-500/20', textColor: 'text-blue-500' };
    if (percentage >= 50) return { color: 'purple', text: 'In Progress', bgColor: 'bg-primary/10 border border-primary/20', textColor: 'text-primary' };
    return { color: 'orange', text: 'Just Started', bgColor: 'bg-orange-500/10 border border-orange-500/20', textColor: 'text-orange-500' };
  };

  const totalTargetAmount = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrentAmount = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalRemaining = totalTargetAmount - totalCurrentAmount;
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Goals</h1>
          <p className="text-muted-foreground mt-1">Track and achieve your financial goals</p>
        </div>
        <Button variant="primary" size="large" onClick={() => setIsCreateModalOpen(true)} className="shadow-[0_0_15px_rgba(127,13,242,0.4)]">
          <Plus size={20} className="mr-2" />
          Create Goal
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'active'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Active Goals
          {activeTab === 'active' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(127,13,242,0.8)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'completed'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Completed
          {activeTab === 'completed' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(127,13,242,0.8)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'all'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          All Goals
          {activeTab === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(127,13,242,0.8)]" />
          )}
        </button>
      </div>

      {/* Summary Cards */}
      {goals.length > 0 && (
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Total Goals</p>
            <p className="text-3xl font-bold text-foreground tracking-tight">{goals.length}</p>
          </div>
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Target Amount</p>
            <p className="text-3xl font-bold text-foreground tracking-tight">MAD {totalTargetAmount.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Saved So Far</p>
            <p className="text-3xl font-bold text-blue-500 tracking-tight">MAD {totalCurrentAmount.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Remaining</p>
            <p className="text-3xl font-bold text-primary tracking-tight">MAD {totalRemaining.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 shadow-sm border border-border text-center">
          <Target className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No goals yet</h3>
          <p className="text-muted-foreground mb-6">
            {activeTab === 'completed'
              ? "You haven't completed any goals yet. Keep working on your active goals!"
              : "Create your first financial goal to start tracking your progress"}
          </p>
          {activeTab !== 'completed' && (
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={18} className="mr-2" />
              Create Your First Goal
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {goals.map((goal) => {
            const Icon = iconMap[goal.icon] || Target;
            const percentage = (goal.current_amount / goal.target_amount) * 100;
            const remaining = goal.target_amount - goal.current_amount;
            const daysInfo = calculateDaysRemaining(goal.deadline);
            const status = getGoalStatus(goal.current_amount, goal.target_amount, goal.deadline);
            const isHovered = hoveredGoal === goal.id;
            const isCompleted = percentage >= 100;

            return (
              <div
                key={goal.id}
                onMouseEnter={() => setHoveredGoal(goal.id)}
                onMouseLeave={() => setHoveredGoal(null)}
                className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:border-primary/30 transition-all relative group"
              >
                {/* Action Buttons */}
                <div className={`absolute top-4 right-4 flex gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'
                  }`}>
                  <button
                    onClick={() => {
                      setEditingGoal(goal);
                      setIsCreateModalOpen(true);
                    }}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGoal(goal);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Goal Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-xl text-3xl transition-transform duration-300 group-hover:scale-110 ${isCompleted ? 'bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.2)]' :
                      daysInfo.isOverdue ? 'bg-destructive/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]' :
                        'bg-primary/10 shadow-[0_0_10px_rgba(127,13,242,0.2)]'
                    }`}>
                    {goal.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-lg mb-1">{goal.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-md ${status.bgColor} ${status.textColor} font-medium`}>
                        {status.text}
                      </span>
                      {goal.category && (
                        <span className="text-xs text-muted-foreground">{goal.category}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {goal.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{goal.description}</p>
                )}

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {percentage.toFixed(1)}% Complete
                    </span>
                  </div>
                  <ProgressBar current={goal.current_amount} max={goal.target_amount} showPercentage={false} />
                </div>

                {/* Goal Details */}
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current</span>
                    <span className="font-semibold text-foreground">
                      MAD {goal.current_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Target</span>
                    <span className="font-semibold text-foreground">
                      MAD {goal.target_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className={`font-semibold ${remaining <= 0 ? 'text-emerald-500' : 'text-primary'}`}>
                      MAD {Math.max(0, remaining).toLocaleString()}
                    </span>
                  </div>
                  {goal.deadline && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar size={14} />
                        <span>Deadline</span>
                      </div>
                      <span className={`font-medium ${daysInfo.isOverdue ? 'text-destructive' : 'text-foreground'}`}>
                        {daysInfo.text}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateGoalModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingGoal(null);
        }}
        onSubmit={handleCreateGoal}
        editingGoal={editingGoal}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedGoal(null);
        }}
        onConfirm={handleDeleteGoal}
        title="Delete Goal"
        message={`Are you sure you want to delete "${selectedGoal?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
