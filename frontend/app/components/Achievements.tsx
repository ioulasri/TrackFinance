import React, { useState, useEffect } from 'react';
import { Trophy, Lock, Target, PiggyBank, TrendingUp, Zap, Star, Award, CheckCircle } from 'lucide-react';
import { achievementAPI } from '../api';
import {
  C,
  MONO,
  Page,
  PageHeader,
  Card,
  SectionTitle,
  GhostButton,
  EmptyState,
  DSStyles,
  mono,
} from './ds';

const iconMap: Record<string, any> = {
  'first_transaction': CheckCircle,
  'budget_master': Target,
  'savings_champion': PiggyBank,
  'spending_tracker': TrendingUp,
  'budget_ninja': Zap,
  'goal_crusher': Star,
  'super_saver': Trophy,
  'finance_guru': Award,
};

export function Achievements() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const [achievementsRes, userAchievementsRes] = await Promise.all([
        achievementAPI.list(),
        achievementAPI.getUserAchievements(),
      ]);
      setAchievements(achievementsRes.data);
      setUserAchievements(userAchievementsRes.data);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (achievementId: number) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  const getUnlockedDate = (achievementId: number) => {
    const ua = userAchievements.find(ua => ua.achievement_id === achievementId);
    return ua ? new Date(ua.unlocked_at).toLocaleDateString() : null;
  };

  const categories = ['all', ...Array.from(new Set(achievements.map(a => a.category || 'Other')))];

  const enrichedAchievements = achievements.map(achievement => ({
    ...achievement,
    unlocked: isUnlocked(achievement.id),
    unlockedDate: getUnlockedDate(achievement.id),
    icon: iconMap[achievement.achievement_key] || Trophy,
  }));

  const filteredAchievements = enrichedAchievements.filter(achievement => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'unlocked' && achievement.unlocked) ||
      (filter === 'locked' && !achievement.unlocked);

    const matchesCategory =
      selectedCategory === 'all' ||
      achievement.category === selectedCategory;

    return matchesFilter && matchesCategory;
  });

  const unlockedCount = enrichedAchievements.filter(a => a.unlocked).length;
  const totalXP = enrichedAchievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp_reward, 0);
  const totalCount = enrichedAchievements.length;
  const completionRate = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center" style={{ minHeight: 384 }}>
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full" style={{ border: `2px solid ${C.border}`, borderBottomColor: C.accent }} />
            <p className="mt-4" style={{ fontSize: 13, color: C.muted }}>Loading achievements…</p>
          </div>
        </div>
      </Page>
    );
  }

  // ── Stat tile ──────────────────────────────────────────────────────
  const StatCard = ({
    icon: Icon,
    label,
    value,
    tint,
    iconColor,
  }: {
    icon: typeof Trophy;
    label: string;
    value: string;
    tint: string;
    iconColor: string;
  }) => (
    <Card style={{ padding: '20px 22px' }}>
      <div className="flex items-center" style={{ gap: 12, marginBottom: 14 }}>
        <div className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 8, background: tint, color: iconColor }}>
          <Icon size={19} strokeWidth={1.7} />
        </div>
        <div style={{ ...mono, fontSize: 10 }}>{label}</div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: C.ink }}>
        {value}
      </div>
    </Card>
  );

  return (
    <Page>
      <DSStyles />
      <style>{`
        @media (max-width:1024px){.ach-stats{grid-template-columns:minmax(0,1fr) !important;}.ach-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}.ach-filters{flex-direction:column !important;align-items:stretch !important;}}
        @media (max-width:640px){.ach-grid{grid-template-columns:minmax(0,1fr) !important;}}
      `}</style>

      <PageHeader eyebrow="Progress" title="Achievements" />

      {/* Stats Overview */}
      <div className="ach-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 24, marginTop: 26 }}>
        <StatCard icon={Trophy} label="Unlocked" value={`${unlockedCount} / ${totalCount}`} tint={C.accentSoft} iconColor={C.accent} />
        <StatCard icon={Star} label="Total XP Earned" value={`${totalXP} XP`} tint={C.incomeSoft} iconColor={C.income} />
        <StatCard icon={Target} label="Completion Rate" value={`${completionRate.toFixed(0)}%`} tint="rgba(212,168,69,0.14)" iconColor={C.gold} />
      </div>

      {/* Filters */}
      <Card style={{ padding: '16px 18px', marginTop: 24 }}>
        <div className="ach-filters flex items-center justify-between" style={{ gap: 14, flexWrap: 'wrap' }}>
          {/* Status filter chips */}
          <div className="flex" style={{ gap: 8 }}>
            <GhostButton active={filter === 'all'} onClick={() => setFilter('all')}>All</GhostButton>
            <GhostButton active={filter === 'unlocked'} onClick={() => setFilter('unlocked')}>Unlocked</GhostButton>
            <GhostButton active={filter === 'locked'} onClick={() => setFilter('locked')}>Locked</GhostButton>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
            style={{
              padding: '8px 14px',
              minWidth: 200,
              background: C.card,
              border: `1px solid ${C.border}`,
              color: C.ink,
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Achievements Grid */}
      {filteredAchievements.length > 0 ? (
        <div className="ach-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 24, marginTop: 24 }}>
          {filteredAchievements.map((achievement) => {
            const Icon = achievement.icon;
            const unlocked = achievement.unlocked;

            // unlocked → accent tint + dark same-hue text; locked → muted/divider.
            const iconTint = unlocked ? C.accentSoft : C.divider;
            const iconColor = unlocked ? C.accent : C.faint;
            const badgeStyle = unlocked
              ? { color: C.accent, background: C.accentSoft }
              : { color: C.muted, background: C.divider };

            return (
              <div
                key={achievement.id}
                className="ds-card-hover"
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 22,
                  transition: 'border-color 150ms',
                  opacity: unlocked ? 1 : 0.72,
                }}
              >
                {/* Icon */}
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                  <div
                    className="flex items-center justify-center"
                    style={{ width: 56, height: 56, borderRadius: 14, background: iconTint, color: iconColor }}
                  >
                    <Icon size={28} strokeWidth={1.7} />
                  </div>
                  {!unlocked && (
                    <div style={{ position: 'absolute', inset: 0 }} className="flex items-center justify-center">
                      <div
                        className="flex items-center justify-center"
                        style={{ width: 28, height: 28, borderRadius: '50%', background: C.card, border: `1px solid ${C.border}`, color: C.muted, boxShadow: '0 2px 6px rgba(26,24,21,0.08)' }}
                      >
                        <Lock size={14} strokeWidth={1.8} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: C.ink, letterSpacing: '-0.01em' }}>
                    {achievement.title}
                  </h4>
                  <p style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.45 }} className="line-clamp-2">
                    {achievement.description}
                  </p>

                  {/* Category & XP Badge */}
                  <div className="flex items-center justify-between" style={{ marginTop: 14 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 500, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 6, ...badgeStyle }}>
                      {achievement.category || 'Other'}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: unlocked ? C.accent : C.faint }}>
                      +{achievement.xp_reward} XP
                    </span>
                  </div>

                  {/* Unlock Date */}
                  {unlocked && achievement.unlockedDate && (
                    <p style={{ fontSize: 12, color: C.muted, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.divider}` }}>
                      Unlocked: <span style={{ color: C.ink2, fontWeight: 500 }}>{achievement.unlockedDate}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card style={{ padding: '40px 24px', marginTop: 24 }}>
          <EmptyState
            icon={Trophy}
            title="No achievements found"
            subtext="Try adjusting your filters to see more achievements."
          />
        </Card>
      )}
    </Page>
  );
}
