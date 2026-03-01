import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { transactionAPI } from '../api';

const categoryColors: Record<string, string> = {
  'Food & Dining': '#8B5CF6',
  'Food': '#8B5CF6',
  'Shopping': '#EC4899',
  'Transport': '#F59E0B',
  'Bills & Utilities': '#06B6D4',
  'Bills': '#06B6D4',
  'Entertainment': '#F43F5E',
  'Health': '#10B981',
  'Smoking': '#64748B',
  'Borrow': '#3B82F6',
  'Education': '#14B8A6',
  'Other': '#94A3B8',
};

const PALETTE = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#10B981', '#06B6D4'
];

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
        .sort((a, b) => b[1] - a[1]) // highest to lowest
        .slice(0, 6) // top 6
        .map(([name, value], index) => ({
          name,
          value,
          color: categoryColors[name] || PALETTE[index % PALETTE.length]
        }));

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
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl text-foreground font-bold">Cost Analysis</h3>
          <div className="p-2.5 bg-primary/10 rounded-2xl">
            <PieChartIcon className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl text-foreground font-bold">Cost Analysis</h3>
          <div className="p-2.5 bg-primary/10 rounded-2xl">
            <PieChartIcon className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <PieChartIcon className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">No expense data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/60 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xl text-foreground font-bold tracking-tight">Cost Analysis</h3>
          <p className="text-sm text-muted-foreground mt-1">Top spending categories</p>
        </div>
        <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10 text-primary">
          <PieChartIcon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex flex-col gap-6 flex-1">
        {/* Chart */}
        <div className="relative h-[240px] w-full flex items-center justify-center mt-2 group">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {data.map((entry, index) => (
                  <linearGradient key={`grad-${index}`} id={`colorUv-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={entry.color} stopOpacity={1}/>
                    <stop offset="100%" stopColor={entry.color} stopOpacity={0.7}/>
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={75}
                outerRadius={100}
                paddingAngle={8}
                dataKey="value"
                cornerRadius={12}
                stroke="none"
              >
                {data.map((entry, index) => (
                   <Cell 
                     key={`cell-${index}`} 
                     fill={`url(#colorUv-${index})`} 
                     className="transition-all duration-300 outline-none hover:opacity-80 cursor-pointer"
                     style={{ outline: 'none', filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.08))' }}
                   />
                ))}
              </Pie>
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid #e4e4e7',
                  borderRadius: '16px',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                  padding: '12px 16px',
                  color: '#09090b',
                  fontWeight: 600,
                }}
                itemStyle={{ color: '#09090b', fontWeight: 700, paddingBottom: 4 }}
                formatter={(value: number) => [`MAD ${value.toLocaleString()}`, 'Amount']}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Inner Total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-transform duration-500 group-hover:scale-110">
            <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest mb-1 opacity-80">Total</span>
            <span className="text-2xl font-black text-foreground tracking-tight">
              {total.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}
            </span>
          </div>
        </div>

        {/* Legend with Progress Bars */}
        <div className="w-full flex justify-center mt-auto">
          <div className="w-full max-h-[220px] overflow-y-auto pr-3 custom-scrollbar flex flex-col gap-5">
            {data.map((item) => {
              const percentageNumber = (item.value / total) * 100;
              const percentage = percentageNumber.toFixed(1);
              return (
                <div key={item.name} className="flex flex-col gap-2.5 group cursor-default">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3.5 h-3.5 rounded-lg shadow-sm transition-all group-hover:scale-125 duration-300 group-hover:rotate-12"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-foreground font-semibold group-hover:text-primary transition-colors">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground">
                        MAD {item.value.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground bg-secondary/80 px-2.5 py-1 rounded-full min-w-[3.5rem] text-center border border-border/50">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-secondary/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
                      style={{ width: `${Math.max(percentageNumber, 2)}%`, backgroundColor: item.color }}
                    >
                      <div className="absolute top-0 bottom-0 left-0 bg-white/30 w-[40%] transform -skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
