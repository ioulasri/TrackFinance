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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading achievements...</p>
        </div>
      </div>
    );
  }

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-900">Achievements</h1>
        <p className="text-gray-600 mt-1">Track your financial milestones and earn rewards</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-xl">
              <Trophy size={24} className="text-purple-600" />
            </div>
            <p className="text-sm text-gray-600">Unlocked</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {unlockedCount} / {enrichedAchievements.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <Star size={24} className="text-emerald-600" />
            </div>
            <p className="text-sm text-gray-600">Total XP Earned</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalXP} XP</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Target size={24} className="text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">Completion Rate</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {((unlockedCount / enrichedAchievements.length) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unlocked')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filter === 'unlocked'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Unlocked
            </button>
            <button
              onClick={() => setFilter('locked')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filter === 'locked'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Locked
            </button>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
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
              className={`rounded-2xl p-6 shadow-sm transition-all ${
                achievement.unlocked
                  ? `bg-white border-2 ${colors.border} hover:shadow-md`
                  : 'bg-gray-50 border border-gray-200 opacity-60'
              }`}
            >
              {/* Icon */}
              <div className="relative mb-4">
                <div className={`p-4 rounded-2xl ${
                  achievement.unlocked
                    ? `${colors.bg} ${colors.text}`
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  <Icon size={32} />
                </div>
                {!achievement.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-2 bg-gray-700 rounded-full">
                      <Lock size={20} className="text-white" />
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">
                  {achievement.unlocked ? achievement.title : '???'}
                </h4>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {achievement.unlocked 
                    ? achievement.description 
                    : achievement.requirement || 'Complete the requirement to unlock'}
                </p>

                {/* Category & XP Badge */}
                <div className="flex items-center justify-between pt-2">
                  <span className={`text-xs px-2 py-1 rounded-md ${colors.bg} ${colors.text} font-medium`}>
                    {achievement.category || 'Other'}
                  </span>
                  <span className="text-xs font-bold text-purple-600">
                    +{achievement.xp_reward} XP
                  </span>
                </div>

                {/* Unlock Date */}
                {achievement.unlocked && achievement.unlockedDate && (
                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                    Unlocked: {achievement.unlockedDate}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAchievements.length === 0 && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-gray-100 rounded-full inline-flex mb-4">
              <Trophy size={48} className="text-gray-400" />
            </div>
            <h3 className="text-gray-900 mb-2">No achievements found</h3>
            <p className="text-gray-600">
              Try adjusting your filters to see more achievements
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
