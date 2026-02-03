import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Flame, Star, ArrowUp } from 'lucide-react';
import { authAPI, transactionAPI, budgetAPI, achievementAPI } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<any>(null);
  const [achievementStats, setAchievementStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [userRes, statsRes, transactionsRes, budgetRes, achievementRes] = await Promise.all([
        authAPI.getCurrentUser(),
        authAPI.getUserStats(),
        transactionAPI.list(0, 5),
        budgetAPI.getStatus(),
        achievementAPI.getStats(),
      ]);

      setUser(userRes.data);
      setStats(statsRes.data);
      setRecentTransactions(transactionsRes.data);
      setBudgetStatus(budgetRes.data);
      setAchievementStats(achievementRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Zap className="w-12 h-12 text-purple-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.username}! 👋
          </h1>
          <p className="text-gray-300">Here's your financial overview</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Level</p>
                <p className="text-3xl font-bold text-white">{stats?.current_level || 0}</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-full">
                <Star className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Total XP</p>
                <p className="text-3xl font-bold text-white">{stats?.total_xp || 0}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Zap className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Current Streak</p>
                <p className="text-3xl font-bold text-white">{stats?.current_streak || 0} days</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-full">
                <Flame className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm mb-1">Achievements</p>
                <p className="text-3xl font-bold text-white">
                  {achievementStats?.unlocked_count || 0}/{achievementStats?.total_achievements || 0}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-full">
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* XP Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">Level Progress</h3>
              <p className="text-gray-300 text-sm">
                {stats?.xp_to_next_level || 0} XP to next level
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <ArrowUp className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-white">
                {stats?.level_progress_percentage?.toFixed(1) || 0}%
              </span>
            </div>
          </div>
          <div className="w-full h-4 bg-gray-700/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats?.level_progress_percentage || 0}%` }}
              transition={{ duration: 1, delay: 0.6 }}
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="card"
          >
            <h3 className="text-xl font-bold text-white mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 glass-dark rounded-lg"
                  >
                    <div>
                      <p className="text-white font-semibold">{transaction.category}</p>
                      <p className="text-gray-400 text-sm">{transaction.description || 'No description'}</p>
                    </div>
                    <p className={`font-bold ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No transactions yet</p>
              )}
            </div>
          </motion.div>

          {/* Budget Overview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="card"
          >
            <h3 className="text-xl font-bold text-white mb-4">Budget Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Total Limit</span>
                <span className="text-white font-semibold">
                  ${budgetStatus?.total_monthly_limit?.toFixed(2) || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Total Spent</span>
                <span className="text-white font-semibold">
                  ${budgetStatus?.total_spent?.toFixed(2) || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Remaining</span>
                <span className="text-green-400 font-semibold">
                  ${budgetStatus?.remaining?.toFixed(2) || 0}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (budgetStatus?.total_spent / budgetStatus?.total_monthly_limit) * 100 > 90
                      ? 'bg-red-500'
                      : 'bg-gradient-to-r from-green-500 to-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      (budgetStatus?.total_spent / budgetStatus?.total_monthly_limit) * 100 || 0,
                      100
                    )}%`,
                  }}
                />
              </div>
              {budgetStatus?.over_budget_count > 0 && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-200 text-sm">
                    ⚠️ {budgetStatus.over_budget_count} budget(s) exceeded
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
