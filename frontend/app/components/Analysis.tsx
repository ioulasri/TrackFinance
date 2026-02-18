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

/**
 * Analysis Component
 * 
 * Comprehensive financial analysis page with real data from backend.
 * 
 * Real Data (from backend):
 * - Spending trends over time (from transactions)
 * - Category breakdown (from transactions)
 * - Income vs Expenses comparison
 * - Savings rate calculation
 * - Budget performance tracking
 * - Month-over-month comparisons
 * - Top spending categories with trends
 * 
 * Demo Data (AI features - to be implemented):
 * - Financial health score (requires ML model)
 * - AI-powered insights (requires LLM)
 * - Predictive analytics (requires ML model)
 */

interface AnalysisData {
  financial_health_score: number;  // Demo: AI feature
  spending_trend: { month: string; spending: number; income: number }[];
  category_breakdown: { category: string; amount: number; percentage: number }[];
  savings_rate: number;
  monthly_comparison: { current_month: number; previous_month: number; change_percentage: number };
  top_categories: { category: string; amount: number; trend: 'up' | 'down' | 'stable' }[];
  insights: { type: 'warning' | 'success' | 'info'; title: string; description: string }[];  // Demo: AI feature
  predictions: { next_month_spending: number; next_month_income: number; confidence_score: number };  // Demo: AI feature
  budget_performance: { category: string; budget: number; spent: number; percentage: number }[];
}

