import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, Lightbulb, Sparkles, Flame } from 'lucide-react';
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

  // Aggregate totals
  const totalIncome = useMemo(
    () => transactions.filter((t: any) => t.type === 'income')
      .reduce((s: number, t: any) => s + parseFloat(t.amount || 0), 0),
    [transactions]
  );
  const totalExpenses = useMemo(
    () => transactions.filter((t: any) => t.type === 'expense')
      .reduce((s: number, t: any) => s + parseFloat(t.amount || 0), 0),
    [transactions]
  );
  const balance = totalIncome - totalExpenses;
  const totalBudget = budgetStatus?.total_monthly_limit || 0;
  const totalSpent = budgetStatus?.total_spent || 0;
  const remaining = totalBudget - totalSpent;

  // 7-day rolling balance series for the hero sparkline
  const sparkline = useMemo(() => buildSparkline(transactions), [transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary mx-auto" />
          <p className="mt-4 text-muted-foreground text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!userStats) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Failed to load user stats</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-full">
      {/* ── Hero: greeting + net balance card spanning + two small stats ── */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Welcome back{userStats?.username ? `, ${userStats.username}` : ''}.
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          Your money, today.
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Big net balance card — spans 2 cols on large screens */}
        <div className="lg:col-span-2 relative bg-card rounded-2xl border border-border overflow-hidden
                        shadow-[0_1px_2px_rgba(15,30,26,0.04),0_8px_24px_rgba(5,150,105,0.08)]">
          {/* Decorative emerald wash */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-card to-card pointer-events-none" />
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Net balance
                </p>
                <p className="text-4xl md:text-5xl font-bold text-foreground tabular-nums tracking-tight">
                  {formatMAD(balance)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums border
                                bg-emerald-50 text-emerald-700 border-emerald-200">
                  <TrendingUp size={12} /> {formatMAD(totalIncome - totalExpenses)} net
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-muted-foreground bg-muted">
                  <Flame size={12} className="text-amber-500" /> {userStats?.current_streak ?? 0}-day streak
                </div>
              </div>
            </div>

            <Sparkline points={sparkline} />

            <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
              <span>Level <strong className="text-foreground tabular-nums">{userStats.current_level}</strong></span>
              <span className="h-3 w-px bg-border" />
              <span>{userStats.total_xp ?? 0} XP total</span>
            </div>
          </div>
        </div>

        {/* Two small stacked stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
          <StatCard
            title="Income"
            value={formatMAD(totalIncome)}
            trend={{ value: 12.5, isPositive: true }}
            icon={<TrendingUp size={20} />}
            accentColor="emerald"
          />
          <StatCard
            title="Expenses"
            value={formatMAD(totalExpenses)}
            trend={{ value: 8.3, isPositive: false }}
            icon={<TrendingDown size={20} />}
            accentColor="amber"
          />
        </div>
      </div>

      {/* ── Main grid: charts left, side panel right ────────────────── */}
      <div className="flex flex-col xl:flex-row gap-6 w-full">
        <div className="flex-1 w-full xl:w-2/3 flex flex-col gap-6">
          <BalanceChart />
          <RecentTransactions />
          <GoalsTracker />
        </div>

        <div className="w-full xl:w-1/3 flex flex-col gap-6">
          <CostAnalysis />

          {/* Monthly Spending Progress */}
          <div className="bg-card rounded-2xl p-6 border border-border
                          shadow-[0_1px_2px_rgba(15,30,26,0.04),0_4px_12px_rgba(15,30,26,0.04)]">
            <h3 className="text-lg text-foreground mb-6 font-bold">Monthly Spending</h3>
            {totalBudget > 0 ? (
              <div className="space-y-5">
                <ProgressBar current={totalSpent} max={totalBudget} />
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Spent</p>
                    <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{formatMAD(totalSpent)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Limit</p>
                    <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{formatMAD(totalBudget)}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">Remaining</span>
                  <span
                    className={`text-sm font-semibold px-2.5 py-1 rounded-full tabular-nums ${
                      remaining >= 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {formatMAD(remaining)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Wallet size={26} className="text-primary" />
                </div>
                <p className="text-base text-foreground font-bold mb-1">No budgets yet</p>
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  Create a budget to track your monthly spending and unlock the alert system.
                </p>
              </div>
            )}
          </div>

          {/* AI Insights */}
          <div className="bg-card rounded-2xl p-6 border border-border
                          shadow-[0_1px_2px_rgba(15,30,26,0.04),0_4px_12px_rgba(15,30,26,0.04)]">
            <h3 className="text-lg text-foreground mb-5 font-bold flex items-center gap-2">
              <Sparkles size={18} className="text-primary" /> AI Insights
            </h3>
            <div className="space-y-3">
              {[
                { tip: "You're spending 32% more on dining out this month.", tone: 'amber' as const },
                { tip: 'Entertainment budget is well under control. Nice.',  tone: 'emerald' as const },
                { tip: 'Consider setting aside 500 MAD more for savings.',   tone: 'teal' as const },
              ].map((item, index) => (
                <InsightRow key={index} tone={item.tone}>{item.tip}</InsightRow>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────

function formatMAD(n: number): string {
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MAD`;
}

function buildSparkline(transactions: any[]): number[] {
  // Build a 7-day cumulative net (income − expense) ending today.
  const days = 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = new Array(days).fill(0);

  for (const t of transactions) {
    const d = new Date(t.date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0 || diff >= days) continue;
    const delta = parseFloat(t.amount || 0) * (t.type === 'income' ? 1 : -1);
    buckets[days - 1 - diff] += delta;
  }
  // Convert to running cumulative
  let running = 0;
  return buckets.map((v) => { running += v; return running; });
}

interface SparklineProps { points: number[] }

function Sparkline({ points }: SparklineProps) {
  if (!points.length) return null;
  const width = 480;
  const height = 56;
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 0);
  const range = max - min || 1;

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1 || 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaPath = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-14 mt-2" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#059669" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-fill)" />
      <path d={path} fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface InsightRowProps {
  tone: 'emerald' | 'amber' | 'teal' | 'rose';
  children: React.ReactNode;
}

function InsightRow({ tone, children }: InsightRowProps) {
  const tones = {
    emerald: 'bg-emerald-50/60 border-emerald-200 text-emerald-700',
    amber:   'bg-amber-50/60   border-amber-200   text-amber-700',
    teal:    'bg-teal-50/60    border-teal-200    text-teal-700',
    rose:    'bg-rose-50/60    border-rose-200    text-rose-700',
  };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${tones[tone]}`}>
      <Lightbulb size={16} className="shrink-0 mt-0.5" />
      <p className="text-sm text-foreground leading-snug">{children}</p>
    </div>
  );
}
