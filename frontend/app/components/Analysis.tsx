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
import { analysisAPI, AnalysisData } from '../api';

/**
 * Analysis Component
 * 
 * Comprehensive financial analysis page powered by backend ML model.
 * 
 * Features:
 * - Financial health score with visual indicator
 * - Spending trends over time (line chart)
 * - Category breakdown (pie chart)
 * - Income vs Expenses comparison
 * - Savings rate visualization
 * - Budget performance tracking
 * - AI-powered insights and alerts
 * - Predictive analytics for next month
 * - Month-over-month comparisons
 * - Top spending categories with trends
 */

// Mock data for development (will be replaced by API)
const mockAnalysisData: AnalysisData = {
  financial_health_score: 78,
  spending_trend: [
    { month: 'Jan', spending: 2400, income: 3200 },
    { month: 'Feb', spending: 2100, income: 3200 },
    { month: 'Mar', spending: 2500, income: 3400 },
    { month: 'Apr', spending: 2700, income: 3400 },
    { month: 'May', spending: 2300, income: 3600 },
    { month: 'Jun', spending: 2800, income: 3600 },
  ],
  category_breakdown: [
    { category: 'Food & Dining', amount: 680, percentage: 28 },
    { category: 'Shopping', amount: 520, percentage: 21 },
    { category: 'Transportation', amount: 360, percentage: 15 },
    { category: 'Entertainment', amount: 280, percentage: 12 },
    { category: 'Bills & Utilities', amount: 480, percentage: 20 },
    { category: 'Other', amount: 100, percentage: 4 },
  ],
  savings_rate: 25.3,
  monthly_comparison: {
    current_month: 2800,
    previous_month: 2300,
    change_percentage: 21.7,
  },
  top_categories: [
    { category: 'Food & Dining', amount: 680, trend: 'up' },
    { category: 'Shopping', amount: 520, trend: 'down' },
    { category: 'Bills & Utilities', amount: 480, trend: 'stable' },
  ],
  insights: [
    {
      type: 'warning',
      title: 'Spending Increase Detected',
      description: 'Your spending has increased by 21.7% compared to last month. Consider reviewing discretionary expenses.',
    },
    {
      type: 'success',
      title: 'Great Savings Rate!',
      description: 'You\'re saving 25.3% of your income, which is above the recommended 20%.',
    },
    {
      type: 'info',
      title: 'Food Spending Pattern',
      description: 'Food & Dining is your highest expense category. Meal planning could help reduce costs.',
    },
  ],
  predictions: {
    next_month_spending: 2650,
    next_month_income: 3600,
    confidence_score: 87,
  },
  budget_performance: [
    { category: 'Food & Dining', budget: 700, spent: 680, percentage: 97 },
    { category: 'Shopping', budget: 500, spent: 520, percentage: 104 },
    { category: 'Transportation', budget: 400, spent: 360, percentage: 90 },
    { category: 'Entertainment', budget: 300, spent: 280, percentage: 93 },
  ],
};

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
      const data = await analysisAPI.getAnalysis();
      setAnalysisData(data);
    } catch (err) {
      console.error('Failed to load analysis:', err);
      // Use mock data as fallback
      setAnalysisData(mockAnalysisData);
      setError('Using demo data. Connect to backend for live analysis.');
    } finally {
      setIsLoading(false);
    }
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
          AI-powered insights and comprehensive breakdown of your financial health
        </p>
        {error && (
          <div className="mt-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
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
              Overall assessment of your financial situation
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
              Predicted
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Next Month</h3>
          <p className="text-2xl font-bold text-gray-900">
            ${predictions.next_month_spending.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Expected income: ${predictions.next_month_income.toLocaleString()}
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

      {/* AI Insights */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered Insights</h2>
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