const COLORS = ['#9333EA', '#A855F7', '#C084FC', '#D8B4FE', '#E9D5FF', '#F3E8FF'];

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
      // Fetch real data from backend
      const [transactionsRes, budgetsRes] = await Promise.all([
        transactionAPI.list(0, 1000),
        budgetAPI.list(),
      ]);

      const transactions = transactionsRes.data;
      const budgets = budgetsRes.data;

      // Process real data
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
    const now = new Date();
    
    // Calculate spending trends (last 6 months)
    const spendingTrend = calculateSpendingTrend(transactions);
    
    // Calculate category breakdown (current month)
    const categoryBreakdown = calculateCategoryBreakdown(transactions);
    
    // Calculate monthly comparison
    const monthlyComparison = calculateMonthlyComparison(transactions);
    
    // Calculate savings rate
    const savingsRate = calculateSavingsRate(transactions);
    
    // Calculate top categories with trends
    const topCategories = calculateTopCategories(transactions);
    
    // Calculate budget performance
    const budgetPerformance = calculateBudgetPerformance(transactions, budgets);
    
    // Demo data for AI features (to be replaced with ML models)
    const demoHealthScore = calculateBasicHealthScore(savingsRate, monthlyComparison.change_percentage);
    const demoInsights = generateBasicInsights(savingsRate, monthlyComparison, topCategories);
    const demoPredictions = generateBasicPredictions(spendingTrend);

    return {
      financial_health_score: demoHealthScore,
      spending_trend: spendingTrend,
      category_breakdown: categoryBreakdown,
      savings_rate: savingsRate,
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
      .filter(t => {
        const tDate = new Date(t.date);
        return t.type === 'expense' && tDate >= currentMonthStart;
      })
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const previousMonth = transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return t.type === 'expense' && tDate >= previousMonthStart && tDate <= previousMonthEnd;
      })
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const changePercentage = previousMonth > 0
      ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100)
      : 0;

    return {
      current_month: Math.round(currentMonth),
      previous_month: Math.round(previousMonth),
      change_percentage: changePercentage,
    };
  };

  const calculateSavingsRate = (transactions: any[]) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= monthStart;
    });

    const income = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const expenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const savings = income - expenses;
    return income > 0 ? Math.round((savings / income) * 100 * 10) / 10 : 0;
  };

  const calculateTopCategories = (transactions: any[]) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonth = transactions.filter(t => {
      const tDate = new Date(t.date);
      return t.type === 'expense' && tDate >= currentMonthStart;
    });

    const previousMonth = transactions.filter(t => {
      const tDate = new Date(t.date);
      return t.type === 'expense' && tDate >= previousMonthStart && tDate <= previousMonthEnd;
    });

    const currentCategories: { [key: string]: number } = {};
    const previousCategories: { [key: string]: number } = {};

    currentMonth.forEach(t => {
      currentCategories[t.category] = (currentCategories[t.category] || 0) + parseFloat(t.amount);
    });

    previousMonth.forEach(t => {
      previousCategories[t.category] = (previousCategories[t.category] || 0) + parseFloat(t.amount);
    });

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

    const currentMonthExpenses = transactions.filter(t => {
      const tDate = new Date(t.date);
      return t.type === 'expense' && tDate >= monthStart;
    });

    const categorySpending: { [key: string]: number } = {};
    currentMonthExpenses.forEach(t => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + parseFloat(t.amount);
    });

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

  // Demo functions for AI features (to be replaced with ML models)
  const calculateBasicHealthScore = (savingsRate: number, changePercentage: number): number => {
    let score = 50; // Base score
    
    // Adjust based on savings rate
    if (savingsRate >= 20) score += 25;
    else if (savingsRate >= 10) score += 15;
    else if (savingsRate >= 0) score += 5;
    else score -= 10;
    
    // Adjust based on spending trend
    if (changePercentage <= -10) score += 15; // Spending decreased
    else if (changePercentage <= 0) score += 10;
    else if (changePercentage <= 10) score += 5;
    else score -= 10; // Spending increased significantly
    
    return Math.min(100, Math.max(0, score));
  };

  const generateBasicInsights = (
    savingsRate: number,
    monthlyComparison: any,
    topCategories: any[]
  ) => {
    const insights: any[] = [];

    // Savings rate insight
    if (savingsRate >= 20) {
      insights.push({
        type: 'success',
        title: 'Great Savings Rate!',
        description: `You're saving ${savingsRate}% of your income, which is above the recommended 20%.`,
      });
    } else if (savingsRate < 10) {
      insights.push({
        type: 'warning',
        title: 'Low Savings Rate',
        description: `Your savings rate is ${savingsRate}%. Consider reducing expenses to save at least 20% of your income.`,
      });
    }

    // Spending change insight
    if (monthlyComparison.change_percentage > 15) {
      insights.push({
        type: 'warning',
        title: 'Spending Increase Detected',
        description: `Your spending has increased by ${monthlyComparison.change_percentage}% compared to last month. Consider reviewing discretionary expenses.`,
      });
    } else if (monthlyComparison.change_percentage < -15) {
      insights.push({
        type: 'success',
        title: 'Decreased Spending',
        description: `Great job! You've reduced spending by ${Math.abs(monthlyComparison.change_percentage)}% this month.`,
      });
    }

    // Top category insight
    if (topCategories.length > 0) {
      insights.push({
        type: 'info',
        title: `${topCategories[0].category} is Your Top Expense`,
        description: `You've spent MAD${topCategories[0].amount} on ${topCategories[0].category} this month. Consider if this aligns with your priorities.`,
      });
    }

    return insights;
  };

  const generateBasicPredictions = (spendingTrend: any[]) => {
    // Simple average-based prediction (to be replaced with ML model)
    const recentMonths = spendingTrend.slice(-3);
    const avgSpending = recentMonths.reduce((sum, m) => sum + m.spending, 0) / recentMonths.length;
    const avgIncome = recentMonths.reduce((sum, m) => sum + m.income, 0) / recentMonths.length;

    return {
      next_month_spending: Math.round(avgSpending),
      next_month_income: Math.round(avgIncome),
      confidence_score: 65, // Low confidence for simple average
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Analyzing your financial data...</p>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold mb-2">Failed to load analysis</p>
          <button
            onClick={loadAnalysis}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Safe access to nested properties with fallback values
  const predictions = analysisData.predictions || {
    next_month_spending: 0,
    next_month_income: 0,
    confidence_score: 0,
  };
  
  const monthlyComparison = analysisData.monthly_comparison || {
    current_month: 0,
    previous_month: 0,
    change_percentage: 0,
  };

  // Safe access to array properties with fallback empty arrays
  const spendingTrend = analysisData.spending_trend || [];
  const categoryBreakdown = analysisData.category_breakdown || [];
  const topCategories = analysisData.top_categories || [];
  const insights = analysisData.insights || [];
  const budgetPerformance = analysisData.budget_performance || [];

  const healthScoreColor =
    analysisData.financial_health_score >= 75
      ? 'text-green-600 bg-green-50'
      : analysisData.financial_health_score >= 50
      ? 'text-yellow-600 bg-yellow-50'
      : 'text-red-600 bg-red-50';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Analysis</h1>
        <p className="text-gray-600">
          Real-time insights from your financial data
        </p>
        {!error && (
          <div className="mt-3 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
            <strong>Data sources:</strong> Transactions and budgets from your account. 
            Health score and predictions use basic calculations (AI enhancement coming soon).
          </div>
        )}
        {error && (
          <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Financial Health Score */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Financial Health Score</h2>
            <p className="text-sm text-gray-600">
              Basic assessment of your financial situation
            </p>
          </div>
          <Zap className="text-purple-600" size={28} />
        </div>
        <div className="flex items-center gap-6">
          <div
            className={`w-32 h-32 rounded-full flex items-center justify-center ${healthScoreColor}`}
          >
            <div className="text-center">
              <div className="text-4xl font-bold">
                {analysisData.financial_health_score}
              </div>
              <div className="text-xs font-medium">/ 100</div>
            </div>
          </div>
          <div className="flex-1">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Savings Rate</span>
                  <span className="font-semibold text-gray-900">
                    {analysisData.savings_rate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${analysisData.savings_rate}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Prediction Confidence</span>
                  <span className="font-semibold text-gray-900">
                    {predictions.confidence_score}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${predictions.confidence_score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Month Spending */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-purple-600" size={20} />
            </div>
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                monthlyComparison.change_percentage > 0
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}
            >
              {monthlyComparison.change_percentage > 0 ? (
                <ArrowUpRight size={16} />
              ) : (
                <ArrowDownRight size={16} />
              )}
              {Math.abs(monthlyComparison.change_percentage)}%
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Current Month</h3>
          <p className="text-2xl font-bold text-gray-900">
            ${monthlyComparison.current_month.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            vs ${monthlyComparison.previous_month.toLocaleString()} last month
          </p>
        </div>

        {/* Predicted Next Month */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-blue-600" size={20} />
            </div>
            <div className="px-2 py-1 bg-blue-100 rounded-md text-xs font-medium text-blue-700">
              Est. Average
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Next Month Estimate</h3>
          <p className="text-2xl font-bold text-gray-900">
            ${predictions.next_month_spending.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Based on 3-month average (AI prediction coming soon)
          </p>
        </div>

        {/* Savings Rate */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="text-green-600" size={20} />
            </div>
            <div
              className={`text-sm font-medium ${
                analysisData.savings_rate >= 20 ? 'text-green-600' : 'text-yellow-600'
              }`}
            >
              {analysisData.savings_rate >= 20 ? 'On Track' : 'Below Target'}
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Savings Rate</h3>
          <p className="text-2xl font-bold text-gray-900">{analysisData.savings_rate}%</p>
          <p className="text-xs text-gray-500 mt-1">Target: 20% (industry standard)</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trend Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-purple-600" size={24} />
            <h2 className="text-lg font-semibold text-gray-900">
              Income vs Spending Trend
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={spendingTrend}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIncome)"
                name="Income"
              />
              <Area
                type="monotone"
                dataKey="spending"
                stroke="#9333ea"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSpending)"
                name="Spending"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="text-purple-600" size={24} />
            <h2 className="text-lg font-semibold text-gray-900">Spending by Category</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="amount"
              >
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Budget Performance */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-5">
          <Target className="text-purple-600" size={24} />
          <h2 className="text-lg font-semibold text-gray-900">Budget Performance</h2>
        </div>
        <div className="space-y-4">
          {budgetPerformance.map((item, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-900">{item.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    ${item.spent} / ${item.budget}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${
                      item.percentage > 100
                        ? 'bg-red-100 text-red-700'
                        : item.percentage > 80
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {item.percentage}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    item.percentage > 100
                      ? 'bg-red-600'
                      : item.percentage > 80
                      ? 'bg-yellow-500'
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Spending Categories */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Spending Categories</h2>
        <div className="space-y-3">
          {topCategories.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center font-semibold text-purple-600">
                  #{index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{item.category}</p>
                  <p className="text-sm text-gray-600">${item.amount}</p>
                </div>
              </div>
              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-lg ${
                  item.trend === 'up'
                    ? 'bg-red-100 text-red-700'
                    : item.trend === 'down'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {item.trend === 'up' ? (
                  <TrendingUp size={16} />
                ) : item.trend === 'down' ? (
                  <TrendingDown size={16} />
                ) : (
                  <Minus size={16} />
                )}
                <span className="text-xs font-medium capitalize">{item.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Financial Insights</h2>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            Basic Rules
          </span>
        </div>
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon =
              insight.type === 'warning'
                ? AlertCircle
                : insight.type === 'success'
                ? CheckCircle
                : Info;
            const colorClasses =
              insight.type === 'warning'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : insight.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-blue-50 border-blue-200 text-blue-800';

            return (
              <div
                key={index}
                className={`flex gap-3 p-4 border rounded-xl ${colorClasses}`}
              >
                <Icon size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{insight.title}</h3>
                  <p className="text-sm opacity-90">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
