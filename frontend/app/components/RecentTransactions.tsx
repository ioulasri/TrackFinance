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
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-gray-900">Recent Transactions</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-gray-900">Recent Transactions</h3>
        <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
          View all →
        </button>
      </div>

      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recent transactions
          </div>
        ) : (
          transactions.map((transaction) => {
            const Icon = iconMap[transaction.category] || (transaction.transaction_type === 'income' ? ArrowUpRight : ArrowDownRight);
            const isIncome = transaction.transaction_type === 'income';

            return (
              <div
                key={transaction.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
              <div className={`p-2.5 rounded-xl ${
                isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
              }`}>
                <Icon size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{transaction.description || transaction.category}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-md ${
                    isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {transaction.category}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(transaction.date).toLocaleDateString()}</span>
                </div>
              </div>

              <div className={`font-semibold ${
                isIncome ? 'text-emerald-600' : 'text-gray-900'
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
