import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Edit, Trash2, ShoppingCart, Coffee, Car, Home, Smartphone, Utensils, Film, Heart, Briefcase, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from './Button';
import { CreateTransactionModal } from './CreateTransactionModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { transactionAPI } from '../api';

const iconMap: Record<string, any> = {
  Shopping: ShoppingCart,
  Food: Coffee,
  Transport: Car,
  Bills: Home,
  Entertainment: Film,
  Health: Heart,
  Salary: ArrowUpRight,
  Freelance: Briefcase,
  Electronics: Smartphone,
  Dining: Utensils,
};

export function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
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
    try {
      if (editingTransaction) {
        // Only include changed fields in the update
        const updatePayload: any = {
          amount: parseFloat(data.amount),
          category: data.category,
          type: data.type,
          description: data.description,
        };

        // Only include date if it changed
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
    } catch (error) {
      console.error('Failed to create/update transaction:', error);
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

    return matchesSearch && matchesCategory && matchesType;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const categories = ['all', ...Array.from(new Set(transactions.map(t => t.category)))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">Track and manage all your transactions</p>
        </div>
        <Button variant="primary" size="large" onClick={() => setIsCreateModalOpen(true)} className="shadow-sm">
          <Plus size={20} className="mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Filter Panel */}
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <div className="grid grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all appearance-none text-sm cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <div className="flex gap-1.5 p-1 bg-muted rounded-lg border border-border">
            <button
              onClick={() => setSelectedType('all')}
              className={`flex-1 px-4 py-1.5 rounded-md font-medium text-sm transition-all duration-200 ${selectedType === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedType('income')}
              className={`flex-1 px-4 py-1.5 rounded-md font-medium text-sm transition-all duration-200 ${selectedType === 'income'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Income
            </button>
            <button
              onClick={() => setSelectedType('expense')}
              className={`flex-1 px-4 py-1.5 rounded-md font-medium text-sm transition-all duration-200 ${selectedType === 'expense'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Expense
            </button>
          </div>

          {/* Date Range */}
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors" size={18} />
            <input
              type="date"
              className="w-full pl-11 pr-4 py-2.5 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm cursor-pointer"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {(searchQuery || selectedCategory !== 'all' || selectedType !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedType('all');
            }}
            className="mt-4 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Transaction List */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Type
                </th>
                <th className="px-6 py-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Category
                </th>
                <th className="px-6 py-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Description
                </th>
                <th className="px-6 py-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Date
                </th>
                <th className="px-6 py-5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Amount
                </th>
                <th className="px-6 py-5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {displayedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-muted-foreground">No transactions found</p>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-2 text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Create your first transaction
                    </button>
                  </td>
                </tr>
              ) : (
                displayedTransactions.map((transaction) => {
                  const Icon = iconMap[transaction.category] || (transaction.type === 'income' ? ArrowUpRight : ArrowDownRight);
                  const isIncome = transaction.type === 'income';

                  return (
                    <tr key={transaction.id} className="hover:bg-muted/50 transition-colors duration-200 group border-b border-border/50 last:border-0">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wider uppercase ${isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-secondary text-foreground'
                          }`}>
                          <Icon size={14} />
                          <span>{transaction.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-foreground">{transaction.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">{transaction.description}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {new Date(transaction.date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-semibold tabular-nums tracking-tight ${isIncome ? 'text-emerald-600' : 'text-foreground'
                          }`}>
                          {isIncome ? '+' : '-'} MAD {transaction.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingTransaction(transaction);
                              setIsCreateModalOpen(true);
                            }}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredTransactions.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-border bg-card rounded-lg text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${currentPage === page
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-border bg-card rounded-lg text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateTransactionModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleCreateTransaction}
        editingTransaction={editingTransaction}
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
    </div>
  );
}
