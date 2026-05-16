import React, { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Target, PiggyBank, Plane, TrendingUp, Home, GraduationCap, Heart, Zap, Trophy, Gift, Plus, Loader2 } from 'lucide-react';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: any) => void;
  editingGoal?: any;
  isLoading?: boolean;
}

const goalCategories = [
  { name: 'Emergency Fund', icon: '💰', iconComponent: PiggyBank, color: 'emerald' },
  { name: 'Travel', icon: '✈️', iconComponent: Plane, color: 'blue' },
  { name: 'House', icon: '🏠', iconComponent: Home, color: 'purple' },
  { name: 'Education', icon: '🎓', iconComponent: GraduationCap, color: 'indigo' },
  { name: 'Investment', icon: '📈', iconComponent: TrendingUp, color: 'green' },
  { name: 'Health', icon: '❤️', iconComponent: Heart, color: 'red' },
  { name: 'Retirement', icon: '⚡', iconComponent: Zap, color: 'yellow' },
  { name: 'Celebration', icon: '🎁', iconComponent: Gift, color: 'pink' },
];

export function CreateGoalModal({ isOpen, onClose, onSubmit, editingGoal, isLoading = false }: CreateGoalModalProps) {
  const [name, setName] = useState(editingGoal?.name || '');
  const [selectedCategory, setSelectedCategory] = useState(
    editingGoal?.category || goalCategories[0].name
  );
  const [customCategory, setCustomCategory] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [targetAmount, setTargetAmount] = useState(editingGoal?.target_amount?.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(editingGoal?.current_amount?.toString() || '0');
  const [deadline, setDeadline] = useState(editingGoal?.deadline || '');
  const [description, setDescription] = useState(editingGoal?.description || '');

  React.useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name);
      const isPredefined = goalCategories.some(cat => cat.name === editingGoal.category);
      if (isPredefined) {
        setSelectedCategory(editingGoal.category);
        setIsCustom(false);
        setCustomCategory('');
      } else {
        setIsCustom(true);
        setCustomCategory(editingGoal.category || '');
        setSelectedCategory('Custom');
      }
      setTargetAmount(editingGoal.target_amount.toString());
      setCurrentAmount(editingGoal.current_amount.toString());
      setDeadline(editingGoal.deadline || '');
      setDescription(editingGoal.description || '');
    } else {
      resetForm();
    }
  }, [editingGoal, isOpen]);

  const resetForm = () => {
    setName('');
    setSelectedCategory(goalCategories[0].name);
    setIsCustom(false);
    setCustomCategory('');
    setTargetAmount('');
    setCurrentAmount('0');
    setDeadline('');
    setDescription('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const finalCategory = isCustom ? customCategory.trim() : selectedCategory;
    const selectedCat = goalCategories.find(cat => cat.name === finalCategory);
    const icon = isCustom ? '🎯' : (selectedCat?.icon || '🎯');

    if (!name.trim() || !finalCategory) {
      return;
    }

    onSubmit({
      name: name.trim(),
      icon,
      category: finalCategory,
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount) || 0,
      deadline: deadline || null,
      description: description.trim() || null,
    });
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
    <Modal isOpen={isOpen} onClose={onClose} title={editingGoal ? 'Edit Goal' : 'Create New Goal'} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Goal Name */}
        <div>
          <label className="block mb-2 text-gray-900 text-sm font-medium">Goal Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Emergency Fund, Dream Vacation"
            className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            required
          />
        </div>

        {/* Category Selection */}
        <div>
          <label className="block mb-3 text-gray-900 text-sm font-medium">Category</label>
          <div className="grid grid-cols-4 gap-3">
            {goalCategories.map((category) => {
              const Icon = category.iconComponent;
              return (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => handleCategorySelect(category.name)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    selectedCategory === category.name && !isCustom
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                >
                  <div className="text-2xl">{category.icon}</div>
                  <span className={`text-xs text-center font-medium ${
                    selectedCategory === category.name && !isCustom ? 'text-purple-600' : 'text-gray-600'
                  }`}>
                    {category.name}
                  </span>
                </button>
              );
            })}
            
            {/* Custom Category Button */}
            <button
              type="button"
              onClick={() => handleCategorySelect('Custom')}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
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
              />
            </div>
          )}
        </div>

        {/* Amount Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-gray-900 text-sm font-medium">Target Amount (MAD)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="10000"
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-gray-900 text-sm font-medium">Current Amount (MAD)</label>
            <input
              type="number"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="block mb-2 text-gray-900 text-sm font-medium">Deadline (Optional)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block mb-2 text-gray-900 text-sm font-medium">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Why is this goal important to you?"
            rows={3}
            className="w-full px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                {editingGoal ? 'Updating…' : 'Creating…'}
              </>
            ) : (
              editingGoal ? 'Update Goal' : 'Create Goal'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
