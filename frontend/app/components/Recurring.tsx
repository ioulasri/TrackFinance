import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Pause, Play, RotateCw, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from './Button';
import { recurringAPI, type RecurringTransaction } from '../api';

const DEFAULT_CATEGORIES = [
  'Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities',
  'Entertainment', 'Healthcare', 'Education', 'Electronics', 'Other',
];

function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD';
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Recurring() {
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await recurringAPI.list();
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch recurring transactions', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setType('expense');
    setCategory(DEFAULT_CATEGORIES[0]);
    setCustomCategory('');
    setDescription('');
    setDayOfMonth('1');
    setError(null);
  };

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Amount must be a positive number');
      return;
    }
    const day = parseInt(dayOfMonth, 10);
    if (!day || day < 1 || day > 31) {
      setError('Day of month must be between 1 and 31');
      return;
    }
    const cat = (category === 'Other' ? customCategory.trim() : category).trim();
    if (!cat) {
      setError('Category is required');
      return;
    }

    setSubmitting(true);
    try {
      await recurringAPI.create({
        amount: amt,
        type,
        category: cat,
        description: description.trim() || null,
        day_of_month: day,
      });
      await fetchItems();
      setShowForm(false);
      resetForm();
      flash('Recurring transaction created');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this recurring entry?')) return;
    try {
      await recurringAPI.delete(id);
      await fetchItems();
      flash('Deleted');
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleToggleActive = async (item: RecurringTransaction) => {
    try {
      await recurringAPI.update(item.id, { is_active: !item.is_active });
      await fetchItems();
    } catch (err) {
      console.error('Toggle failed', err);
    }
  };

  const handleRunNow = async (id: number) => {
    try {
      await recurringAPI.runNow(id);
      await fetchItems();
      flash('Posted this month\'s entry');
    } catch (err: any) {
      console.error('Run-now failed', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Recurring</h1>
          <p className="text-muted-foreground mt-1">
            Salary, rent, subscriptions — auto-posted every month on the day you choose.
          </p>
        </div>
        <Button
          variant="primary"
          size="medium"
          onClick={() => { resetForm(); setShowForm((v) => !v); }}
        >
          <Plus size={16} />
          {showForm ? 'Close' : 'New recurring'}
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-lg">
          <Check size={15} className="shrink-0" /> {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-foreground">Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    type === 'expense'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    type === 'income'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-foreground">Amount (MAD)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                min="0.01"
                step="0.01"
                required
                className="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-input border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {category === 'Other' && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Custom category"
                  maxLength={50}
                  className="mt-2 w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-lg text-sm"
                />
              )}
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-foreground">Day of month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-lg text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Days 29–31 are clamped to the last day of shorter months.
              </p>
            </div>

            <div className="col-span-2">
              <label className="block mb-1.5 text-sm font-medium text-foreground">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rent, Salary, Netflix…"
                maxLength={255}
                className="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-lg text-sm"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" size="medium" disabled={submitting} className="w-full">
            {submitting ? <><Loader2 className="animate-spin" size={16} /> Saving…</> : 'Create recurring'}
          </Button>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 shadow-sm border border-border text-center">
          <RotateCw size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No recurring transactions yet. Click <strong>New recurring</strong> to set one up.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-card rounded-2xl p-5 shadow-sm border border-border flex items-center justify-between ${
                !item.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-xl ${item.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {item.type === 'income' ? '📥' : '📤'}
                  </span>
                  <span className="font-semibold text-foreground text-lg">{fmtMoney(item.amount)}</span>
                  <span className="text-sm text-muted-foreground">·</span>
                  <span className="text-sm text-foreground">{item.category}</span>
                  {!item.is_active && (
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">Paused</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.description && <>{item.description} · </>}
                  Day {item.day_of_month} every month · Next: {fmtDate(item.next_run_date)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRunNow(item.id)}
                  title="Post this month's entry now"
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <RotateCw size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(item)}
                  title={item.is_active ? 'Pause' : 'Resume'}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {item.is_active ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  title="Delete"
                  className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
