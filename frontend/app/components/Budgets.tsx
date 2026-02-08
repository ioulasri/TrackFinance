import React, { useState, useEffect } from 'react';
import { Plus, ShoppingCart, Car, Utensils, Film, Home, Heart, Smartphone, Edit, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { CreateBudgetModal } from './CreateBudgetModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { budgetAPI } from '../api';

const iconMap: Record<string, any> = {
  'Food & Dining': Utensils,
  'Transportation': Car,
  'Entertainment': Film,
  'Shopping': ShoppingCart,
  'Bills & Utilities': Home,
  'Healthcare': Heart,
  'Electronics': Smartphone,
};

export function Budgets() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBudget, setHoveredBudget] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [editingBudget, setEditingBudget] = useState<any>(null);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const response = await budgetAPI.list();
      setBudgets(response.data);
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async (data: any) => {
    try {
      if (editingBudget) {
        await budgetAPI.update(editingBudget.id, {
          monthly_limit: parseFloat(data.limit),
        });
      } else {
        await budgetAPI.create({
          category: data.category,
          monthly_limit: parseFloat(data.limit),
        });
      }
      await fetchBudgets();
      setEditingBudget(null);
    } catch (error) {
      console.error('Failed to create/update budget:', error);
    }
  };

  const handleDeleteBudget = async () => {
    if (!selectedBudget) return;
    try {
      await budgetAPI.delete(selectedBudget.id);
      await fetchBudgets();
      setIsDeleteModalOpen(false);
      setSelectedBudget(null);
    } catch (error) {
      console.error('Failed to delete budget:', error);
    }
  };

  const getBudgetStatus = (spent: number, limit: number) => {
    const percentage = (spent / limit) * 100;
    if (percentage > 100) return { color: 'red', text: 'Over Budget', bgColor: 'bg-red-50', textColor: 'text-red-600' };
    if (percentage >= 80) return { color: 'orange', text: 'High Usage', bgColor: 'bg-orange-50', textColor: 'text-orange-600' };
    if (percentage >= 60) return { color: 'blue', text: 'Moderate', bgColor: 'bg-blue-50', textColor: 'text-blue-600' };
    return { color: 'emerald', text: 'On Track', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600' };
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.current_spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading budgets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Budgets</h1>
          <p className="text-gray-600 mt-1">Manage your spending limits by category</p>
        </div>
        <Button variant="primary" size="large" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={20} className="mr-2" />
          Create Budget
        </Button>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600 mb-2">Total Budget</p>
          <p className="text-3xl font-bold text-gray-900">MAD {totalBudget.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600 mb-2">Total Spent</p>
          <p className="text-3xl font-bold text-gray-900">MAD {totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600 mb-2">Remaining</p>
          <p className="text-3xl font-bold text-emerald-600">MAD {totalRemaining.toLocaleString()}</p>
        </div>
      </div>

      {/* Budget Cards Grid */}
      <div className="grid grid-cols-3 gap-6">
        {budgets.map((budget) => {
          const Icon = iconMap[budget.category] || ShoppingCart;
          const percentage = (budget.current_spent / budget.monthly_limit) * 100;
          const remaining = budget.monthly_limit - budget.current_spent;
          const spent = budget.current_spent;
          const limit = budget.monthly_limit;
          const status = getBudgetStatus(spent, limit);
          const isHovered = hoveredBudget === budget.id;

          return (
            <div
              key={budget.id}
              onMouseEnter={() => setHoveredBudget(budget.id)}
              onMouseLeave={() => setHoveredBudget(null)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all relative group"
            >
              {/* Action Buttons */}
              <div className={`absolute top-4 right-4 flex gap-2 transition-opacity ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}>
                <button 
                  onClick={() => {
                    setEditingBudget(budget);
                    setIsCreateModalOpen(true);
                  }}
                  className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => {
                    setSelectedBudget(budget);
                    setIsDeleteModalOpen(true);
                  }}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl ${
                  percentage > 100 ? 'bg-red-50 text-red-600' :
                  percentage >= 80 ? 'bg-orange-50 text-orange-600' :
                  percentage >= 60 ? 'bg-blue-50 text-blue-600' :
                  'bg-emerald-50 text-emerald-600'
                }`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{budget.category}</h4>
                  <span className={`text-xs px-2 py-1 rounded-md ${status.bgColor} ${status.textColor} font-medium`}>
                    {status.text}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <ProgressBar current={spent} max={limit} showPercentage={false} />
              </div>

              {/* Budget Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Spent</span>
                  <span className="font-semibold text-gray-900">
                    MAD {spent.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Limit</span>
                  <span className="font-semibold text-gray-900">
                    MAD {limit.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Remaining</span>
                    <span className={`font-semibold ${
                      remaining < 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      MAD {Math.abs(remaining).toLocaleString()}
                      {remaining < 0 && ' over'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State Card */}
        <div 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gray-50 rounded-2xl p-6 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center min-h-[280px] hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer"
        >
          <div className="p-4 bg-purple-100 rounded-full mb-4">
            <Plus size={32} className="text-purple-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Add New Budget</h4>
          <p className="text-sm text-gray-600 text-center">
            Create a budget for a new category
          </p>
        </div>
      </div>

      {/* Modals */}
      <CreateBudgetModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingBudget(null);
        }}
        onSubmit={handleCreateBudget}
        editingBudget={editingBudget}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedBudget(null);
        }}
        onConfirm={handleDeleteBudget}
        title="Delete Budget"
        message="Are you sure you want to delete this budget? This action cannot be undone."
      />
    </div>
  );
}
