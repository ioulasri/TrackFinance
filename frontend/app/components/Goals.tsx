import React, { useState, useEffect } from 'react';
import { Plus, Target, PiggyBank, Plane, TrendingUp, Home, GraduationCap, Heart, Zap, Edit, Trash2, Calendar } from 'lucide-react';
import { CreateGoalModal } from './CreateGoalModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { goalAPI } from '../api';
import {
  C,
  FONT,
  MONO,
  fmtMAD,
  colorFor,
  mono,
  cardStyle,
  Page,
  PageHeader,
  Card,
  MonoLabel,
  PrimaryButton,
  GhostButton,
  Pill,
  EmptyState,
  DSStyles,
} from './ds';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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

    if (percentage >= 100) return { text: 'Completed', tone: 'pos' as const, color: C.income };
    if (daysInfo.isOverdue) return { text: 'Overdue', tone: 'neg' as const, color: C.over };
    if (percentage >= 75) return { text: 'Almost There', tone: 'neutral' as const, color: C.blue };
    if (percentage >= 50) return { text: 'In Progress', tone: 'neutral' as const, color: C.accent };
    return { text: 'Just Started', tone: 'neutral' as const, color: C.gold };
  };

  const totalTargetAmount = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrentAmount = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalRemaining = totalTargetAmount - totalCurrentAmount;

  const tabs: { id: 'active' | 'completed' | 'all'; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'all', label: 'All' },
  ];

  const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

  if (loading) {
    return (
      <Page>
        <DSStyles />
        <div className="flex items-center justify-center" style={{ minHeight: 384, fontFamily: FONT }}>
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full" style={{ border: `2px solid ${C.border}`, borderBottomColor: C.accent }} />
            <p className="mt-4" style={{ fontSize: 13, color: C.muted }}>Loading goals…</p>
          </div>
        </div>
      </Page>
    );
  }

  const summary: { label: string; value: string; color?: string }[] = [
    { label: 'Total Goals', value: String(goals.length) },
    { label: 'Target Amount', value: fmtMAD(totalTargetAmount) },
    { label: 'Saved So Far', value: fmtMAD(totalCurrentAmount), color: C.income },
    { label: 'Remaining', value: fmtMAD(Math.max(0, totalRemaining)), color: C.accent },
  ];

  return (
    <Page>
      <DSStyles />
      <style>{`
        @media (max-width:1024px){.goals-summary{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}.goals-grid{grid-template-columns:minmax(0,1fr) !important;}}
        @media (max-width:560px){.goals-summary{grid-template-columns:minmax(0,1fr) !important;}}
        .ds-icon-btn:hover{background:${C.divider} !important;color:${C.ink} !important;}
      `}</style>

      <PageHeader
        eyebrow="Targets"
        title="Goals"
        actions={
          <PrimaryButton onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} strokeWidth={2} />
            Create Goal
          </PrimaryButton>
        }
      />

      {/* Tabs */}
      <div className="flex items-center" style={{ gap: 8, marginTop: 24 }}>
        {tabs.map((t) => (
          <GhostButton key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </GhostButton>
        ))}
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="goals-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 16, marginTop: 24 }}>
          {summary.map((s) => (
            <Card key={s.label} style={{ padding: '18px 20px' }}>
              <MonoLabel style={{ fontSize: 10 }}>{s.label}</MonoLabel>
              <div style={{ marginTop: 10, fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: s.color || C.ink, ...num }}>
                {s.value}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Goals grid */}
      {goals.length === 0 ? (
        <Card style={{ marginTop: 24, padding: '48px 24px' }} className="flex">
          <EmptyState
            icon={Target}
            title="No goals yet"
            subtext={
              activeTab === 'completed'
                ? "You haven't completed any goals yet. Keep working on your active goals."
                : 'Create your first financial goal to start tracking your progress.'
            }
            action={
              activeTab !== 'completed' ? (
                <PrimaryButton onClick={() => setIsCreateModalOpen(true)}>
                  <Plus size={16} strokeWidth={2} />
                  Create Your First Goal
                </PrimaryButton>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="goals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16, marginTop: 24 }}>
          {goals.map((goal) => {
            const percentage = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
            const remaining = goal.target_amount - goal.current_amount;
            const daysInfo = calculateDaysRemaining(goal.deadline);
            const status = getGoalStatus(goal.current_amount, goal.target_amount, goal.deadline);
            const isHovered = hoveredGoal === goal.id;
            const isCompleted = (goal.current_amount / goal.target_amount) * 100 >= 100;
            const fill = isCompleted ? C.income : colorFor(goal.name);

            return (
              <div
                key={goal.id}
                className="ds-card-hover"
                onMouseEnter={() => setHoveredGoal(goal.id)}
                onMouseLeave={() => setHoveredGoal(null)}
                style={{ ...cardStyle, borderLeft: `3px solid ${status.color}`, position: 'relative', padding: '22px 24px', transition: 'border-color 150ms' }}
              >
                {/* Action buttons */}
                <div
                  className="flex"
                  style={{ position: 'absolute', top: 16, right: 16, gap: 4, opacity: isHovered ? 1 : 0, transition: 'opacity 150ms' }}
                >
                  <button
                    aria-label="Edit goal"
                    onClick={() => {
                      setEditingGoal(goal);
                      setIsCreateModalOpen(true);
                    }}
                    className="ds-icon-btn flex items-center justify-center"
                    style={{ width: 30, height: 30, borderRadius: 7, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer' }}
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    aria-label="Delete goal"
                    onClick={() => {
                      setSelectedGoal(goal);
                      setIsDeleteModalOpen(true);
                    }}
                    className="ds-icon-btn flex items-center justify-center"
                    style={{ width: 30, height: 30, borderRadius: 7, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Header */}
                <div className="flex items-start" style={{ gap: 14, marginBottom: 16, paddingRight: 64 }}>
                  <div
                    className="flex items-center justify-center"
                    style={{ width: 46, height: 46, borderRadius: 11, fontSize: 24, background: C.divider, border: `1px solid ${C.border}`, flexShrink: 0 }}
                  >
                    {goal.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: C.ink }}>{goal.name}</div>
                    <div className="flex items-center" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <Pill tone={status.tone}>{status.text}</Pill>
                      {goal.category && <span style={{ fontSize: 12, color: C.muted }}>{goal.category}</span>}
                    </div>
                  </div>
                </div>

                {goal.description && (
                  <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>{goal.description}</p>
                )}

                {/* Progress */}
                <div style={{ marginBottom: 16 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <span style={{ ...mono, fontSize: 10 }}>Progress</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, color: C.ink, ...num }}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 5, background: C.divider, overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', borderRadius: 5, background: fill, transition: 'width 300ms' }} />
                  </div>
                </div>

                {/* Details */}
                <div style={{ paddingTop: 14, borderTop: `1px solid ${C.divider}`, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
                    <span style={{ color: C.muted }}>Current</span>
                    <span style={{ fontWeight: 600, color: C.ink, ...num }}>{fmtMAD(goal.current_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
                    <span style={{ color: C.muted }}>Target</span>
                    <span style={{ fontWeight: 600, color: C.ink, ...num }}>{fmtMAD(goal.target_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
                    <span style={{ color: C.muted }}>Remaining</span>
                    <span style={{ fontWeight: 600, color: remaining <= 0 ? C.incomeText : C.accent, ...num }}>
                      {fmtMAD(Math.max(0, remaining))}
                    </span>
                  </div>
                  {goal.deadline && (
                    <div className="flex items-center justify-between" style={{ fontSize: 13, paddingTop: 9, borderTop: `1px solid ${C.divider}` }}>
                      <span className="flex items-center" style={{ gap: 6, color: C.muted }}>
                        <Calendar size={14} strokeWidth={1.7} />
                        Deadline
                      </span>
                      <span style={{ fontWeight: 500, color: daysInfo.isOverdue ? C.over : C.ink }}>{daysInfo.text}</span>
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
          if (isSubmitting) return;
          setIsCreateModalOpen(false);
          setEditingGoal(null);
        }}
        onSubmit={handleCreateGoal}
        editingGoal={editingGoal}
        isLoading={isSubmitting}
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
    </Page>
  );
}
