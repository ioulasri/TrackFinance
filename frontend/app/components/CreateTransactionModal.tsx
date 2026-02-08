import React, { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Calendar } from 'lucide-react';

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: any) => void;
}

export function CreateTransactionModal({ isOpen, onClose, onSubmit }: CreateTransactionModalProps) {
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    type: 'expense',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const categories = [
    'Food', 'Shopping', 'Transport', 'Bills', 'Entertainment',
    'Healthcare', 'Education', 'Other'
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
    setFormData({
      amount: '',
      category: 'Food',
      type: 'expense',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Transaction">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount */}
        <div>
          <label className="block mb-2 text-gray-900">Amount (MAD)</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
            className="w-full px-4 py-3 text-3xl font-bold bg-purple-50 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-purple-600"
            required
          />
        </div>

        {/* Type Toggle */}
        <div>
          <label className="block mb-2 text-gray-900">Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'income' })}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                formData.type === 'income'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'expense' })}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                formData.type === 'expense'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Expense
            </button>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block mb-2 text-gray-900">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            required
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block mb-2 text-gray-900">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add a note..."
            rows={3}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
            required
          />
        </div>

        {/* Date */}
        <div>
          <label className="block mb-2 text-gray-900">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" size="large" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="large" className="flex-1">
            Create Transaction
          </Button>
        </div>
      </form>
    </Modal>
  );
}
