import React, { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ShoppingCart, Car, Utensils, Film, Home, Heart, Smartphone, GraduationCap, Plus } from 'lucide-react';

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (budget: any) => void;
  editingBudget?: any;
}

const categories = [
  { name: 'Food & Dining', icon: Utensils },
  { name: 'Transportation', icon: Car },
  { name: 'Shopping', icon: ShoppingCart },
  { name: 'Entertainment', icon: Film },
  { name: 'Bills & Utilities', icon: Home },
  { name: 'Healthcare', icon: Heart },
  { name: 'Electronics', icon: Smartphone },
  { name: 'Education', icon: GraduationCap },
];

export function CreateBudgetModal({ isOpen, onClose, onSubmit, editingBudget }: CreateBudgetModalProps) {
  const [selectedCategory, setSelectedCategory] = useState(editingBudget?.category || 'Food & Dining');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState(editingBudget?.monthly_limit?.toString() || '');

  React.useEffect(() => {
    if (editingBudget) {
      const isPredefined = categories.some(cat => cat.name === editingBudget.category);
      if (isPredefined) {
        setSelectedCategory(editingBudget.category);
        setIsCustom(false);
        setCustomCategory('');
      } else {
        setIsCustom(true);
        setCustomCategory(editingBudget.category);
        setSelectedCategory('Custom');
      }
      setMonthlyLimit(editingBudget.monthly_limit.toString());
    } else {
      setSelectedCategory('Food & Dining');
      setIsCustom(false);
      setCustomCategory('');
      setMonthlyLimit('');
    }
  }, [editingBudget, isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustom ? customCategory.trim() : selectedCategory;
    
    if (!finalCategory) {
      return; // Don't submit if custom category is empty
    }
    
    onSubmit({
      category: finalCategory,
      limit: parseFloat(monthlyLimit),
    });
    onClose();
    setSelectedCategory('Food & Dining');
    setIsCustom(false);
    setCustomCategory('');
    setMonthlyLimit('');
  };

  const handleCategorySelect = (categoryName: string) => {
    if (categoryName === 'Custom') {
      setIsCustom(true);
      setSelectedCategory('Custom');
    } else {
      setIsCustom(false);
      setSelectedCategory(categoryName);
      setCustomCategory('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingBudget ? 'Edit Budget' : 'Create Budget'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category Selection */}
        <div>
          <label className="block mb-3 text-gray-900">Select Category</label>
          <div className="grid grid-cols-4 gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => handleCategorySelect(category.name)}
                  disabled={!!editingBudget}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${editingBudget ? 'opacity-50 cursor-not-allowed' : ''} ${
                    selectedCategory === category.name && !isCustom
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                >
                  <Icon 
                    size={24} 
                    className={selectedCategory === category.name && !isCustom ? 'text-purple-600' : 'text-gray-600'} 
                  />
                  <span className={`text-xs text-center font-medium ${
                    selectedCategory === category.name && !isCustom ? 'text-purple-600' : 'text-gray-600'
                  }`}>
                    {category.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
            
            {/* Custom Category Button */}
            <button
              type="button"
              onClick={() => handleCategorySelect('Custom')}
              disabled={!!editingBudget}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${editingBudget ? 'opacity-50 cursor-not-allowed' : ''} ${
                isCustom
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
              }`}
            >
              <Plus 
                size={24} 
                className={isCustom ? 'text-purple-600' : 'text-gray-600'} 
              />
              <span className={`text-xs text-center font-medium ${
                isCustom ? 'text-purple-600' : 'text-gray-600'
              }`}>
                Custom
              </span>
            </button>
          </div>
          
          {/* Custom Category Input */}
          {isCustom && (
            <div className="mt-3">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category name"
                className="w-full px-4 py-2.5 bg-white border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                required={isCustom}
                disabled={!!editingBudget}
              />
            </div>
          )}
          
          <p className="mt-2 text-sm text-gray-600">
            Selected: <span className="font-semibold text-purple-600">{isCustom ? (customCategory || 'Custom') : selectedCategory}</span>
            {editingBudget && <span className="ml-2 text-xs">(Category cannot be changed)</span>}
          </p>
        </div>

        {/* Monthly Limit */}
        <div>
          <label className="block mb-2 text-gray-900">Monthly Limit (MAD)</label>
          <input
            type="number"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            placeholder="Enter amount"
            className="w-full px-4 py-3 text-2xl font-bold bg-purple-50 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-purple-600"
            required
            min="1"
            step="0.01"
          />
          <p className="mt-2 text-sm text-gray-600">
            Set a monthly spending limit for {selectedCategory}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" size="large" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="large" className="flex-1">
            {editingBudget ? 'Update Budget' : 'Create Budget'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
