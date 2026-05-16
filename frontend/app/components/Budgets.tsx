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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
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
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create/update budget:', error);
    } finally {
      setIsSubmitting(false);
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
    if (percentage > 100) return { color: 'red', text: 'Over Budget', bgColor: 'bg-destructive/10 border border-destructive/20', textColor: 'text-destructive' };
    if (percentage >= 80) return { color: 'orange', text: 'High Usage', bgColor: 'bg-orange-500/10 border border-orange-500/20', textColor: 'text-orange-500' };
    if (percentage >= 60) return { color: 'blue', text: 'Moderate', bgColor: 'bg-blue-500/10 border border-blue-500/20', textColor: 'text-blue-500' };
    return { color: 'emerald', text: 'On Track', bgColor: 'bg-emerald-500/10 border border-emerald-500/20', textColor: 'text-emerald-500' };
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.current_spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading budgets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Budgets</h1>
          <p className="text-muted-foreground mt-1">Manage your spending limits by category</p>
        </div>
        <Button variant="primary" size="large" onClick={() => setIsCreateModalOpen(true)} className="shadow-sm hover:opacity-90">
          <Plus size={20} className="mr-2" />
          Create Budget
        </Button>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground mb-2 font-medium">Total Budget</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">MAD {totalBudget.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground mb-2 font-medium">Total Spent</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">MAD {totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground mb-2 font-medium">Remaining</p>
          <p className="text-3xl font-bold text-emerald-500 tracking-tight">MAD {totalRemaining.toLocaleString()}</p>
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
              className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:border-primary/30 transition-all relative group"
            >
              {/* Action Buttons */}
              <div className={`absolute top-4 right-4 flex gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                <button
                  onClick={() => {
                    setEditingBudget(budget);
                    setIsCreateModalOpen(true);
                  }}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => {
                    setSelectedBudget(budget);
                    setIsDeleteModalOpen(true);
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Category Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-2.5 rounded-lg transition-transform duration-300 group-hover:scale-105 ${percentage > 100 ? 'bg-destructive/10 text-destructive' :
                  percentage >= 80 ? 'bg-orange-50 text-orange-600' :
                    percentage >= 60 ? 'bg-blue-50 text-blue-600' :
                      'bg-emerald-50 text-emerald-600'
                  }`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{budget.category}</h4>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <ProgressBar current={spent} max={limit} showPercentage={false} />
              </div>

              {/* Budget Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-semibold text-foreground">
                    MAD {spent.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Limit</span>
                  <span className="font-semibold text-foreground">
                    MAD {limit.toLocaleString()}
                  </span>
                </div>
                <div className="pt-3 border-t border-border mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{status.text}</span>
                    <span className={`font-semibold ${remaining < 0 ? 'text-destructive' : 'text-emerald-500'
                      }`}>
                      {remaining < 0 ? 'Over MAD ' : 'Remaining MAD '}{Math.abs(remaining).toLocaleString()}
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
          className="bg-card rounded-2xl p-6 border-2 border-dashed border-border flex flex-col items-center justify-center min-h-[280px] hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
        >
          <div className="p-4 bg-primary/10 rounded-full mb-4 group-hover:shadow-[0_0_15px_rgba(127,13,242,0.3)]">
            <Plus size={32} className="text-primary" />
          </div>
          <h4 className="font-semibold text-foreground mb-2">Add New Budget</h4>
          <p className="text-sm text-muted-foreground text-center">
            Create a budget for a new category
          </p>
        </div>
      </div>

      {/* Modals */}
      <CreateBudgetModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (isSubmitting) return;
          setIsCreateModalOpen(false);
          setEditingBudget(null);
        }}
        onSubmit={handleCreateBudget}
        editingBudget={editingBudget}
        isLoading={isSubmitting}
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
