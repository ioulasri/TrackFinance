import React, { useState, useEffect } from 'react';
import { Trophy, Lock, Target, PiggyBank, TrendingUp, Zap, Star, Award, CheckCircle } from 'lucide-react';
import { achievementAPI } from '../api';

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
    color: 'purple',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading achievements...</p>
        </div>
      </div>
    );
  }

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
    purple: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Achievements</h1>
        <p className="text-muted-foreground mt-1">Track your financial milestones and earn rewards</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Trophy size={24} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Unlocked</p>
          </div>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {unlockedCount} / {enrichedAchievements.length}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Star size={24} className="text-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Total XP Earned</p>
          </div>
          <p className="text-3xl font-bold text-foreground tracking-tight">{totalXP} XP</p>
        </div>
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Target size={24} className="text-blue-500" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Completion Rate</p>
          </div>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {((unlockedCount / enrichedAchievements.length) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <div className="flex items-center justify-between">
          {/* Status Filter */}
          <div className="flex gap-2 p-1 bg-input rounded-lg border border-border">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all ${filter === 'all'
                  ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(127,13,242,0.4)]'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unlocked')}
              className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all ${filter === 'unlocked'
                  ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Unlocked
            </button>
            <button
              onClick={() => setFilter('locked')}
              className={`flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all ${filter === 'locked'
                  ? 'bg-gray-600 text-white shadow-[0_0_10px_rgba(75,85,99,0.4)]'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Locked
            </button>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-input border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none min-w-[200px]"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-4 gap-6">
        {filteredAchievements.map((achievement) => {
          const Icon = achievement.icon;
          const colors = colorClasses[achievement.color];

          return (
            <div
              key={achievement.id}
              className={`rounded-2xl p-6 shadow-sm transition-all group ${achievement.unlocked
                  ? `bg-card border border-border hover:border-primary/30 hover:shadow-[0_0_15px_rgba(127,13,242,0.1)]`
                  : 'bg-card/50 border border-border/50 opacity-60'
                }`}
            >
              {/* Icon */}
              <div className="relative mb-4 inline-block">
                <div className={`p-4 rounded-2xl transition-transform duration-300 ${achievement.unlocked ? 'group-hover:scale-110' : ''} ${achievement.unlocked
                    ? `${colors.bg} ${colors.text} shadow-[0_0_10px_rgba(127,13,242,0.2)]`
                    : 'bg-muted text-muted-foreground'
                  }`}>
                  <Icon size={32} />
                </div>
                {!achievement.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-2 bg-background border border-border rounded-full shadow-lg">
                      <Lock size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">
                  {achievement.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {achievement.description}
                </p>

                {/* Category & XP Badge */}
                <div className="flex items-center justify-between pt-2">
                  <span className={`text-xs px-2 py-1 rounded-md ${achievement.unlocked ? `${colors.bg} ${colors.text}` : 'bg-muted text-muted-foreground'
                    } font-medium`}>
                    {achievement.category || 'Other'}
                  </span>
                  <span className={`text-xs font-bold ${achievement.unlocked ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                    +{achievement.xp_reward} XP
                  </span>
                </div>

                {/* Unlock Date */}
                {achievement.unlocked && achievement.unlockedDate && (
                  <p className="text-xs text-muted-foreground pt-3 border-t border-border mt-3">
                    Unlocked: <span className="text-foreground">{achievement.unlockedDate}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAchievements.length === 0 && (
        <div className="bg-card rounded-2xl p-12 shadow-sm border border-border text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-muted rounded-full inline-flex mb-4">
              <Trophy size={48} className="text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No achievements found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters to see more achievements
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
