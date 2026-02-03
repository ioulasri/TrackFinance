import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Wallet, X, Check, Trash2 } from 'lucide-react';
import { budgetAPI } from '../api';

export default function Budgets() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    category: '',
    monthly_limit: '',
  });

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const response = await budgetAPI.list();
      setBudgets(response.data);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await budgetAPI.create({
        category: form.category,
        monthly_limit: parseFloat(form.monthly_limit),
      });
      setShowModal(false);
      setForm({ category: '', monthly_limit: '' });
      loadBudgets();
    } catch (error) {
      console.error('Failed to create budget:', error);
      alert('Failed to create budget. Category might already exist.');
    }
  };

  const handleDelete = async (budgetId: number) => {
    if (!confirm('Are you sure you want to delete this budget?')) {
      return;
    }
    
    try {
      await budgetAPI.delete(budgetId);
      loadBudgets();
    } catch (error) {
      console.error('Failed to delete budget:', error);
      alert('Failed to delete budget.');
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Budgets</h1>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Create Budget</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget, index) => {
            const percentage = (budget.current_spent / budget.monthly_limit) * 100;
            
            return (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="card"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-purple-500/20 rounded-full">
                      <Wallet className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white capitalize">{budget.category}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(budget.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
                    title="Delete budget"
                  >
                    <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Spent</span>
                    <span className="text-white font-semibold">${budget.current_spent.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Limit</span>
                    <span className="text-white font-semibold">${budget.monthly_limit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Remaining</span>
                    <span className={`font-semibold ${percentage >= 100 ? 'text-red-400' : 'text-green-400'}`}>
                      ${Math.max(0, budget.monthly_limit - budget.current_spent).toFixed(2)}
                    </span>
                  </div>

                  <div className="w-full h-3 bg-gray-700/50 rounded-full overflow-hidden mt-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percentage, 100)}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className={`h-full rounded-full ${getProgressColor(percentage)}`}
                    />
                  </div>

                  <div className="text-center">
                    <span className={`text-lg font-bold ${percentage >= 100 ? 'text-red-400' : 'text-white'}`}>
                      {percentage.toFixed(1)}%
                    </span>
                  </div>

                  {percentage >= 100 && (
                    <div className="mt-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                      <p className="text-red-200 text-xs text-center">⚠️ Budget Exceeded!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {budgets.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No budgets yet. Create your first one!</p>
            </div>
          )}
        </div>

        {/* Create Budget Modal */}
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
              className="card max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create Budget</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input-field"
                    placeholder="e.g., groceries, entertainment"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Monthly Limit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.monthly_limit}
                    onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })}
                    className="input-field"
                    placeholder="500.00"
                    required
                  />
                </div>

                <button type="submit" className="btn-primary w-full flex items-center justify-center space-x-2">
                  <Check className="w-5 h-5" />
                  <span>Create Budget</span>
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
