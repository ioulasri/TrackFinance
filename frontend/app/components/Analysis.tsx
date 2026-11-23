import { analyzeTransactions } from '../financialAnalysis';
import { useCurrency, useFinanceRefresh } from '../currency';
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  Target,
  Zap,
  Sparkles,
  Wallet,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { transactionAPI, budgetAPI } from '../api';
import {
  C,
  FONT,
  MONO,
  fmt,
  colorFor,
  mono,
  Page,
  PageHeader,
  Card,
  SectionTitle,
  PrimaryButton,
  EmptyState,
  DSStyles,
} from './ds';

type AnalysisData = ReturnType<typeof analyzeTransactions>;

export function Analysis() {
  const { currency, formatMoney } = useCurrency();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalysis();
  }, []);

  useFinanceRefresh(() => { loadAnalysis(); });

  const loadAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [transactionsRes, budgetsRes] = await Promise.all([
        transactionAPI.listAll(),
        budgetAPI.list(),
      ]);

      const transactions = transactionsRes.data;
      const budgets = budgetsRes.data;

      const processedData = analyzeTransactions(transactions, budgets);
      setAnalysisData(processedData);
    } catch (err) {
      console.error('Failed to load analysis:', err);
      setError('Failed to load financial data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const tooltipStyle = {
    background: C.ink,
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    color: C.paper,
    boxShadow: '0 8px 24px rgba(26,24,21,0.18)',
  };

  if (isLoading) {
    return (
      <Page>
        <DSStyles />
        <div className="flex items-center justify-center" style={{ minHeight: 600 }}>
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full" style={{ border: `2px solid ${C.border}`, borderBottomColor: C.accent }} />
            <p className="mt-4" style={{ fontSize: 13, color: C.muted }}>Loading analysis…</p>
          </div>
        </div>
      </Page>
    );
  }

  if (!analysisData) {
    return (
      <Page>
        <DSStyles />
        <PageHeader eyebrow="Insights" title="Analysis" />
        <Card style={{ marginTop: 26, padding: '32px 28px' }}>
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load analysis"
            subtext={error || 'Something went wrong while reading your financial data.'}
            action={<PrimaryButton onClick={loadAnalysis}>Try again</PrimaryButton>}
            height={220}
          />
        </Card>
      </Page>
    );
  }

  const {
    financial_health_score,
    spending_trend = [],
    category_breakdown = [],
    savings_rate,
    monthly_comparison,
    budget_performance = [],
    insights = [],
    predictions,
    net_worth
  } = analysisData;

  const getScoreColor = (score: number) => {
    if (score >= 80) return C.income;
    if (score >= 50) return C.gold;
    return C.over;
  };
  const scoreColor = financial_health_score === null ? C.faint : getScoreColor(financial_health_score);

  const insightTone = (type: string) => {
    if (type === 'success') return { color: C.incomeText, bg: C.incomeSoft, Icon: CheckCircle };
    if (type === 'warning') return { color: C.over, bg: C.overSoft, Icon: AlertCircle };
    return { color: C.blue, bg: 'rgba(59,130,163,0.12)', Icon: Info };
  };

  const cardBase: React.CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 };

  const trendHasData = spending_trend.some(m => m.income > 0 || m.spending > 0);

  const metrics = [
    {
      title: 'Current Month',
      value: formatMoney(monthly_comparison.current_month),
      trend: monthly_comparison.change_percentage,
      icon: DollarSign,
      color: monthly_comparison.change_percentage > 0 ? C.over : C.incomeText,
      bg: monthly_comparison.change_percentage > 0 ? C.overSoft : C.incomeSoft,
      suffix: 'vs last month',
    },
    {
      title: 'Spending Estimate',
      value: predictions.next_month_spending === null ? '—' : formatMoney(predictions.next_month_spending),
      trend: null,
      icon: Activity,
      color: C.accent,
      bg: C.accentSoft,
      suffix: predictions.next_month_spending === null ? 'Needs 3 completed months with activity' : 'Average of 3 recorded months',
    },
    {
      title: 'Savings Rate',
      value: savings_rate === null ? '—' : `${savings_rate.toFixed(1)}%`,
      trend: null,
      icon: Target,
      color: (savings_rate ?? -1) >= 20 ? C.incomeText : C.gold,
      bg: (savings_rate ?? -1) >= 20 ? C.incomeSoft : 'rgba(212,168,69,0.14)',
      suffix: 'Target: >20%',
    },
    {
      title: 'Recorded Balance',
      value: formatMoney(net_worth),
      trend: null,
      icon: Wallet,
      color: C.blue,
      bg: 'rgba(59,130,163,0.12)',
      suffix: 'Recorded income minus expenses',
    },
  ];

  return (
    <Page>
      <DSStyles />
      <style>{`@media (max-width:1024px){.an-row{grid-template-columns:minmax(0,1fr) !important;}.an-metrics{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}}@media (max-width:560px){.an-metrics{grid-template-columns:minmax(0,1fr) !important;}}`}</style>

      <PageHeader
        eyebrow="Insights"
        title="Analysis"
        actions={
          <span className="inline-flex items-center" style={{ gap: 8, ...mono, fontSize: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: C.income }} />
            {analysisData.months_observed} months with activity
          </span>
        }
      />

      {analysisData.transaction_count === 0 && (
        <Card style={{ marginTop: 24, padding: 24 }}>
          <EmptyState icon={Wallet} title="No financial data yet" subtext="Add an income or expense to see your recorded balance and spending. Scores and forecasts need more history." />
        </Card>
      )}

      {/* Top Section: Health Score & Insights */}
      <div className="an-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 2fr', gap: 24, marginTop: 26 }}>
        {/* Health Score Card */}
        <div style={{ ...cardBase, padding: '28px 26px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...mono, fontSize: 11, marginBottom: 22 }}>Recorded Health Score</div>

          <div style={{ position: 'relative', width: 188, height: 188, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }} width="188" height="188" viewBox="0 0 192 192">
              <circle cx="96" cy="96" r="88" fill="none" stroke={C.divider} strokeWidth="8" />
              <circle
                cx="96" cy="96" r="88" fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${((financial_health_score ?? 0) / 100) * 553} 553`}
                style={{ transition: 'stroke-dasharray 1s ease-out' }}
              />
            </svg>
            <div className="text-center">
              <span style={{ fontSize: 52, fontWeight: 600, letterSpacing: '-0.03em', color: scoreColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{financial_health_score ?? '—'}</span>
              <div style={{ ...mono, fontSize: 10, marginTop: 6 }}>Out of 100</div>
            </div>
          </div>

          <p style={{ marginTop: 24, fontSize: 13, color: C.muted, textAlign: 'center', maxWidth: 240 }}>
            Based on recorded savings and spending changes. A score needs income and two months of activity.
          </p>
        </div>

        {/* Insights Panel */}
        <div style={{ ...cardBase, padding: '24px 26px', display: 'flex', flexDirection: 'column' }}>
          <SectionTitle title="Spending Insights" subtitle="Signals from your recent activity" />

          <div className="flex flex-col" style={{ gap: 12, marginTop: 18, flex: 1 }}>
            {insights.length > 0 ? insights.map((insight, idx) => {
              const { color, bg, Icon } = insightTone(insight.type);
              return (
                <div key={idx} style={{ padding: '16px 18px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.paper }}>
                  <div className="flex" style={{ gap: 14 }}>
                    <div className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 8, background: bg, color, flexShrink: 0 }}>
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14.5, fontWeight: 600, color: C.ink, marginBottom: 3 }}>{insight.title}</h4>
                      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{insight.description}</p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <EmptyState icon={Sparkles} title="No insights yet" subtext="Add transactions to surface trends and signals" height={200} />
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="an-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 16, marginTop: 24 }}>
        {metrics.map((metric, idx) => (
          <div key={idx} style={{ ...cardBase, padding: '20px 22px' }}>
            <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
              <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 9, background: metric.bg, color: metric.color }}>
                <metric.icon size={19} strokeWidth={1.7} />
              </div>
              {metric.trend !== null && (
                <span
                  className="inline-flex items-center"
                  style={{
                    gap: 4,
                    fontFamily: MONO,
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    padding: '3px 8px',
                    borderRadius: 6,
                    color: metric.trend > 0 ? (metric.title === 'Est. Net Worth' ? C.incomeText : C.over) : C.incomeText,
                    background: metric.trend > 0 ? (metric.title === 'Est. Net Worth' ? C.incomeSoft : C.overSoft) : C.incomeSoft,
                  }}
                >
                  {metric.trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(metric.trend)}%
                </span>
              )}
            </div>
            <div style={{ ...mono, fontSize: 10 }}>{metric.title}</div>
            <div style={{ marginTop: 7, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{metric.value}</div>
            <p style={{ marginTop: 6, fontSize: 12, color: C.muted }}>{metric.suffix}</p>
          </div>
        ))}
      </div>

      {/* Main Charts area */}
      <div className="an-row" style={{ display: 'grid', gridTemplateColumns: '2fr minmax(0,1fr)', gap: 24, marginTop: 24 }}>
        {/* Trend Chart (wider) */}
        <div style={{ ...cardBase, padding: '24px 26px' }}>
          <div className="flex items-start justify-between">
            <SectionTitle title="Cash Flow Trajectory" subtitle="Income against spending over 6 months" />
            <div className="flex items-center" style={{ gap: 18 }}>
              <span className="inline-flex items-center" style={{ gap: 8, fontSize: 13, color: C.ink2 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: C.income }} />Income
              </span>
              <span className="inline-flex items-center" style={{ gap: 8, fontSize: 13, color: C.ink2 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: C.accent }} />Spending
              </span>
            </div>
          </div>

          {trendHasData ? (
            <div style={{ marginTop: 24, height: 300, width: '100%' }} aria-label="Cash flow trajectory chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spending_trend} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="anIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.income} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={C.income} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="anSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="4 4" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11.5, fill: C.muted }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} width={50} tick={{ fontSize: 10, fill: C.faint, fontFamily: MONO }} tickFormatter={(v: number) => fmt(v)} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: C.border }} formatter={(v: number, n: string) => [`${fmt(v)} ${currency}`, n === 'income' ? 'Income' : 'Spending']} labelStyle={{ color: C.faint }} />
                  <Area type="monotone" dataKey="income" stroke={C.income} strokeWidth={2.5} fillOpacity={1} fill="url(#anIncome)" activeDot={{ r: 5, strokeWidth: 0, fill: C.income }} />
                  <Area type="monotone" dataKey="spending" stroke={C.accent} strokeWidth={2.5} fillOpacity={1} fill="url(#anSpend)" activeDot={{ r: 5, strokeWidth: 0, fill: C.accent }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={BarChart3} title="No cash flow yet" subtext="Income and spending will chart here" height={300} />
          )}
        </div>

        {/* Budget Performance */}
        <div style={{ ...cardBase, padding: '24px 26px', display: 'flex', flexDirection: 'column' }}>
          <SectionTitle title="Budget Velocity" subtitle="Spent against monthly limits" />

          <div className="flex flex-col" style={{ gap: 18, marginTop: 20, flex: 1 }}>
            {budget_performance.length > 0 ? budget_performance.map((item, idx) => {
              const barColor = item.percentage > 100 ? C.over : item.percentage > 80 ? C.gold : C.income;
              const pillColor = item.percentage > 100 ? C.over : item.percentage > 80 ? C.gold : C.incomeText;
              const pillBg = item.percentage > 100 ? C.overSoft : item.percentage > 80 ? 'rgba(212,168,69,0.14)' : C.incomeSoft;
              return (
                <div key={idx}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{item.category}</span>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span style={{ fontSize: 12, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(item.spent)} / {fmt(item.budget)}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: '0.02em', padding: '2px 7px', borderRadius: 6, color: pillColor, background: pillBg }}>
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 6, background: C.divider, borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(item.percentage, 100)}%`, background: barColor, borderRadius: 999, transition: 'width 1s ease-out' }} />
                  </div>
                </div>
              );
            }) : (
              <EmptyState icon={Target} title="No budgets yet" subtext="Set budgets to track velocity here" height={200} />
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
