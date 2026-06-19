import { useEffect, useState } from 'react';
import {
  Search,
  Bell,
  Settings2,
  Edit2,
  Wallet,
  PieChart as PieChartIcon,
  Target,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { authAPI, transactionAPI, budgetAPI } from '../api';

// ── Design tokens (concrete hexes for recharts; mirror styles/theme.css) ──
const POSITIVE = '#1d9e75';
const NEGATIVE = '#d85a30';
const DONUT_RAMP = ['#0f6e56', '#1d9e75', '#5dcaa5', '#9fe1cb'];

// ── Shared style atoms ────────────────────────────────────────────────────
const card =
  'bg-card rounded-[16px] p-5 border border-[color:var(--border)] ' +
  'shadow-[0_1px_2px_rgba(15,30,26,0.04),0_8px_24px_-12px_rgba(15,30,26,0.12)]';
const microLabel =
  'text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground';
const sectionTitle = 'text-[16px] font-medium text-foreground';

// Format money the same way everywhere: rounded, grouped, trailing MAD.
const fmt = (n: number) => `${Math.round(n || 0).toLocaleString('en-US')} MAD`;

function EmptyState({
  icon: Icon,
  title,
  subtext,
}: {
  icon: typeof Wallet;
  title: string;
  subtext?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground/70">{title}</p>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<any>(null);
  const [costAnalysisData, setCostAnalysisData] = useState<any[]>([]);
  const [loadingCostAnalysis, setLoadingCostAnalysis] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadCostAnalysis();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, transactionsRes, budgetRes] = await Promise.all([
        authAPI.getUserStats(),
        transactionAPI.list(0, 1000),
        budgetAPI.getStatus(),
      ]);

      setStats(statsRes.data);
      setRecentTransactions(transactionsRes.data);
      setBudgetStatus(budgetRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCostAnalysis = async () => {
    try {
      setLoadingCostAnalysis(true);
      const response = await transactionAPI.getTransactionsByCategory();
      const transactions = response.data;

      const expenses = transactions.filter((t: any) => t.type === 'expense');
      const totalExpenses = expenses.reduce((sum: number, t: any) => sum + t.amount, 0);

      const categoryMap: { [key: string]: number } = {};
      expenses.forEach((t: any) => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
      });

      // Tonal teal ramp — one hue, light→dark, cycled if many categories.
      const categoryData = Object.entries(categoryMap).map(([name, amount], index) => ({
        name,
        value: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        color: DONUT_RAMP[index % DONUT_RAMP.length],
      }));

      categoryData.sort((a, b) => b.value - a.value);
      setCostAnalysisData(categoryData);
    } catch (error) {
      console.error('Failed to load cost analysis:', error);
      setCostAnalysisData([]);
    } finally {
      setLoadingCostAnalysis(false);
    }
  };

  // ── Last 7 days, grouped by day ──────────────────────────────────────────
  const calculateBalanceData = () => {
    const today = new Date();
    const daysArray: Array<{ day: string; fullDate: string; income: number; expenses: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      daysArray.push({
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
        fullDate: date.toISOString().split('T')[0],
        income: 0,
        expenses: 0,
      });
    }

    recentTransactions.forEach((transaction) => {
      const dateStr = new Date(transaction.date).toISOString().split('T')[0];
      const dayEntry = daysArray.find((d) => d.fullDate === dateStr);
      if (dayEntry) {
        if (transaction.type === 'income') dayEntry.income += transaction.amount;
        else if (transaction.type === 'expense') dayEntry.expenses += transaction.amount;
      }
    });

    return daysArray;
  };

  const balanceData = calculateBalanceData();

  // Running net balance across the 7-day window — feeds the hero sparkline.
  let running = 0;
  const trendData = balanceData.map((d) => {
    running += d.income - d.expenses;
    return { day: d.day, value: running };
  });

  const totalIncome = recentTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = recentTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const savedBalance = totalIncome - totalExpenses;
  const totalBalance = savedBalance;

  const chartTotalIncome = balanceData.reduce((sum, day) => sum + day.income, 0);
  const chartTotalExpenses = balanceData.reduce((sum, day) => sum + day.expenses, 0);
  const hasTrendData = chartTotalIncome > 0 || chartTotalExpenses > 0;

  const monthlyLimit = budgetStatus?.total_monthly_limit || 0;
  const spentThisMonth = budgetStatus?.total_spent || 0;
  const remainingBudget = monthlyLimit - spentThisMonth;
  const budgetProgressPercentage =
    monthlyLimit > 0
      ? Math.min((spentThisMonth / monthlyLimit) * 100, 100)
      : spentThisMonth > 0
      ? 100
      : 0;
  const overBudget = budgetProgressPercentage > 90;

  // ── XP / level (real data) ───────────────────────────────────────────────
  const level = stats?.current_level ?? 0;
  const totalXp = stats?.total_xp ?? 0;
  const levelFloor = level * level * 100;
  const nextThreshold = (level + 1) * (level + 1) * 100;
  const intoLevel = Math.max(totalXp - levelFloor, 0);
  const levelSpan = nextThreshold - levelFloor;
  const xpPct = levelSpan > 0 ? Math.min((intoLevel / levelSpan) * 100, 100) : 0;

  const financialHealthScore = Math.min(level * 10, 100);
  const ringCircumference = 2 * Math.PI * 70;

  const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'var(--foreground)',
    boxShadow: '0 8px 24px -12px rgba(15,30,26,0.25)',
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-auto bg-background">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* Top Bar */}
      <div className="border-b border-border bg-card px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="max-w-md flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Quick search"
                className="w-full rounded-lg border-0 bg-muted py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative rounded-lg p-2 transition-colors hover:bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--negative)]"></span>
            </button>
            <button className="rounded-lg p-2 transition-colors hover:bg-muted">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-[14px] p-8">
        {/* Balance Overview */}
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
          {/* Net balance hero */}
          <div className={`${card} flex flex-col lg:col-span-2`}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className={microLabel}>Net balance</p>
                <p className="mt-1 text-[40px] font-medium leading-[1.1] tracking-[-0.01em] text-foreground tnum">
                  {fmt(totalBalance)}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-[8px] bg-muted p-0.5 text-xs">
                <span className="rounded-[6px] bg-card px-2.5 py-1 font-medium text-foreground shadow-sm">
                  7d
                </span>
                <span className="px-2.5 py-1 text-muted-foreground">30d</span>
              </div>
            </div>

            {/* Legend — paired dot + text label, never color alone */}
            <div className="mb-3 flex items-center gap-5 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: POSITIVE }}
                ></span>
                <span className="text-muted-foreground">Income</span>
                <span className="font-medium text-[var(--positive-text)] tnum">
                  {fmt(chartTotalIncome)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: NEGATIVE }}
                ></span>
                <span className="text-muted-foreground">Expenses</span>
                <span className="font-medium text-[var(--negative-text)] tnum">
                  {fmt(chartTotalExpenses)}
                </span>
              </div>
            </div>

            {/* Trend area: gradient sparkline when there's data, else empty state */}
            <div
              className="flex min-h-[180px] flex-1 flex-col"
              role="img"
              aria-label={
                hasTrendData
                  ? `Net balance trend over the last 7 days, currently ${fmt(totalBalance)}`
                  : 'Net balance trend — no activity in the last 7 days'
              }
            >
              {hasTrendData ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={trendData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={POSITIVE} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={POSITIVE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [fmt(value), 'Net']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={POSITIVE}
                      strokeWidth={2}
                      fill="url(#netFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="No activity yet"
                  subtext="Add your first transaction to see your trend"
                />
              )}
            </div>

            {/* Slim XP / level bar, anchored to the bottom */}
            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  Level {level} · {totalXp.toLocaleString('en-US')} XP total
                </span>
                <span className="text-muted-foreground tnum">
                  {intoLevel.toLocaleString('en-US')} / {levelSpan.toLocaleString('en-US')} XP
                </span>
              </div>
              <div className="h-[7px] w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${xpPct}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Income / Expenses / Saved */}
          <div className="space-y-[14px]">
            <div className={card}>
              <p className={microLabel}>Total income</p>
              <p className="mt-1 text-[26px] font-medium text-[var(--positive-text)] tnum">
                {fmt(totalIncome)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">All recorded income</p>
            </div>
            <div className={card}>
              <p className={microLabel}>Total expenses</p>
              <p className="mt-1 text-[26px] font-medium text-[var(--negative-text)] tnum">
                {fmt(totalExpenses)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">All recorded spending</p>
            </div>
            <div className={card}>
              <p className={microLabel}>Saved balance</p>
              <p
                className="mt-1 text-[26px] font-medium tnum"
                style={{ color: savedBalance >= 0 ? 'var(--positive-text)' : 'var(--negative-text)' }}
              >
                {fmt(savedBalance)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Income minus expenses</p>
            </div>
          </div>
        </div>

        {/* Monthly Spending & Tips */}
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
          <div className={`${card} flex flex-col`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className={sectionTitle}>Monthly spending</h3>
              <Edit2 className="h-4 w-4 text-muted-foreground" />
            </div>
            {monthlyLimit > 0 ? (
              <div>
                <p className={microLabel}>Used</p>
                <p
                  className="mt-1 text-[26px] font-medium tnum"
                  style={{ color: overBudget ? 'var(--negative-text)' : 'var(--positive-text)' }}
                >
                  {budgetProgressPercentage.toFixed(0)}%
                </p>
                <div className="mb-2 mt-4 flex items-end justify-between">
                  <div>
                    <p className={microLabel}>Spent</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground tnum">
                      {fmt(spentThisMonth)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={microLabel}>Limit</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground tnum">
                      {fmt(monthlyLimit)}
                    </p>
                  </div>
                </div>
                <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${budgetProgressPercentage}%`,
                      backgroundColor: overBudget ? 'var(--negative)' : 'var(--positive)',
                    }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Remaining:{' '}
                  <span
                    className="font-medium"
                    style={{
                      color: remainingBudget >= 0 ? 'var(--positive-text)' : 'var(--negative-text)',
                    }}
                  >
                    {fmt(remainingBudget)}
                  </span>
                </p>
              </div>
            ) : (
              <EmptyState
                icon={Wallet}
                title="No budgets set"
                subtext="Create a budget to track your spending"
              />
            )}
          </div>

          {/* Tip card — tonal teal, calm */}
          <div className="relative overflow-hidden rounded-[16px] border border-[color:var(--border)] bg-[var(--positive-tint)] p-5 lg:col-span-2">
            <div className="relative z-10 max-w-md">
              <h3 className={`${sectionTitle} mb-2`}>Optimize your budget with a few habits</h3>
              <p className="mb-3 text-sm text-foreground/70">
                Set aside a small share of each income toward your goals — consistency compounds
                faster than big one-off deposits.
              </p>
              <button className="flex items-center gap-1 text-sm font-medium text-[var(--positive-text)] hover:opacity-80">
                Read more <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-[var(--positive)] opacity-10"></div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
          {/* Cost analysis — tonal donut */}
          <div className={`${card} flex flex-col`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className={sectionTitle}>Cost analysis</h3>
                <p className={`${microLabel} mt-0.5`}>Spending by category</p>
              </div>
            </div>
            {loadingCostAnalysis ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            ) : costAnalysisData.length > 0 ? (
              <div>
                <div
                  className="relative mx-auto h-[160px] w-[160px]"
                  role="img"
                  aria-label={`Spending split across ${costAnalysisData.length} categories, totalling ${fmt(
                    totalExpenses
                  )}`}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costAnalysisData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {costAnalysisData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[18px] font-medium text-foreground tnum">
                      {fmt(totalExpenses)}
                    </p>
                    <p className={microLabel}>Total</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {costAnalysisData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></span>
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium text-foreground tnum">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={PieChartIcon}
                title="No expenses yet"
                subtext="Spending will break down by category here"
              />
            )}
          </div>

          {/* Financial health */}
          <div className={`${card} flex flex-col`}>
            <div className="mb-4">
              <h3 className={sectionTitle}>Financial health</h3>
              <p className={`${microLabel} mt-0.5`}>Overall score</p>
            </div>
            <div
              className="relative mx-auto my-2 h-40 w-40"
              role="img"
              aria-label={`Financial health score: ${financialHealthScore} out of 100`}
            >
              <svg className="h-full w-full -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="var(--muted)" strokeWidth="12" fill="none" />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="var(--positive)"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(financialHealthScore / 100) * ringCircumference} ${ringCircumference}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-[32px] font-medium text-foreground tnum">{financialHealthScore}%</p>
                  <p className={microLabel}>of 100</p>
                </div>
              </div>
            </div>
            <p className="mt-auto text-center text-xs text-muted-foreground">
              Grows as you level up by recording activity
            </p>
          </div>

          {/* Goal tracker */}
          <div className={`${card} flex flex-col`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className={sectionTitle}>Goal tracker</h3>
              <button className="flex items-center text-xs font-medium text-primary hover:opacity-80">
                + Add goal
              </button>
            </div>
            <EmptyState
              icon={Target}
              title="No goals yet"
              subtext="Set a savings goal to track your progress"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
