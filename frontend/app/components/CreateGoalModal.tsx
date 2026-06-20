import React, { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Target, PiggyBank, Plane, TrendingUp, Home, GraduationCap, Heart, Zap, Trophy, Gift, Plus, Loader2 } from 'lucide-react';
import { C, FONT, PrimaryButton, GhostButton } from './ds';

const fieldLabel: React.CSSProperties = { display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: C.ink };
const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 14,
  fontFamily: FONT,
  color: C.ink,
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
};
const focusOn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = C.accent;
  e.currentTarget.style.boxShadow = `0 0 0 3px ${C.accentSoft}`;
};
const focusOff = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = C.border;
  e.currentTarget.style.boxShadow = 'none';
};
const goalTile = (selected: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  padding: 12,
  borderRadius: 12,
  border: `1px solid ${selected ? C.accent : C.border}`,
  background: selected ? C.accentSoft : C.card,
  cursor: 'pointer',
  transition: 'all 150ms',
});

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
          <label style={fieldLabel}>Goal Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Emergency Fund, Dream Vacation"
            onFocus={focusOn}
            onBlur={focusOff}
            style={inputBase}
            required
          />
        </div>

        {/* Category Selection */}
        <div>
          <label style={fieldLabel}>Category</label>
          <div className="grid grid-cols-4 gap-3">
            {goalCategories.map((category) => {
              const selected = selectedCategory === category.name && !isCustom;
              return (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => handleCategorySelect(category.name)}
                  style={goalTile(selected)}
                >
                  <div style={{ fontSize: 22, lineHeight: 1 }}>{category.icon}</div>
                  <span style={{ fontSize: 12, textAlign: 'center', fontWeight: 500, color: selected ? C.accent : C.muted }}>
                    {category.name}
                  </span>
                </button>
              );
            })}

            {/* Custom Category Button */}
            <button
              type="button"
              onClick={() => handleCategorySelect('Custom')}
              style={goalTile(isCustom)}
            >
              <Plus size={24} color={isCustom ? C.accent : C.muted} />
              <span style={{ fontSize: 12, textAlign: 'center', fontWeight: 500, color: isCustom ? C.accent : C.muted }}>
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
                onFocus={focusOn}
                onBlur={focusOff}
                style={inputBase}
                required={isCustom}
              />
            </div>
          )}
        </div>

        {/* Amount Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={fieldLabel}>Target Amount (MAD)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="10000"
              min="0"
              step="0.01"
              onFocus={focusOn}
              onBlur={focusOff}
              style={{ ...inputBase, fontVariantNumeric: 'tabular-nums' }}
              required
            />
          </div>

          <div>
            <label style={fieldLabel}>Current Amount (MAD)</label>
            <input
              type="number"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              onFocus={focusOn}
              onBlur={focusOff}
              style={{ ...inputBase, fontVariantNumeric: 'tabular-nums' }}
            />
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label style={fieldLabel}>Deadline (Optional)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            onFocus={focusOn}
            onBlur={focusOff}
            style={inputBase}
          />
        </div>

        {/* Description */}
        <div>
          <label style={fieldLabel}>Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Why is this goal important to you?"
            rows={3}
            onFocus={focusOn}
            onBlur={focusOff}
            style={{ ...inputBase, resize: 'none' }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <GhostButton onClick={onClose} style={{ flex: 1, justifyContent: 'center', padding: '10px 15px', fontSize: 13, opacity: isLoading ? 0.6 : 1 }}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={isLoading} style={{ flex: 1 }}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                {editingGoal ? 'Updating…' : 'Creating…'}
              </>
            ) : (
              editingGoal ? 'Update Goal' : 'Create Goal'
            )}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
