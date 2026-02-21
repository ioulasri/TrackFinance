import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, ShoppingCart, Coffee, Car, Home, Smartphone, DollarSign } from 'lucide-react';
import { transactionAPI } from '../api';

const iconMap: Record<string, any> = {
  Shopping: ShoppingCart,
  Food: Coffee,
  Transport: Car,
  Bills: Home,
  Electronics: Smartphone,
  Salary: ArrowUpRight,
  Freelance: ArrowUpRight,
};

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentTransactions();
  }, []);

  const fetchRecentTransactions = async () => {
    setLoading(true);
    try {
      const response = await transactionAPI.list(0, 5);
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to fetch recent transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl text-foreground font-bold">Recent Transactions</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border transition-colors">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl text-foreground font-bold">Recent Transactions</h3>
        <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          View all →
        </button>
      </div>

      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent transactions
          </div>
        ) : (
          transactions.map((transaction) => {
            const Icon = iconMap[transaction.category] || (transaction.transaction_type === 'income' ? ArrowUpRight : ArrowDownRight);
            const isIncome = transaction.transaction_type === 'income';

            return (
              <div
                key={transaction.id}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-card/80 transition-all duration-300 cursor-pointer border border-transparent hover:border-border/50 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className={`p-2.5 rounded-xl ${isIncome ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-primary/10 text-primary shadow-[0_0_10px_rgba(127,13,242,0.2)]'
                  }`}>
                  <Icon size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{transaction.description || transaction.category}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${isIncome ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-primary/5 border-primary/20 text-primary'
                      }`}>
                      {transaction.category}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className={`font-semibold ${isIncome ? 'text-emerald-500' : 'text-foreground'
                  }`}>
                  {isIncome ? '+' : '-'} MAD {transaction.amount.toLocaleString()}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
