import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Pause, Play, RotateCw, Loader2, AlertCircle, Check, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { recurringAPI, type RecurringTransaction } from '../api';
import {
  C,
  FONT,
  fmtMAD,
  mono,
  Page,
  PageHeader,
  Card,
  PrimaryButton,
  GhostButton,
  Pill,
  EmptyState,
  DSStyles,
} from './ds';

const DEFAULT_CATEGORIES = [
  'Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities',
  'Entertainment', 'Healthcare', 'Education', 'Electronics', 'Other',
];

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const labelStyle: React.CSSProperties = { ...mono, fontSize: 10, display: 'block', marginBottom: 8 };
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: C.paper,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.ink,
  fontSize: 13,
  fontFamily: FONT,
  outline: 'none',
};

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

  const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

  return (
    <Page>
      <DSStyles />
      <style>{`
        @media (max-width:680px){.rec-form-grid{grid-template-columns:minmax(0,1fr) !important;}.rec-form-grid .rec-col-2{grid-column:auto !important;}}
        .ds-icon-btn:hover{background:${C.divider} !important;color:${C.ink} !important;}
        .ds-icon-btn-danger:hover{background:${C.overSoft} !important;color:${C.over} !important;}
        .rec-input:focus{border-color:${C.accent} !important;box-shadow:0 0 0 3px ${C.accentSoft};}
      `}</style>

      <PageHeader
        eyebrow="Scheduled"
        title="Recurring"
        actions={
          <PrimaryButton onClick={() => { resetForm(); setShowForm((v) => !v); }}>
            <Plus size={16} strokeWidth={2} />
            {showForm ? 'Close' : 'New recurring'}
          </PrimaryButton>
        }
      />

      <p style={{ fontSize: 13, color: C.muted, marginTop: 10, maxWidth: 560 }}>
        Salary, rent, subscriptions — auto-posted every month on the day you choose.
      </p>

      {success && (
        <div
          className="flex items-center"
          style={{ gap: 8, marginTop: 20, padding: '10px 14px', background: C.incomeSoft, border: `1px solid ${C.income}`, color: C.incomeText, fontSize: 13, borderRadius: 10 }}
        >
          <Check size={15} style={{ flexShrink: 0 }} /> {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card style={{ marginTop: 20, padding: 24 }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div
                className="flex items-center"
                style={{ gap: 8, marginBottom: 16, padding: '10px 14px', background: C.overSoft, border: `1px solid ${C.over}`, color: C.over, fontSize: 13, borderRadius: 10 }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            <div className="rec-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16 }}>
              <div>
                <label style={labelStyle}>Type</label>
                <div className="flex" style={{ gap: 8 }}>
                  <GhostButton active={type === 'expense'} onClick={() => setType('expense')} style={{ flex: 1, justifyContent: 'center' }}>
                    Expense
                  </GhostButton>
                  <GhostButton active={type === 'income'} onClick={() => setType('income')} style={{ flex: 1, justifyContent: 'center' }}>
                    Income
                  </GhostButton>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Amount (MAD)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  min="0.01"
                  step="0.01"
                  required
                  className="rec-input"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="rec-input" style={inputStyle}>
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
                    className="rec-input"
                    style={{ ...inputStyle, marginTop: 8 }}
                  />
                )}
              </div>

              <div>
                <label style={labelStyle}>Day of month</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className="rec-input"
                  style={inputStyle}
                />
                <p style={{ marginTop: 6, fontSize: 12, color: C.muted }}>
                  Days 29–31 are clamped to the last day of shorter months.
                </p>
              </div>

              <div className="rec-col-2" style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rent, Salary, Netflix…"
                  maxLength={255}
                  className="rec-input"
                  style={inputStyle}
                />
              </div>
            </div>

            <PrimaryButton type="submit" disabled={submitting} style={{ width: '100%', marginTop: 20, padding: '11px 15px' }}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Saving…
                </>
              ) : (
                'Create recurring'
              )}
            </PrimaryButton>
          </form>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center" style={{ padding: '48px 0' }}>
          <Loader2 className="animate-spin" style={{ color: C.muted }} />
        </div>
      ) : items.length === 0 ? (
        <Card style={{ marginTop: 20, padding: '48px 24px' }} className="flex">
          <EmptyState
            icon={RotateCw}
            title="No recurring transactions yet"
            subtext="Click New recurring to schedule salary, rent, or a subscription."
            action={
              <PrimaryButton onClick={() => { resetForm(); setShowForm(true); }}>
                <Plus size={16} strokeWidth={2} />
                New recurring
              </PrimaryButton>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col" style={{ gap: 12, marginTop: 20 }}>
          {items.map((item) => {
            const isIncome = item.type === 'income';
            return (
              <Card
                key={item.id}
                accent={isIncome ? C.income : C.accent}
                className="flex items-center justify-between"
                style={{ padding: '16px 20px', gap: 12, opacity: item.is_active ? 1 : 0.6 }}
              >
                <div className="flex items-center" style={{ gap: 14, minWidth: 0, flex: 1 }}>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 9,
                      flexShrink: 0,
                      background: isIncome ? C.incomeSoft : C.accentSoft,
                      color: isIncome ? C.income : C.accent,
                    }}
                  >
                    {isIncome ? <ArrowDownLeft size={18} strokeWidth={1.8} /> : <ArrowUpRight size={18} strokeWidth={1.8} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="flex items-center" style={{ gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: C.ink, ...num }}>{fmtMAD(item.amount)}</span>
                      <span style={{ fontSize: 13, color: C.ink2 }}>{item.category}</span>
                      {!item.is_active && <Pill tone="neutral">Paused</Pill>}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                      {item.description && <>{item.description} · </>}
                      Day {item.day_of_month} every month · Next: {fmtDate(item.next_run_date)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center" style={{ gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleRunNow(item.id)}
                    aria-label="Post this month's entry now"
                    title="Post this month's entry now"
                    className="ds-icon-btn flex items-center justify-center"
                    style={{ width: 32, height: 32, borderRadius: 7, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer' }}
                  >
                    <RotateCw size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    aria-label={item.is_active ? 'Pause' : 'Resume'}
                    title={item.is_active ? 'Pause' : 'Resume'}
                    className="ds-icon-btn flex items-center justify-center"
                    style={{ width: 32, height: 32, borderRadius: 7, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer' }}
                  >
                    {item.is_active ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    aria-label="Delete"
                    title="Delete"
                    className="ds-icon-btn-danger flex items-center justify-center"
                    style={{ width: 32, height: 32, borderRadius: 7, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}
