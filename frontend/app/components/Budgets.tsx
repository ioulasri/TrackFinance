import React, { useState, useEffect } from 'react';
import { Plus, Wallet, Edit, Trash2 } from 'lucide-react';
import { CreateBudgetModal } from './CreateBudgetModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { budgetAPI } from '../api';
import {
  C,
  FONT,
  MONO,
  fmt,
  colorFor,
  Page,
  PageHeader,
  Card,
  PrimaryButton,
  EmptyState,
  DSStyles,
} from './ds';

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

  const totalBudget = budgets.reduce((sum, b) => sum + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.current_spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 384, fontFamily: FONT }}>
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full" style={{ border: `2px solid ${C.border}`, borderBottomColor: C.accent }} />
          <p className="mt-4" style={{ fontSize: 13, color: C.muted }}>Loading budgets…</p>
        </div>
      </div>
    );
  }

  const createButton = (
    <PrimaryButton onClick={() => setIsCreateModalOpen(true)}>
      <Plus size={16} strokeWidth={2} />
      Create budget
    </PrimaryButton>
  );

  const summaryCards: { label: string; value: number; color: string; accent?: string }[] = [
    { label: 'Total budget', value: totalBudget, color: C.ink },
    { label: 'Spent', value: totalSpent, color: C.ink },
    {
      label: 'Remaining',
      value: totalRemaining,
      color: totalRemaining < 0 ? C.over : C.incomeText,
      accent: C.income,
    },
  ];

  return (
    <Page>
      <DSStyles />
      <style>{`@media (max-width:768px){.budget-summary{grid-template-columns:minmax(0,1fr) !important;}}`}</style>

      <PageHeader eyebrow="This month" title="Budgets" actions={createButton} />

      {/* Summary cards */}
      <div
        className="budget-summary"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16, marginTop: 26 }}
      >
        {summaryCards.map((c) => (
          <Card key={c.label} accent={c.accent} style={{ padding: '20px 22px' }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, fontWeight: 500 }}>
              {c.label}
            </div>
            <div
              style={{ marginTop: 10, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: c.color, fontVariantNumeric: 'tabular-nums' }}
              aria-label={`${c.label}: ${fmt(c.value)} MAD`}
            >
              {fmt(c.value)} <span style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>MAD</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Budget list */}
      <Card style={{ marginTop: 24, padding: budgets.length === 0 ? 12 : '8px 4px' }}>
        {budgets.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No budgets yet"
            subtext="Set a monthly limit for a category to track your spending."
            action={createButton}
          />
        ) : (
          <div className="flex flex-col">
            {budgets.map((budget, i) => {
              const spent = budget.current_spent;
              const limit = budget.monthly_limit;
              const remaining = limit - spent;
              const percentage = limit > 0 ? (spent / limit) * 100 : 0;
              const over = remaining < 0;
              const dot = colorFor(budget.category);
              const fillColor = over ? C.over : dot;
              const isHovered = hoveredBudget === budget.id;

              return (
                <div
                  key={budget.id}
                  className="ds-row"
                  onMouseEnter={() => setHoveredBudget(budget.id)}
                  onMouseLeave={() => setHoveredBudget(null)}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 9,
                    borderBottom: i < budgets.length - 1 ? `0.5px solid ${C.divider}` : 'none',
                    transition: 'background 150ms',
                  }}
                >
                  {/* Top line: category + amounts + actions */}
                  <div className="flex items-center" style={{ gap: 12 }}>
                    <span
                      aria-hidden="true"
                      style={{ width: 10, height: 10, borderRadius: 3, background: dot, flexShrink: 0 }}
                    />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: C.ink }}>{budget.category}</span>

                    <span style={{ fontSize: 13, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ fontWeight: 600, color: C.ink }}>{fmt(spent)}</span> / {fmt(limit)} MAD
                    </span>

                    <div
                      className="flex items-center"
                      style={{ gap: 4, marginLeft: 4, opacity: isHovered ? 1 : 0, transition: 'opacity 150ms' }}
                    >
                      <button
                        type="button"
                        aria-label={`Edit ${budget.category} budget`}
                        onClick={() => {
                          setEditingBudget(budget);
                          setIsCreateModalOpen(true);
                        }}
                        className="ds-icon-btn flex items-center justify-center"
                        style={{ width: 30, height: 30, borderRadius: 7, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', transition: 'all 150ms' }}
                      >
                        <Edit size={15} strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${budget.category} budget`}
                        onClick={() => {
                          setSelectedBudget(budget);
                          setIsDeleteModalOpen(true);
                        }}
                        className="ds-icon-btn flex items-center justify-center"
                        style={{ width: 30, height: 30, borderRadius: 7, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', transition: 'all 150ms' }}
                      >
                        <Trash2 size={15} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>

                  {/* Progress track */}
                  <div
                    style={{ marginTop: 12, width: '100%', height: 8, borderRadius: 5, background: C.divider, overflow: 'hidden' }}
                    role="progressbar"
                    aria-valuenow={Math.round(percentage)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${budget.category} budget usage`}
                  >
                    <div
                      style={{ width: `${Math.min(percentage, 100)}%`, height: '100%', borderRadius: 5, background: fillColor, transition: 'width 300ms ease' }}
                    />
                  </div>

                  {/* Bottom line: percent + remaining/over */}
                  <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.02em', color: over ? C.over : C.muted, fontWeight: 500 }}>
                      {Math.round(percentage)}%
                    </span>
                    <span
                      style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: over ? C.over : C.muted, fontWeight: over ? 600 : 400 }}
                    >
                      {over ? `${fmt(Math.abs(remaining))} MAD over` : `${fmt(remaining)} MAD left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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

      <style>{`.ds-icon-btn:hover{background:${C.divider};color:${C.ink2};}`}</style>
    </Page>
  );
}
