import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, X, Check } from 'lucide-react';
import { transactionAPI } from '../api';

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    category: '',
    type: 'expense',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await transactionAPI.list();
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transactionAPI.create({
        ...form,
        amount: parseFloat(form.amount),
        date: new Date(form.date).toISOString(),
      });
      setShowModal(false);
      setForm({
        amount: '',
        category: '',
        type: 'expense',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      loadTransactions();
    } catch (error) {
      console.error('Failed to create transaction:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await transactionAPI.delete(id);
      loadTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Transactions</h1>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Add Transaction</span>
          </button>
        </div>

        <div className="grid gap-4">
          {transactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    transaction.type === 'income' ? 'bg-emerald-100' : 'bg-blue-100'
                  }`}
                >
                  <span className="text-2xl">
                    {transaction.type === 'income' ? '💰' : '💳'}
                  </span>
                </div>
                <div>
                  <h3 className="text-gray-900 font-semibold text-lg">{transaction.category}</h3>
                  <p className="text-gray-600 text-sm">{transaction.description || 'No description'}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <p
                  className={`text-2xl font-bold ${
                    transaction.type === 'income' ? 'text-emerald-600' : 'text-blue-600'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : '-'}MAD {transaction.amount}
                </p>
                <button
                  onClick={() => handleDelete(transaction.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                >
                  <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add Transaction Modal */}
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add Transaction</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input-field"
                    placeholder="e.g., groceries, salary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        value="expense"
                        checked={form.type === 'expense'}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-gray-700">Expense</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        value="income"
                        checked={form.type === 'income'}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-gray-700">Income</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="input-field"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <button type="submit" className="btn-primary w-full flex items-center justify-center space-x-2">
                  <Check className="w-5 h-5" />
                  <span>Create Transaction</span>
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
