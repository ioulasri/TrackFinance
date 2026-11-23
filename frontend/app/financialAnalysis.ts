/** Derived only from recorded transactions. No demo balances or AI confidence claims. */
export function analyzeTransactions(transactions: any[], budgets: any[], today = new Date()) {
  const entries = transactions.filter(t => !t.is_deleted && Number.isFinite(Number(t.amount)) && !Number.isNaN(new Date(t.date).getTime()));
  const total = (items: any[], type: string) => items.filter(t => t.type === type).reduce((sum, t) => sum + Number(t.amount), 0);
  const inMonth = (year: number, month: number) => {
    const start = new Date(year, month, 1), end = new Date(year, month + 1, 1);
    return entries.filter(t => new Date(t.date) >= start && new Date(t.date) < end && new Date(t.date) <= today);
  };
  const current = inMonth(today.getFullYear(), today.getMonth());
  const previous = inMonth(today.getFullYear(), today.getMonth() - 1);
  const income = total(current, 'income'), spending = total(current, 'expense'), priorSpending = total(previous, 'expense');
  const change = priorSpending > 0 ? (spending - priorSpending) / priorSpending * 100 : null;
  const savings = income > 0 ? (income - spending) / income * 100 : null;
  const group = (items: any[]) => {
    const result: Record<string, number> = {};
    items.filter(t => t.type === 'expense').forEach(t => { result[t.category] = (result[t.category] || 0) + Number(t.amount); });
    return result;
  };
  const categories = group(current), previousCategories = group(previous);
  const trend = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
    const items = inMonth(date.getFullYear(), date.getMonth());
    return { month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), income: total(items, 'income'), spending: total(items, 'expense'), count: items.length };
  });
  const completed = trend.slice(0, -1).filter(m => m.count > 0);
  const canForecast = completed.length >= 3;
  const observedMonths = trend.filter(m => m.count > 0).length;
  const health = savings !== null && previous.length > 0 && change !== null
    ? Math.min(100, Math.max(0, Math.round(50 + Math.min(30, savings * 1.5) - Math.max(-20, Math.min(20, change))))) : null;
  const insights: { type: 'warning' | 'success' | 'info'; title: string; description: string }[] = [];
  if (savings !== null) insights.push({ type: savings >= 20 ? 'success' : 'warning', title: 'Recorded savings rate', description: `You retained ${savings.toFixed(1)}% of your recorded income this month.` });
  if (change !== null) insights.push({ type: change <= 0 ? 'success' : 'info', title: 'Spending comparison', description: `Recorded spending is ${Math.abs(change).toFixed(1)}% ${change <= 0 ? 'lower' : 'higher'} than last month.` });
  return {
    transaction_count: entries.length,
    months_observed: observedMonths,
    financial_health_score: health,
    spending_trend: trend,
    category_breakdown: Object.entries(categories).map(([category, amount]) => ({ category, amount, percentage: spending > 0 ? amount / spending * 100 : 0 })),
    savings_rate: savings,
    net_worth: entries.reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0),
    monthly_comparison: { current_month: spending, previous_month: priorSpending, change_percentage: change },
    top_categories: Object.entries(categories).sort((a,b) => b[1] - a[1]).slice(0,3).map(([category, amount]) => ({ category, amount, trend: (amount > (previousCategories[category] || 0) ? 'up' : amount < (previousCategories[category] || 0) ? 'down' : 'stable') as 'up' | 'down' | 'stable' })),
    insights,
    predictions: {
      next_month_spending: canForecast ? completed.slice(-3).reduce((sum,m) => sum + m.spending,0) / 3 : null,
      next_month_income: canForecast ? completed.slice(-3).reduce((sum,m) => sum + m.income,0) / 3 : null,
    },
    budget_performance: budgets.map(b => ({ category: b.category, budget: Number(b.monthly_limit), spent: categories[b.category] || 0, percentage: Number(b.monthly_limit) > 0 ? (categories[b.category] || 0) / Number(b.monthly_limit) * 100 : 0 })),
  };
}
