import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Edit, Trash2, ArrowUpRight, ArrowDownRight, Receipt } from 'lucide-react';
import { CreateTransactionModal } from './CreateTransactionModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { transactionAPI } from '../api';
import {
  C,
  FONT,
  MONO,
  fmtMAD,
  colorFor,
  mono,
  Page,
  PageHeader,
  Card,
  PrimaryButton,
  GhostButton,
  EmptyState,
  DSStyles,
} from './ds';

export function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await transactionAPI.list(0, 1000);
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (editingTransaction) {
        const updatePayload: any = {
          amount: parseFloat(data.amount),
          category: data.category,
          type: data.type,
          description: data.description,
        };

        const originalDate = new Date(editingTransaction.date).toISOString().split('T')[0];
        if (data.date !== originalDate) {
          updatePayload.date = data.date;
        }

        await transactionAPI.update(editingTransaction.id, updatePayload);
      } else {
        await transactionAPI.create({
          amount: parseFloat(data.amount),
          category: data.category,
          type: data.type,
          description: data.description,
          date: data.date,
        });
      }
      await fetchTransactions();
      setEditingTransaction(null);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create/update transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;
    try {
      await transactionAPI.delete(selectedTransaction.id);
      await fetchTransactions();
      setIsDeleteModalOpen(false);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;
    const matchesType = selectedType === 'all' || transaction.type === selectedType;
    const matchesDate = !dateFilter ||
      new Date(transaction.date).toLocaleDateString('en-CA') === dateFilter;

    return matchesSearch && matchesCategory && matchesType && matchesDate;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const categories = ['all', ...Array.from(new Set(transactions.map(t => t.category)))];

  const hasActiveFilters =
    !!searchQuery || selectedCategory !== 'all' || selectedType !== 'all' || !!dateFilter;

  const inputBase: React.CSSProperties = {
    width: '100%',
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 13,
    fontFamily: FONT,
    color: C.ink,
    outline: 'none',
  };

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center" style={{ minHeight: 384 }}>
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full" style={{ border: `2px solid ${C.border}`, borderBottomColor: C.accent }} />
            <p className="mt-4" style={{ fontSize: 13, color: C.muted }}>Loading transactions…</p>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <DSStyles />

      <PageHeader
        eyebrow="All accounts"
        title="Transactions"
        actions={
          <PrimaryButton onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={17} strokeWidth={2} />
            Add Transaction
          </PrimaryButton>
        }
      />

      {/* Filter panel */}
      <Card style={{ padding: 20, marginTop: 26 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }} className="tx-filters">
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} strokeWidth={1.8} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input
              type="text"
              placeholder="Search transactions…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search transactions"
              style={{ ...inputBase, paddingLeft: 36 }}
            />
          </div>

          {/* Date */}
          <div style={{ position: 'relative' }}>
            <Calendar size={16} strokeWidth={1.8} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by date"
              style={{ ...inputBase, paddingLeft: 36, cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Type filter chips */}
        <div className="flex items-center" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: 10, marginRight: 2 }}>Type</span>
          {(['all', 'income', 'expense'] as const).map((t) => (
            <GhostButton key={t} active={selectedType === t} onClick={() => setSelectedType(t)}>
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </GhostButton>
          ))}
        </div>

        {/* Category filter chips */}
        <div className="flex items-center" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: 10, marginRight: 2 }}>Category</span>
          {categories.map((cat) => (
            <GhostButton
              key={cat}
              active={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </GhostButton>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedType('all');
              setDateFilter('');
              setCurrentPage(1);
            }}
            style={{ marginTop: 14, border: 0, background: 'transparent', cursor: 'pointer', fontFamily: FONT, fontSize: 13, fontWeight: 500, color: C.accent }}
          >
            Clear all filters
          </button>
        )}
      </Card>

      {/* Transaction list */}
      <Card style={{ marginTop: 24, overflow: 'hidden' }}>
        {displayedTransactions.length === 0 ? (
          <div style={{ padding: '28px 24px' }}>
            <EmptyState
              icon={Receipt}
              title={hasActiveFilters ? 'No matching transactions' : 'No transactions yet'}
              subtext={hasActiveFilters ? 'Try adjusting your filters or search.' : 'Add your first transaction to start tracking.'}
              action={
                <PrimaryButton onClick={() => setIsCreateModalOpen(true)}>
                  <Plus size={17} strokeWidth={2} />
                  Add Transaction
                </PrimaryButton>
              }
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ ...mono, fontSize: 10, textAlign: 'left', padding: '14px 24px' }}>Merchant</th>
                  <th style={{ ...mono, fontSize: 10, textAlign: 'left', padding: '14px 24px' }}>Category</th>
                  <th style={{ ...mono, fontSize: 10, textAlign: 'right', padding: '14px 24px' }}>Amount</th>
                  <th style={{ ...mono, fontSize: 10, textAlign: 'right', padding: '14px 24px', width: 96 }} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {displayedTransactions.map((transaction) => {
                  const isIncome = transaction.type === 'income';
                  const merchant = transaction.category || (isIncome ? 'Income' : 'Expense');
                  const initial = (merchant.trim()[0] || '?').toUpperCase();
                  const catColor = colorFor(transaction.category || transaction.type || 'tx');
                  const dateStr = new Date(transaction.date).toLocaleDateString();

                  return (
                    <tr
                      key={transaction.id}
                      className="ds-row"
                      style={{ borderBottom: `1px solid ${C.divider}`, transition: 'background 150ms' }}
                    >
                      <td style={{ padding: '12px 24px' }}>
                        <div className="flex items-center" style={{ gap: 12 }}>
                          <div
                            className="flex items-center justify-center"
                            style={{ width: 36, height: 36, borderRadius: 9, background: C.divider, color: C.ink2, fontSize: 14, fontWeight: 600, flexShrink: 0 }}
                            aria-hidden="true"
                          >
                            {initial}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 500, color: C.ink, whiteSpace: 'nowrap' }}>{merchant}</div>
                            <div style={{ fontSize: 12, color: C.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                              {transaction.description ? `${transaction.description} · ${dateStr}` : dateStr}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 24px' }}>
                        <span className="inline-flex items-center" style={{ gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: C.ink2 }}>{transaction.category}</span>
                        </span>
                      </td>
                      <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '-0.01em',
                            color: isIncome ? C.incomeText : C.ink,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isIncome ? '+' : '−'} {fmtMAD(transaction.amount)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                        <div className="flex items-center justify-end" style={{ gap: 4 }}>
                          <button
                            onClick={() => {
                              setEditingTransaction(transaction);
                              setIsCreateModalOpen(true);
                            }}
                            aria-label="Edit transaction"
                            className="ds-icon-btn flex items-center justify-center"
                            style={{ width: 32, height: 32, borderRadius: 8, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', transition: 'all 150ms' }}
                          >
                            <Edit size={15} strokeWidth={1.8} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setIsDeleteModalOpen(true);
                            }}
                            aria-label="Delete transaction"
                            className="ds-icon-btn ds-icon-danger flex items-center justify-center"
                            style={{ width: 32, height: 32, borderRadius: 8, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', transition: 'all 150ms' }}
                          >
                            <Trash2 size={15} strokeWidth={1.8} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {filteredTransactions.length > 0 && (
        <div className="flex items-center justify-between" style={{ marginTop: 18, gap: 16, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, color: C.muted }}>
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
          </p>

          <div className="flex items-center" style={{ gap: 8 }}>
            <GhostButton
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={currentPage === 1 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              Previous
            </GhostButton>

            <div className="flex" style={{ gap: 4 }}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                <GhostButton
                  key={page}
                  active={currentPage === page}
                  onClick={() => setCurrentPage(page)}
                  style={{ width: 38, justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}
                >
                  {page}
                </GhostButton>
              ))}
            </div>

            <GhostButton
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              style={currentPage === totalPages ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              Next
            </GhostButton>
          </div>
        </div>
      )}

      <style>{`
        .ds-icon-btn:hover{background:${C.divider};color:${C.ink};}
        .ds-icon-danger:hover{background:${C.overSoft};color:${C.over};}
        @media (max-width:640px){.tx-filters{grid-template-columns:minmax(0,1fr) !important;}}
      `}</style>

      {/* Modals */}
      <CreateTransactionModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (isSubmitting) return;
          setIsCreateModalOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleCreateTransaction}
        editingTransaction={editingTransaction}
        isLoading={isSubmitting}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedTransaction(null);
        }}
        onConfirm={handleDeleteTransaction}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
      />
    </Page>
  );
}
