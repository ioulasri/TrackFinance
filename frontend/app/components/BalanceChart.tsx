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
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <div className="flex items-center justify-center h-80">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border transition-colors">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl text-foreground font-bold tracking-tight">Balance Overview</h3>
        <div className="flex gap-1.5 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-4 py-1.5 rounded-md font-medium text-sm transition-all ${period === '7d'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            7d
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-4 py-1.5 rounded-md font-medium text-sm transition-all ${period === '30d'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            30d
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#71717a', fontSize: 12 }}
            axisLine={{ stroke: '#e4e4e7' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#71717a', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              color: '#09090b'
            }}
            itemStyle={{ color: '#09090b', fontWeight: 500 }}
            cursor={{ fill: '#f4f4f5' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar
            dataKey="income"
            fill="#10B981"
            radius={[8, 8, 0, 0]}
            name="Income"
          />
          <Bar
            dataKey="expenses"
            fill="#3B82F6"
            radius={[8, 8, 0, 0]}
            name="Expenses"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
