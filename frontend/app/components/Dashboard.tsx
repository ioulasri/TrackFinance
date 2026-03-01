import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, Lightbulb, Sparkles } from 'lucide-react';
import { StatCard } from './StatCard';
import { BalanceChart } from './BalanceChart';
import { ProgressBar } from './ProgressBar';
import { CostAnalysis } from './CostAnalysis';
import { GoalsTracker } from './GoalsTracker';
import { RecentTransactions } from './RecentTransactions';
import { authAPI, budgetAPI, transactionAPI } from '../api';

export function Dashboard() {
  const [userStats, setUserStats] = useState<any>(null);
  const [budgetStatus, setBudgetStatus] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, budgetRes, transactionsRes] = await Promise.all([
        authAPI.getUserStats(),
        budgetAPI.getStatus(),
        transactionAPI.list(0, 1000),
      ]);
      setUserStats(statsRes.data);
      setBudgetStatus(budgetRes.data);
      setTransactions(transactionsRes.data || []);
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

  // Calculate totals from transactions (not from userStats which doesn't have these fields)
  const totalIncome = transactions
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);

  const totalExpenses = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);

  const balance = totalIncome - totalExpenses;
  const totalBudget = budgetStatus?.total_monthly_limit || 0;
  const totalSpent = budgetStatus?.total_spent || 0;
  const remaining = totalBudget - totalSpent;

  if (!userStats) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Failed to load user stats</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 min-h-full">
      {/* Deep Atmospheric Background for Desktop Widescreen */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-30%] right-[-20%] w-[70vw] h-[70vw] bg-primary/10 rounded-full blur-[180px] mix-blend-screen opacity-40 animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[-30%] left-[-20%] w-[70vw] h-[70vw] bg-blue-900/10 rounded-full blur-[180px] mix-blend-screen opacity-40 animate-pulse" style={{ animationDuration: '15s' }} />
      </div>

      {/* Hero Stats Row (This Month's Overview) */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <Lightbulb size={14} />
            <span className="text-xs font-medium uppercase tracking-wider">Level {userStats.current_level}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70 tracking-tight">This Month's Overview</h2>
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

      {/* Widescreen Main Area */}
      <div className="flex flex-col xl:flex-row gap-8 relative z-10 w-full mb-8">
        
        {/* Left Column (Main Content) - max width 2/3 */}
        <div className="flex-1 w-full xl:w-2/3 flex flex-col gap-8">
          {/* Balance Chart spanning full width of left column */}
          <BalanceChart />
          
          <RecentTransactions />
          <GoalsTracker />
        </div>

        {/* Right Column (Side Panel) - width 1/3 */}
        <div className="w-full xl:w-1/3 flex flex-col gap-8">
          {/* Cost Analysis limited to side panel */}
          <CostAnalysis />

          {/* Monthly Spending Progress */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border transition-colors">
            <h3 className="text-xl text-foreground mb-8 font-bold">Monthly Spending Progress</h3>
            {totalBudget > 0 ? (
              <div className="space-y-6">
                <ProgressBar current={totalSpent} max={totalBudget} />
                <div className="flex items-center justify-between pt-4">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Spent this month</p>
                    <p className="text-3xl font-bold text-foreground mt-1">MAD {totalSpent.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground font-medium">Budget limit</p>
                    <p className="text-3xl font-bold text-foreground mt-1">MAD {totalBudget.toLocaleString()}</p>
                  </div>
                </div>
                <div className="pt-6 border-t border-border/50">
                  <p className="text-sm text-muted-foreground font-medium flex justify-between items-center">
                    <span>Remaining Balance:</span>
                    <span className={`text-lg px-3 py-1 rounded-lg ${remaining >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>MAD {remaining.toLocaleString()}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(127,13,242,0.2)]">
                  <Wallet size={36} className="text-primary" />
                </div>
                <p className="text-xl text-foreground font-bold mb-2">No budgets set</p>
                <p className="text-sm text-muted-foreground max-w-[250px]">Create a budget to track your monthly spending and earn points.</p>
              </div>
            )}
          </div>

          {/* Quick Budget Tips */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border transition-colors">
            <h3 className="text-xl text-foreground mb-6 font-bold flex items-center gap-2">
              <Sparkles size={20} className="text-primary" />
              AI Insights
            </h3>
            <div className="space-y-4">
              {[
                {
                  tip: 'You\'re spending 32% more on dining out this month.',
                  color: 'orange',
                },
                {
                  tip: 'Great job! Your entertainment budget is under control.',
                  color: 'emerald',
                },
                {
                  tip: 'Consider setting aside MAD 500 more for savings.',
                  color: 'blue',
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-lg ${item.color === 'orange' ? 'bg-orange-500/5 border-orange-500/20 hover:shadow-orange-500/10' :
                    item.color === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/20 hover:shadow-emerald-500/10' :
                      'bg-blue-500/5 border-blue-500/20 hover:shadow-blue-500/10'
                    }`}
                >
                  <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${item.color === 'orange' ? 'bg-orange-500/20 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' :
                    item.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                      'bg-blue-500/20 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    }`}>
                    <Lightbulb size={18} />
                  </div>
                  <p className="text-sm text-foreground flex-1 font-medium leading-relaxed">{item.tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
