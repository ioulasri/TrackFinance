import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { transactionAPI } from '../api';

export function BalanceChart() {
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [period]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const response = await transactionAPI.list(0, 1000);
      const transactions = response.data;
      
      const aggregated = aggregateTransactions(transactions, period);
      setData(aggregated);
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const aggregateTransactions = (transactions: any[], periodType: '7d' | '30d') => {
    const now = new Date();
    const days = periodType === '7d' ? 7 : 30;
    const result: any[] = [];

    if (periodType === '7d') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayKey = date.toISOString().split('T')[0];
        
        const dayTransactions = transactions.filter(t => t.date.startsWith(dayKey));
        const income = dayTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const expenses = dayTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        result.push({
          day: dayNames[date.getDay()],
          income,
          expenses
        });
      }
    } else {
      // 30 days grouped by weeks
      for (let week = 4; week >= 1; week--) {
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() - ((week - 1) * 7));
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);

        const weekTransactions = transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate >= startDate && tDate <= endDate;
        });

        const income = weekTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const expenses = weekTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        result.unshift({
          day: `Week ${5 - week}`,
          income,
          expenses
        });
      }
    }

    return result;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center h-80">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-gray-900">Balance Overview</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              period === '7d'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            7d
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              period === '30d'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            30d
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis 
            dataKey="day" 
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis 
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar 
            dataKey="income" 
            fill="#059669" 
            radius={[8, 8, 0, 0]}
            name="Income"
          />
          <Bar 
            dataKey="expenses" 
            fill="#2563EB" 
            radius={[8, 8, 0, 0]}
            name="Expenses"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
