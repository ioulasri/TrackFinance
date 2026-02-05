import { useEffect, useState } from 'react';
import { Search, Bell, Settings2, TrendingUp, TrendingDown, Edit2, ArrowRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { authAPI, transactionAPI, budgetAPI } from '../api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, transactionsRes, budgetRes] = await Promise.all([
        authAPI.getUserStats(),
        transactionAPI.list(0, 10),
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

  // Calculate balance data from transactions
  const calculateBalanceData = () => {
    // Group transactions by day of week
    const dayData = {
      Sun: { savings: 0, income: 0, expenses: 0 },
      Mon: { savings: 0, income: 0, expenses: 0 },
      Tue: { savings: 0, income: 0, expenses: 0 },
      Wed: { savings: 0, income: 0, expenses: 0 },
      Thu: { savings: 0, income: 0, expenses: 0 },
      Fri: { savings: 0, income: 0, expenses: 0 },
      Sat: { savings: 0, income: 0, expenses: 0 },
    };

    recentTransactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      if (transaction.type === 'income') {
        dayData[dayName as keyof typeof dayData].income += transaction.amount;
      } else {
        dayData[dayName as keyof typeof dayData].expenses += transaction.amount;
      }
    });

    return Object.entries(dayData).map(([day, values]) => ({
      day,
      ...values,
      savings: values.income - values.expenses,
    }));
  };

  const balanceData = calculateBalanceData();

  const costAnalysisData = [
    { name: 'Housing', value: 18, color: '#FCD34D' },
    { name: 'Debt payments', value: 7, color: '#FB923C' },
    { name: 'Food', value: 4, color: '#A3E635' },
    { name: 'Transportation', value: 9, color: '#34D399' },
    { name: 'Healthcare', value: 7, color: '#60A5FA' },
    { name: 'Entertainment', value: 11, color: '#C084FC' },
    { name: 'Other', value: 33, color: '#F87171' },
  ];

  // Calculate totals from real data
  const totalIncome = recentTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = recentTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const savedBalance = totalIncome - totalExpenses;
  const totalBalance = savedBalance;
  
  const monthlyLimit = budgetStatus?.total_monthly_limit || 0;
  const spentThisMonth = budgetStatus?.total_spent || 0;
  const financialHealthScore = stats?.current_level ? Math.min(stats.current_level * 10, 100) : 75;

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 overflow-auto flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Quick search"
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings2 className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Balance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Balance Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">MAD {totalBalance.toLocaleString()}</h2>
                <p className="text-sm text-gray-500">Balance overview</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-xs text-gray-500">7d</span>
                  <span className="text-xs text-gray-500">|</span>
                  <span className="text-xs text-gray-500">30</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <TrendingDown className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Settings2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-6 mb-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-sm"></div>
                <span className="text-gray-600">Savings</span>
                <span className="font-semibold">MAD 350</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                <span className="text-gray-600">Income</span>
                <span className="font-semibold">MAD 700</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-400 rounded-sm"></div>
                <span className="text-gray-600">Expenses</span>
                <span className="font-semibold">MAD 400</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={balanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="savings" stackId="a" fill="#FBBF24" radius={[0, 0, 0, 0]} />
                <Bar dataKey="income" stackId="a" fill="#34D399" radius={[0, 0, 0, 0]} />
                <Bar dataKey="expenses" stackId="a" fill="#FB923C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Income/Expenses */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Total income</p>
              <h3 className="text-2xl font-bold text-gray-900">MAD {totalIncome.toLocaleString()}</h3>
              <p className="text-xs text-green-500 mt-1">+8.5% from last month</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Total expenses</p>
              <h3 className="text-2xl font-bold text-gray-900">MAD {totalExpenses.toLocaleString()}</h3>
              <p className="text-xs text-gray-500 mt-1">+2.3% from last month</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Saved balance</p>
              <h3 className="text-2xl font-bold text-gray-900">MAD {savedBalance.toLocaleString()}</h3>
              <p className="text-xs text-gray-500 mt-1">+3% from last month</p>
            </div>
          </div>
        </div>

        {/* Monthly Spending & Tips */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Monthly spending limit</h3>
              <Edit2 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mb-2">
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold text-green-500">MAD {spentThisMonth.toLocaleString()}</span>
                <span className="text-sm text-gray-500">MAD {monthlyLimit.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-400 h-2 rounded-full"
                  style={{ width: `${(spentThisMonth / monthlyLimit) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Optimize your budget with these quick tips
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Start preparing for the 2025 tax season by saving 10~15% for deductions.
              </p>
              <button className="flex items-center text-xs font-medium text-gray-700 hover:text-gray-900">
                Read more <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>
            <div className="absolute right-0 bottom-0 opacity-20">
              <div className="w-32 h-32 bg-green-300 rounded-tl-full"></div>
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Analysis */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Cost analysis</h3>
                <p className="text-xs text-gray-500">Spending overview</p>
              </div>
              <select className="text-xs border border-gray-200 rounded-lg px-2 py-1">
                <option>January</option>
              </select>
            </div>
            <div className="text-center mb-4">
              <h4 className="text-2xl font-bold text-gray-900">MAD 8,450</h4>
            </div>
            <div className="space-y-2">
              {costAnalysisData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Health */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Financial health</h3>
                <p className="text-xs text-gray-500">Overall score</p>
              </div>
              <select className="text-xs border border-gray-200 rounded-lg px-2 py-1">
                <option>30d</option>
              </select>
            </div>
            <div className="relative w-40 h-40 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#f0f0f0"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#34D399"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(financialHealthScore / 100) * 440} 440`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{financialHealthScore}%</p>
                  <p className="text-xs text-gray-500">of perfect score</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 text-center">
              Based on your age and income metrics over the past 30 days
            </p>
          </div>

          {/* Goal Tracker */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Goal tracker</h3>
              <button className="text-xs text-gray-600 hover:text-gray-900 flex items-center">
                + Add goals
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">This year</p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      🏠
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Rebuild</p>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                        <div className="bg-green-400 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold">MAD 1,000/1,500</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Long term</p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      ✈️
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Travel</p>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                        <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: '40%' }}></div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold">MAD 2,500/4,500</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      🏡
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Real estate</p>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                        <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: '25%' }}></div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold">MAD 8,300/13,000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
