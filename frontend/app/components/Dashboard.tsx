import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, Lightbulb } from 'lucide-react';
import { StatCard } from './StatCard';
import { BalanceChart } from './BalanceChart';
import { ProgressBar } from './ProgressBar';
import { CostAnalysis } from './CostAnalysis';
import { GoalsTracker } from './GoalsTracker';
import { RecentTransactions } from './RecentTransactions';
import { XPBar } from './XPBar';
import { authAPI, budgetAPI } from '../api';

export function Dashboard() {
  const [userStats, setUserStats] = useState<any>(null);
  const [budgetStatus, setBudgetStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, budgetRes] = await Promise.all([
        authAPI.getUserStats(),
        budgetAPI.getStatus(),
      ]);
      setUserStats(statsRes.data);
      setBudgetStatus(budgetRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userStats) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Failed to load dashboard data</p>
      </div>
    );
  }

  const totalIncome = userStats.total_income || 0;
  const totalExpenses = userStats.total_expenses || 0;
  const balance = totalIncome - totalExpenses;
  const totalBudget = budgetStatus?.total_budget || 0;
  const totalSpent = budgetStatus?.total_spent || 0;
  const remaining = totalBudget - totalSpent;

  return (
    <div className="space-y-6">
      {/* XP Bar */}
      <div className="flex justify-end">
        <div className="w-80">
          <XPBar 
            currentXP={userStats.current_xp || 0} 
            requiredXP={userStats.xp_to_next_level || 100} 
            level={userStats.level || 1} 
          />
        </div>
      </div>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-3 gap-6">
        <StatCard
          title="Total Income"
          value={`MAD ${totalIncome.toLocaleString()}`}
          trend={{ value: 12.5, isPositive: true }}
          icon={<TrendingUp size={24} />}
          accentColor="emerald"
        />
        <StatCard
          title="Total Expenses"
          value={`MAD ${totalExpenses.toLocaleString()}`}
          trend={{ value: 8.3, isPositive: false }}
          icon={<TrendingDown size={24} />}
          accentColor="blue"
        />
        <StatCard
          title="Balance / Saved"
          value={`MAD ${balance.toLocaleString()}`}
          trend={{ value: 15.2, isPositive: true }}
          icon={<Wallet size={24} />}
          accentColor="purple"
        />
      </div>

      {/* Balance Overview Chart */}
      <BalanceChart />

      {/* Two-Column Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Monthly Spending Progress */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-gray-900 mb-6">Monthly Spending Progress</h3>
          <div className="space-y-4">
            <ProgressBar current={totalSpent} max={totalBudget || 1} />
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm text-gray-600">Spent this month</p>
                <p className="text-2xl font-bold text-gray-900">MAD {totalSpent.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Budget limit</p>
                <p className="text-2xl font-bold text-gray-900">MAD {totalBudget.toLocaleString()}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Remaining: <span className="font-semibold text-emerald-600">MAD {remaining.toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Budget Tips */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-gray-900 mb-6">Quick Budget Tips</h3>
          <div className="space-y-4">
            {[
              {
                tip: 'You\'re spending 32% more on dining out this month',
                color: 'orange',
              },
              {
                tip: 'Great job! Your entertainment budget is under control',
                color: 'emerald',
              },
              {
                tip: 'Consider setting aside MAD 500 more for savings',
                color: 'blue',
              },
            ].map((item, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-xl ${
                  item.color === 'orange' ? 'bg-orange-50' :
                  item.color === 'emerald' ? 'bg-emerald-50' :
                  'bg-blue-50'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${
                  item.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                  item.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <Lightbulb size={16} />
                </div>
                <p className="text-sm text-gray-700 flex-1">{item.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cost Analysis Breakdown */}
      <CostAnalysis />

      {/* Goals Tracker */}
      <GoalsTracker />

      {/* Recent Transactions */}
      <RecentTransactions />
    </div>
  );
}
