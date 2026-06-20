import React, { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Calendar, Loader2 } from 'lucide-react';
import { getCustomCategories, addCustomCategory } from '../customCategories';
import { C, FONT, MONO, PrimaryButton, GhostButton } from './ds';

const fieldLabel: React.CSSProperties = { display: 'block', marginBottom: 7, fontSize: 13, fontWeight: 500, color: C.ink };
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
const focusOn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = C.accent;
  e.currentTarget.style.boxShadow = `0 0 0 3px ${C.accentSoft}`;
};
const focusOff = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = C.border;
  e.currentTarget.style.boxShadow = 'none';
};

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: any) => void;
  editingTransaction?: any;
  isLoading?: boolean;
}

const PREDEFINED_CATEGORIES = [
  'Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities', 'Entertainment',
  'Healthcare', 'Education', 'Electronics',
];

export function CreateTransactionModal({ isOpen, onClose, onSubmit, editingTransaction, isLoading = false }: CreateTransactionModalProps) {
  const [formData, setFormData] = useState({
    amount: editingTransaction?.amount?.toString() || '',
    category: editingTransaction?.category || 'Food & Dining',
    type: editingTransaction?.type || 'expense',
    description: editingTransaction?.description || '',
    date: editingTransaction?.date ? new Date(editingTransaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [savedCustomCategories, setSavedCustomCategories] = useState<string[]>([]);

  const categories = [...PREDEFINED_CATEGORIES, ...savedCustomCategories, 'Other'];

  React.useEffect(() => {
    const custom = getCustomCategories();
    setSavedCustomCategories(custom);
    const allCategories = [...PREDEFINED_CATEGORIES, ...custom, 'Other'];

    if (editingTransaction) {
      const isPredefinedCategory = allCategories.includes(editingTransaction.category);
      setFormData({
        amount: editingTransaction.amount.toString(),
        category: isPredefinedCategory ? editingTransaction.category : 'Other',
        type: editingTransaction.type,
        description: editingTransaction.description || '',
        date: new Date(editingTransaction.date).toISOString().split('T')[0],
      });

      if (!isPredefinedCategory) {
        setShowCustomInput(true);
        setCustomCategory(editingTransaction.category);
      } else {
        setShowCustomInput(false);
        setCustomCategory('');
      }
    } else {
      setFormData({
        amount: '',
        category: 'Food & Dining',
        type: 'expense',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowCustomInput(false);
      setCustomCategory('');
    }
  }, [editingTransaction, isOpen]);

  const handleCategoryChange = (category: string) => {
    setFormData({ ...formData, category });
    if (category === 'Other') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setCustomCategory('');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const finalCategory = showCustomInput && customCategory.trim()
      ? customCategory.trim()
      : formData.category;

    if (showCustomInput && customCategory.trim()) {
      addCustomCategory(customCategory.trim());
      setSavedCustomCategories(getCustomCategories());
    }

    onSubmit({
      ...formData,
      category: finalCategory,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTransaction ? 'Edit Transaction' : 'Create Transaction'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount */}
        <div>
          <label style={fieldLabel}>Amount (MAD)</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
            onFocus={focusOn}
            onBlur={focusOff}
            style={{ ...inputBase, padding: '12px 14px', fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: C.ink }}
            required
          />
        </div>

        {/* Type Toggle */}
        <div>
          <label style={fieldLabel}>Type</label>
          <div className="grid grid-cols-2" style={{ gap: 6, padding: 4, background: C.divider, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'income' })}
              style={{
                padding: '8px 14px',
                borderRadius: 7,
                border: 0,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: FONT,
                cursor: 'pointer',
                transition: 'all 150ms',
                background: formData.type === 'income' ? C.income : 'transparent',
                color: formData.type === 'income' ? '#fff' : C.muted,
              }}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'expense' })}
              style={{
                padding: '8px 14px',
                borderRadius: 7,
                border: 0,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: FONT,
                cursor: 'pointer',
                transition: 'all 150ms',
                background: formData.type === 'expense' ? C.card : 'transparent',
                color: formData.type === 'expense' ? C.ink : C.muted,
                boxShadow: formData.type === 'expense' ? '0 1px 2px rgba(26,24,21,0.08)' : 'none',
              }}
            >
              Expense
            </button>
          </div>
        </div>

        {/* Category */}
        <div>
          <label style={fieldLabel}>Category</label>
          <select
            value={formData.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            onFocus={focusOn}
            onBlur={focusOff}
            style={{ ...inputBase, cursor: 'pointer', appearance: 'none' }}
            required
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Custom Category Input */}
          {showCustomInput && (
            <div className="mt-3">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category name"
                onFocus={focusOn}
                onBlur={focusOff}
                style={inputBase}
                required={showCustomInput}
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label style={fieldLabel}>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add a note..."
            rows={3}
            onFocus={focusOn}
            onBlur={focusOff}
            style={{ ...inputBase, resize: 'none' }}
            required
          />
        </div>

        {/* Date */}
        <div>
          <label style={fieldLabel}>Date</label>
          <div className="relative">
            <Calendar style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.faint }} size={18} />
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              onFocus={focusOn}
              onBlur={focusOff}
              style={{ ...inputBase, paddingLeft: 38, cursor: 'pointer' }}
              required
            />
          </div>
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
                {editingTransaction ? 'Updating…' : 'Creating…'}
              </>
            ) : (
              editingTransaction ? 'Update Transaction' : 'Create Transaction'
            )}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
