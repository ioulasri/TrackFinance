import React, { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ShoppingCart, Car, Utensils, Film, Home, Heart, Smartphone, GraduationCap, Plus, Tag, Loader2 } from 'lucide-react';
import { getCustomCategories, addCustomCategory } from '../customCategories';
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
const focusOn = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = C.accent;
  e.currentTarget.style.boxShadow = `0 0 0 3px ${C.accentSoft}`;
};
const focusOff = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = C.border;
  e.currentTarget.style.boxShadow = 'none';
};
const tileStyle = (selected: boolean, disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  padding: 16,
  borderRadius: 12,
  border: `1px solid ${selected ? C.accent : C.border}`,
  background: selected ? C.accentSoft : C.card,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  transition: 'all 150ms',
});

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (budget: any) => void;
  editingBudget?: any;
  isLoading?: boolean;
}

const PREDEFINED_CATEGORIES = [
  { name: 'Food & Dining', icon: Utensils },
  { name: 'Transportation', icon: Car },
  { name: 'Shopping', icon: ShoppingCart },
  { name: 'Entertainment', icon: Film },
  { name: 'Bills & Utilities', icon: Home },
  { name: 'Healthcare', icon: Heart },
  { name: 'Electronics', icon: Smartphone },
  { name: 'Education', icon: GraduationCap },
];

export function CreateBudgetModal({ isOpen, onClose, onSubmit, editingBudget, isLoading = false }: CreateBudgetModalProps) {
  const [selectedCategory, setSelectedCategory] = useState(editingBudget?.category || 'Food & Dining');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState(editingBudget?.monthly_limit?.toString() || '');
  const [savedCustomCategories, setSavedCustomCategories] = useState<string[]>([]);

  const categories = [
    ...PREDEFINED_CATEGORIES,
    ...savedCustomCategories.map(name => ({ name, icon: Tag })),
  ];

  React.useEffect(() => {
    const custom = getCustomCategories();
    setSavedCustomCategories(custom);
    const allCategories = [...PREDEFINED_CATEGORIES, ...custom.map(name => ({ name, icon: Tag }))];

    if (editingBudget) {
      const isPredefined = allCategories.some(cat => cat.name === editingBudget.category);
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
    if (isLoading) return;
    const finalCategory = isCustom ? customCategory.trim() : selectedCategory;

    if (!finalCategory) {
      return;
    }

    if (isCustom && customCategory.trim()) {
      addCustomCategory(customCategory.trim());
      setSavedCustomCategories(getCustomCategories());
    }

    onSubmit({
      category: finalCategory,
      limit: parseFloat(monthlyLimit),
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
    <Modal isOpen={isOpen} onClose={onClose} title={editingBudget ? 'Edit Budget' : 'Create Budget'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category Selection */}
        <div>
          <label style={fieldLabel}>Select Category</label>
          <div className="grid grid-cols-4 gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              const selected = selectedCategory === category.name && !isCustom;
              return (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => handleCategorySelect(category.name)}
                  disabled={!!editingBudget}
                  style={tileStyle(selected, !!editingBudget)}
                >
                  <Icon size={24} color={selected ? C.accent : C.muted} />
                  <span style={{ fontSize: 12, textAlign: 'center', fontWeight: 500, color: selected ? C.accent : C.muted }}>
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
              style={tileStyle(isCustom, !!editingBudget)}
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
                disabled={!!editingBudget}
              />
            </div>
          )}

          <p style={{ marginTop: 8, fontSize: 13, color: C.muted }}>
            Selected: <span style={{ fontWeight: 600, color: C.accent }}>{isCustom ? (customCategory || 'Custom') : selectedCategory}</span>
            {editingBudget && <span style={{ marginLeft: 8, fontSize: 12 }}>(Category cannot be changed)</span>}
          </p>
        </div>

        {/* Monthly Limit */}
        <div>
          <label style={fieldLabel}>Monthly Limit (MAD)</label>
          <input
            type="number"
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
            placeholder="Enter amount"
            onFocus={focusOn}
            onBlur={focusOff}
            style={{ ...inputBase, padding: '12px 14px', fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: C.ink }}
            required
            min="1"
            step="0.01"
          />
          <p style={{ marginTop: 8, fontSize: 13, color: C.muted }}>
            Set a monthly spending limit for {selectedCategory}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <GhostButton onClick={onClose} style={{ flex: 1, justifyContent: 'center', padding: '10px 15px', fontSize: 13, opacity: isLoading ? 0.6 : 1 }}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={isLoading} style={{ flex: 1 }}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                {editingBudget ? 'Updating…' : 'Creating…'}
              </>
            ) : (
              editingBudget ? 'Update Budget' : 'Create Budget'
            )}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
