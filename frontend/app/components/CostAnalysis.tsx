import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { transactionAPI } from '../api';

const categoryColors: Record<string, string> = {
  'Food': '#7f0df2', // Neon purple
  'Shopping': '#3B82F6', // Neon blue
  'Transport': '#F97316',
  'Bills': '#10B981', // Neon emerald
  'Entertainment': '#EF4444',
  'Health': '#EC4899',
  'Education': '#14B8A6',
  'Other': '#6B7280',
};

export function CostAnalysis() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenseData();
  }, []);

  const fetchExpenseData = async () => {
    setLoading(true);
    try {
      const response = await transactionAPI.list(0, 1000);
      const expenses = response.data.filter((t: any) => t.type === 'expense');

      const categoryTotals: Record<string, number> = {};
      expenses.forEach((t: any) => {
        const category = t.category || 'Other';
        categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
      });

      const chartData = Object.entries(categoryTotals)
        .map(([name, value]) => ({
          name,
          value,
          color: categoryColors[name] || categoryColors['Other']
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6); // Top 6 categories

      setData(chartData);
    } catch (error) {
      console.error('Failed to fetch expense data:', error);
    } finally {
      setLoading(false);
    }
  };

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <h3 className="text-xl text-foreground mb-8 font-bold">Cost Analysis</h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <h3 className="text-xl text-foreground mb-8 font-bold">Cost Analysis</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No expense data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border transition-colors">
      <h3 className="text-xl text-foreground mb-8 font-bold">Cost Analysis</h3>

      <div className="flex flex-col items-center gap-8">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                color: '#09090b',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
              }}
              itemStyle={{ color: '#09090b', fontWeight: 500 }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="w-full max-w-sm max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {data.map((item) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-foreground flex-1 font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-sm font-semibold text-foreground">
                    MAD {item.value.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
