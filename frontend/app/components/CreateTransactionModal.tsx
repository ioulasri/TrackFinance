import React, { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Calendar, Loader2 } from 'lucide-react';

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: any) => void;
  editingTransaction?: any;
  isLoading?: boolean;
}

export function CreateTransactionModal({ isOpen, onClose, onSubmit, editingTransaction, isLoading = false }: CreateTransactionModalProps) {
  const [formData, setFormData] = useState({
    amount: editingTransaction?.amount?.toString() || '',
    category: editingTransaction?.category || 'Food',
    type: editingTransaction?.type || 'expense',
    description: editingTransaction?.description || '',
    date: editingTransaction?.date ? new Date(editingTransaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  });
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const categories = [
    'Food & Dining', 'Shopping', 'Transportation', 'Bills & Utilities', 'Entertainment',
    'Healthcare', 'Education', 'Electronics', 'Other'
  ];

  React.useEffect(() => {
    if (editingTransaction) {
      const isPredefinedCategory = categories.includes(editingTransaction.category);
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
          <label className="block mb-2 text-sm font-medium text-foreground">Amount (MAD)</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
            className="w-full px-4 py-3 text-3xl font-bold bg-muted/30 border-2 border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground transition-all"
            required
          />
        </div>

        {/* Type Toggle */}
        <div>
          <label className="block mb-2 text-sm font-medium text-foreground">Type</label>
          <div className="grid grid-cols-2 gap-3 p-1 bg-muted rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'income' })}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${formData.type === 'income'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-foreground/70 hover:text-foreground hover:bg-background/50'
                }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'expense' })}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${formData.type === 'expense'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-foreground/70 hover:text-foreground hover:bg-background/50'
                }`}
            >
              Expense
            </button>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block mb-2 text-sm font-medium text-foreground">Category</label>
          <select
            value={formData.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all appearance-none cursor-pointer"
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
                className="w-full px-4 py-2.5 bg-background border border-primary text-foreground placeholder-muted-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                required={showCustomInput}
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block mb-2 text-sm font-medium text-foreground">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add a note..."
            rows={3}
            className="w-full px-4 py-2.5 bg-background border border-border text-foreground placeholder-muted-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none transition-all"
            required
          />
        </div>

        {/* Date */}
        <div>
          <label className="block mb-2 text-sm font-medium text-foreground">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer"
              required
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" size="large" className="flex-1" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="large" className="flex-1 text-primary-foreground" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                {editingTransaction ? 'Updating…' : 'Creating…'}
              </>
            ) : (
              editingTransaction ? 'Update Transaction' : 'Create Transaction'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
