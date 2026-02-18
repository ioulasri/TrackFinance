import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { transactionAPI } from '../api';

const categoryColors: Record<string, string> = {
  'Food': '#9333EA',
  'Shopping': '#2563EB',
  'Transport': '#F97316',
  'Bills': '#059669',
  'Entertainment': '#DC2626',
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
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-gray-900 mb-6">Cost Analysis Breakdown</h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-gray-900 mb-6">Cost Analysis Breakdown</h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No expense data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-gray-900 mb-6">Cost Analysis Breakdown</h3>
      
      <div className="grid grid-cols-2 gap-8">
        <div className="flex items-center justify-center">
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
                  backgroundColor: 'white', 
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {data.map((item) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    MAD {item.value.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({percentage}%)
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
