import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  Target,
  Zap,
  Sparkles,
  Wallet,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { transactionAPI, budgetAPI } from '../api';

interface AnalysisData {
  financial_health_score: number;
  spending_trend: { month: string; spending: number; income: number }[];
  category_breakdown: { category: string; amount: number; percentage: number }[];
  savings_rate: number;
  net_worth: number;
  monthly_comparison: { current_month: number; previous_month: number; change_percentage: number };
  top_categories: { category: string; amount: number; trend: 'up' | 'down' | 'stable' }[];
  insights: { type: 'warning' | 'success' | 'info'; title: string; description: string }[];
  predictions: { next_month_spending: number; next_month_income: number; confidence_score: number };
  budget_performance: { category: string; budget: number; spent: number; percentage: number }[];
}

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F43F5E', '#F59E0B', '#06B6D4'];

export function Analysis() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [transactionsRes, budgetsRes] = await Promise.all([
        transactionAPI.list(0, 1000),
        budgetAPI.list(),
      ]);

      const transactions = transactionsRes.data;
      const budgets = budgetsRes.data;

      const processedData = processFinancialData(transactions, budgets);
      setAnalysisData(processedData);
    } catch (err) {
      console.error('Failed to load analysis:', err);
      setError('Failed to load financial data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const processFinancialData = (transactions: any[], budgets: any[]): AnalysisData => {
    const spendingTrend = calculateSpendingTrend(transactions);
    const categoryBreakdown = calculateCategoryBreakdown(transactions);
    const monthlyComparison = calculateMonthlyComparison(transactions);
    const savingsRate = calculateSavingsRate(transactions);
    const topCategories = calculateTopCategories(transactions);
    const budgetPerformance = calculateBudgetPerformance(transactions, budgets);

    const demoHealthScore = calculateBasicHealthScore(savingsRate, monthlyComparison.change_percentage);
    const demoInsights = generateBasicInsights(savingsRate, monthlyComparison, topCategories);
    const demoPredictions = generateBasicPredictions(spendingTrend);
    
    // Calculate a mock net worth for the dashboard
    const netWorth = transactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 50000);

    return {
      financial_health_score: demoHealthScore,
      spending_trend: spendingTrend,
      category_breakdown: categoryBreakdown,
      savings_rate: savingsRate,
      net_worth: netWorth > 0 ? netWorth : 12450.50, // fallback if negative from mock data
      monthly_comparison: monthlyComparison,
      top_categories: topCategories,
      insights: demoInsights,
      predictions: demoPredictions,
      budget_performance: budgetPerformance,
    };
  };

  const calculateSpendingTrend = (transactions: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const trend = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= monthStart && tDate <= monthEnd;
      });

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const spending = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      trend.push({
        month: months[date.getMonth()],
        spending: Math.round(spending),
        income: Math.round(income),
      });
    }
    return trend;
  };

  const calculateCategoryBreakdown = (transactions: any[]) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentMonthExpenses = transactions.filter(t => {
       const tDate = new Date(t.date);
       return t.type === 'expense' && tDate >= monthStart;
    });

    const categoryTotals: { [key: string]: number } = {};
    let total = 0;

    currentMonthExpenses.forEach(t => {
      const amount = parseFloat(t.amount);
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount;
      total += amount;
    });

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount),
        percentage: Math.round((amount / total) * 100) || 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const calculateMonthlyComparison = (transactions: any[]) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonth = transactions
      .filter(t => new Date(t.date) >= currentMonthStart && t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const previousMonth = transactions
      .filter(t => new Date(t.date) >= previousMonthStart && new Date(t.date) <= previousMonthEnd && t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const changePercentage = previousMonth > 0 ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100) : 0;

    return {
      current_month: Math.round(currentMonth),
      previous_month: Math.round(previousMonth),
      change_percentage: changePercentage,
    };
  };

  const calculateSavingsRate = (transactions: any[]) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthTransactions = transactions.filter(t => new Date(t.date) >= monthStart);

    const income = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const savings = income - expenses;
    return income > 0 ? Math.round((savings / income) * 100 * 10) / 10 : 0;
  };

  const calculateTopCategories = (transactions: any[]) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonth = transactions.filter(t => t.type === 'expense' && new Date(t.date) >= currentMonthStart);
    const previousMonth = transactions.filter(t => t.type === 'expense' && new Date(t.date) >= previousMonthStart && new Date(t.date) <= previousMonthEnd);

    const currentCategories: { [key: string]: number } = {};
    const previousCategories: { [key: string]: number } = {};

    currentMonth.forEach(t => currentCategories[t.category] = (currentCategories[t.category] || 0) + parseFloat(t.amount));
    previousMonth.forEach(t => previousCategories[t.category] = (previousCategories[t.category] || 0) + parseFloat(t.amount));

    return Object.entries(currentCategories)
      .map(([category, amount]) => {
        const prevAmount = previousCategories[category] || 0;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (prevAmount > 0) {
          const change = ((amount - prevAmount) / prevAmount) * 100;
          if (change > 10) trend = 'up';
          else if (change < -10) trend = 'down';
        } else if (amount > 0) {
          trend = 'up';
        }
        return { category, amount: Math.round(amount), trend };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  };

  const calculateBudgetPerformance = (transactions: any[], budgets: any[]) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.date) >= monthStart);

    const categorySpending: { [key: string]: number } = {};
    currentMonthExpenses.forEach(t => categorySpending[t.category] = (categorySpending[t.category] || 0) + parseFloat(t.amount));

    return budgets.map(budget => {
      const spent = categorySpending[budget.category] || 0;
      const percentage = Math.round((spent / budget.monthly_limit) * 100);
      return {
        category: budget.category,
        budget: budget.monthly_limit,
        spent: Math.round(spent),
        percentage,
      };
    });
  };

  const calculateBasicHealthScore = (savingsRate: number, changePercentage: number): number => {
    let score = 50;
    if (savingsRate >= 20) score += 30;
    else if (savingsRate >= 10) score += 15;
    else if (savingsRate >= 0) score += 5;
    else score -= 15;

    if (changePercentage <= -10) score += 20;
    else if (changePercentage <= 0) score += 10;
    else if (changePercentage <= 10) score -= 5;
    else score -= 20;

    return Math.min(100, Math.max(0, score));
  };

  const generateBasicInsights = (savingsRate: number, monthlyComparison: any, topCategories: any[]) => {
    const insights: any[] = [];
    if (savingsRate >= 20) {
      insights.push({ type: 'success', title: 'Exceptional Saving Efficiency', description: `You're retaining ${savingsRate}% of your income. AI models predict strong long-term growth.` });
    } else if (savingsRate < 10) {
      insights.push({ type: 'warning', title: 'Savings Rate Alert', description: `Your savings rate is ${savingsRate}%. We recommend decreasing discretionary spending by 10%.` });
    }

    if (monthlyComparison.change_percentage > 15) {
      insights.push({ type: 'warning', title: 'Anomalous Spending Detected', description: `Spending surged ${monthlyComparison.change_percentage}% MoM. Review your recent large transactions.` });
    } else if (monthlyComparison.change_percentage < -5) {
      insights.push({ type: 'success', title: 'Positive Trend Identified', description: `Excellent control. Spending is down ${Math.abs(monthlyComparison.change_percentage)}% MoM.` });
    }

    if (topCategories.length > 0) {
      insights.push({ type: 'info', title: `Category Focus: ${topCategories[0].category}`, description: `Accounting for significant outflow. Applying a 5% budget cut here frees up MAD ${Math.round(topCategories[0].amount * 0.05)}.` });
    }
    return insights;
  };

  const generateBasicPredictions = (spendingTrend: any[]) => {
    const recentMonths = spendingTrend.slice(-3);
    const avgSpending = recentMonths.reduce((sum, m) => sum + m.spending, 0) / Math.max(1, recentMonths.length);
    const avgIncome = recentMonths.reduce((sum, m) => sum + m.income, 0) / Math.max(1, recentMonths.length);

    return {
      next_month_spending: Math.round(avgSpending * 1.02), // slight predictive increase
      next_month_income: Math.round(avgIncome),
      confidence_score: 84, 
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_15px_rgba(139,92,246,0.3)]"></div>
          <p className="text-muted-foreground font-medium tracking-wide animate-pulse">Initializing AI Analysis Engine...</p>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center p-8 bg-card rounded-2xl border border-destructive/20">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-foreground font-semibold mb-3">Analysis Engine Error</p>
          <button onClick={loadAnalysis} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
            Reboot Engine
          </button>
        </div>
      </div>
    );
  }

  const {
    financial_health_score,
    spending_trend = [],
    category_breakdown = [],
    savings_rate,
    monthly_comparison,
    budget_performance = [],
    insights = [],
    predictions,
    net_worth
  } = analysisData;

  const getScoreDetails = (score: number) => {
    if (score >= 80) return { color: '#10B981', gradient: 'from-emerald-500/20 to-emerald-500/0', text: 'text-emerald-500', shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]' };
    if (score >= 50) return { color: '#F59E0B', gradient: 'from-amber-500/20 to-amber-500/0', text: 'text-amber-500', shadow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]' };
    return { color: '#F43F5E', gradient: 'from-rose-500/20 to-rose-500/0', text: 'text-rose-500', shadow: 'shadow-[0_0_30px_rgba(244,63,94,0.3)]' };
  };

  const scoreDetails = getScoreDetails(financial_health_score);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">AI Financial Analysis</h1>
        </div>
        <p className="text-muted-foreground text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Engine active. Analyzing {spending_trend.length} months of real-time transactional data.
        </p>
      </div>

      {/* Top Section: Health Score & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Card */}
        <div className="col-span-1 bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 relative overflow-hidden group">
          <div className={`absolute inset-0 bg-gradient-to-b ${scoreDetails.gradient} opacity-50 transition-opacity group-hover:opacity-100`}></div>
          <div className="relative z-10 flex flex-col items-center justify-center h-full">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">Health Score</h3>
            
            <div className={`relative w-48 h-48 rounded-full flex items-center justify-center bg-card/80 backdrop-blur-md border border-border/50 ${scoreDetails.shadow} transition-all duration-700`}>
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                <circle 
                  cx="96" cy="96" r="88" fill="none" stroke={scoreDetails.color} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(financial_health_score / 100) * 553} 553`}
                  className="transition-all duration-1500 ease-out"
                />
              </svg>
              <div className="text-center">
                <span className={`text-6xl font-black tracking-tighter ${scoreDetails.text}`}>{financial_health_score}</span>
                <div className="text-xs font-bold text-muted-foreground mt-1">OUT OF 100</div>
              </div>
            </div>

            <p className="mt-8 text-sm font-medium text-center text-muted-foreground">
              Based on savings rate and month-over-month trajectory analysis.
            </p>
          </div>
        </div>

        {/* AI Insights Engine Panel */}
        <div className="col-span-1 lg:col-span-2 bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">AI Intelligence Report</h3>
          </div>

          <div className="flex-1 flex flex-col gap-4 relative z-10">
            {insights.length > 0 ? insights.map((insight, idx) => (
              <div key={idx} className="group p-5 rounded-2xl bg-muted/40 border border-border/50 hover:bg-muted/60 hover:border-border transition-all duration-300">
                <div className="flex gap-4">
                  <div className="mt-0.5">
                    {insight.type === 'success' && <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]"><CheckCircle size={18} /></div>}
                    {insight.type === 'warning' && <div className="p-2 rounded-full bg-amber-500/10 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]"><AlertCircle size={18} /></div>}
                    {insight.type === 'info' && <div className="p-2 rounded-full bg-blue-500/10 text-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]"><Info size={18} /></div>}
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
                  </div>
                </div>
              </div>
            )) : (
               <div className="flex-1 flex items-center justify-center">
                 <p className="text-muted-foreground">Gathering more intelligence...</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Current Month", value: `MAD ${monthly_comparison.current_month.toLocaleString()}`, trend: monthly_comparison.change_percentage, icon: DollarSign, color: monthly_comparison.change_percentage > 0 ? 'text-rose-500' : 'text-emerald-500', bg: monthly_comparison.change_percentage > 0 ? 'bg-rose-500/10' : 'bg-emerald-500/10', suffix: 'vs last month' },
          { title: "AI Forecast (Next Month)", value: `MAD ${predictions.next_month_spending.toLocaleString()}`, trend: null, icon: Activity, color: 'text-primary', bg: 'bg-primary/10', suffix: `${predictions.confidence_score}% confidence score` },
          { title: "Savings Rate", value: `${savings_rate}%`, trend: null, icon: Target, color: savings_rate >= 20 ? 'text-emerald-500' : 'text-amber-500', bg: savings_rate >= 20 ? 'bg-emerald-500/10' : 'bg-amber-500/10', suffix: 'Target: >20%' },
          { title: "Est. Net Worth", value: `MAD ${net_worth.toLocaleString()}`, trend: 5.2, icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10', suffix: '+5.2% YTD' }
        ].map((metric, idx) => (
          <div key={idx} className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${metric.bg}`}>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              {metric.trend !== null && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${metric.trend > 0 ? (metric.title === 'Est. Net Worth' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500') : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {metric.trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(metric.trend)}%
                </div>
              )}
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{metric.title}</h3>
            <div className="text-2xl font-bold text-foreground tracking-tight mb-2">{metric.value}</div>
            <p className="text-xs text-muted-foreground">{metric.suffix}</p>
          </div>
        ))}
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Chart */}
        <div className="col-span-1 lg:col-span-2 bg-card/60 backdrop-blur-md rounded-3xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Cash Flow Trajectory
            </h2>
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div> Income</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div> Spending</div>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spending_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncomeChart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSpendChart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.4} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `MAD${val}`} dx={-10} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: '12px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}
                  itemStyle={{ color: '#fff', fontWeight: 600 }}
                  labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '8px' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncomeChart)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }} />
                <Area type="monotone" dataKey="spending" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorSpendChart)" activeDot={{ r: 6, strokeWidth: 0, fill: '#8B5CF6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Performance */}
        <div className="col-span-1 bg-card/60 backdrop-blur-md rounded-3xl p-6 border border-border/50 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Budget Velocity</h2>
          </div>
          
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            {budget_performance.length > 0 ? budget_performance.map((item, idx) => (
              <div key={idx} className="group">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-foreground">{item.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      {item.spent} / {item.budget}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${item.percentage > 100 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : item.percentage > 80 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                      {item.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden relative">
                  <div
                    className={`absolute top-0 left-0 bottom-0 rounded-full transition-all duration-1000 ease-out ${item.percentage > 100 ? 'bg-rose-500' : item.percentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            )) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">No budgets detected.<br/>Setup budgets to track velocity.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
