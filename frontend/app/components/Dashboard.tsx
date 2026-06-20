import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Flame,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { authAPI, transactionAPI } from '../api';

// ── Palette (from the TrackFinance design mockup; matches Sidebar.tsx) ──────
const C = {
  paper: '#FAFAF7',
  card: '#FFFFFF',
  ink: '#1A1815',
  ink2: '#2A2825',
  muted: '#888780',
  faint: '#B4B2A9',
  border: '#E5E2DA',
  divider: '#F0EDE5',
  grid: '#ECE9E1',
  accent: '#E97B47',
  accentSoft: 'rgba(233,123,71,0.14)',
  income: '#5BA372',
  incomeText: '#3B7A4D',
  incomeSoft: 'rgba(91,163,114,0.12)',
  blue: '#3B82A3',
  gold: '#D4A845',
  over: '#C44545',
};
const DONUT_RAMP = [C.accent, C.blue, C.income, C.gold, C.faint, '#9C6FB0', '#C98A3B'];
const FONT = "'Inter',-apple-system,system-ui,sans-serif";
const MONO = "'IBM Plex Mono',monospace";

const fmt = (n: number) => Math.round(n || 0).toLocaleString('en-US');

const mono: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: C.muted,
  fontWeight: 500,
};

function EmptyState({
  icon: Icon,
  title,
  subtext,
  height = 200,
}: {
  icon: typeof TrendingUp;
  title: string;
  subtext?: string;
  height?: number;
}) {
  return (
    <div style={{ minHeight: height }} className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <div className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 11, border: `1px solid ${C.border}`, color: C.faint }}>
        <Icon size={20} strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 500, color: C.ink2 }}>{title}</p>
      {subtext && <p style={{ fontSize: 12.5, color: C.muted }}>{subtext}</p>}
    </div>
  );
}

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [range, setRange] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, txRes] = await Promise.all([
          authAPI.getUserStats(),
          transactionAPI.list(0, 1000),
        ]);
        setStats(statsRes.data);
        setTransactions(txRes.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  // ── Bucket transactions into the selected window (real data only) ─────────
  const buildSeries = (offsetWindows: number) => {
    const today = startOfDay(new Date());
    const buckets: { label: string; income: number; expense: number }[] = [];
    const span = range === '7d' ? 7 : 4;
    const stepDays = range === '7d' ? 1 : 7;

    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i * stepDays - offsetWindows * span * stepDays);
      buckets.push({
        label: range === '7d' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] : `Wk ${span - i}`,
        income: 0,
        expense: 0,
      });
    }
    const windowStart = new Date(today);
    windowStart.setDate(today.getDate() - (span * stepDays - 1) - offsetWindows * span * stepDays);

    transactions.forEach((t) => {
      const td = startOfDay(new Date(t.date));
      const days = Math.round((td.getTime() - windowStart.getTime()) / 86400000);
      const idx = Math.floor(days / stepDays);
      if (idx >= 0 && idx < span) {
        const amt = parseFloat(t.amount || 0);
        if (t.type === 'income') buckets[idx].income += amt;
        else if (t.type === 'expense') buckets[idx].expense += amt;
      }
    });

    const income = buckets.reduce((s, b) => s + b.income, 0);
    const expense = buckets.reduce((s, b) => s + b.expense, 0);
    return { buckets, income, expense };
  };

  const cur = useMemo(() => buildSeries(0), [transactions, range]);
  const prev = useMemo(() => buildSeries(1), [transactions, range]);
  const net = cur.income - cur.expense;
  const hasData = cur.income > 0 || cur.expense > 0;

  let run = 0;
  const sparkData = cur.buckets.map((b) => {
    run += b.income - b.expense;
    return { label: b.label, value: run };
  });

  const pctDelta = (c: number, p: number) => (p > 0 ? ((c - p) / p) * 100 : null);
  const incomeDelta = pctDelta(cur.income, prev.income);
  const expenseDelta = pctDelta(cur.expense, prev.expense);

  // Category breakdown for the window (expenses), real categories.
  const categories = useMemo(() => {
    const today = startOfDay(new Date());
    const windowStart = new Date(today);
    windowStart.setDate(today.getDate() - (range === '7d' ? 6 : 27));
    const catMap: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.type !== 'expense') return;
      if (startOfDay(new Date(t.date)) < windowStart) return;
      catMap[t.category] = (catMap[t.category] || 0) + parseFloat(t.amount || 0);
    });
    const total = Object.values(catMap).reduce((s, v) => s + v, 0);
    return {
      total,
      list: Object.entries(catMap)
        .map(([name, amount], i) => ({
          name,
          amount,
          pct: total > 0 ? Math.round((amount / total) * 100) : 0,
          color: DONUT_RAMP[i % DONUT_RAMP.length],
        }))
        .sort((a, b) => b.amount - a.amount),
    };
  }, [transactions, range]);

  const level = stats?.current_level ?? 0;
  const totalXp = stats?.total_xp ?? 0;
  const streak = stats?.current_streak ?? 0;
  const username: string = stats?.username || 'you';

  const tooltipStyle = {
    background: C.ink,
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    color: C.paper,
    boxShadow: '0 8px 24px rgba(26,24,21,0.18)',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 384, fontFamily: FONT }}>
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full" style={{ border: `2px solid ${C.border}`, borderBottomColor: C.accent }} />
          <p className="mt-4" style={{ fontSize: 13, color: C.muted }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const cardBase: React.CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 };
  const deltaBadge = (delta: number | null, good: boolean) =>
    delta === null ? null : (
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em', padding: '3px 8px', borderRadius: 6, color: good ? C.incomeText : C.over, background: good ? C.incomeSoft : 'rgba(196,69,69,0.12)' }}>
        {delta >= 0 ? '+' : '−'}
        {Math.abs(delta).toFixed(1)}%
      </span>
    );

  return (
    <div style={{ fontFamily: FONT, color: C.ink }}>
      <style>{`@media (max-width:1024px){.dash-row{grid-template-columns:minmax(0,1fr) !important;}}`}</style>

      <div style={mono}>Welcome back, {username}</div>
      <h1 style={{ margin: '8px 0 0', fontSize: 40, lineHeight: '44px', letterSpacing: '-0.025em', fontWeight: 600, color: C.ink }}>
        Your money, today.
      </h1>

      {/* ROW 1 — hero + income/expense */}
      <div className="dash-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 352px', gap: 24, marginTop: 26 }}>
        <div style={{ ...cardBase, position: 'relative', overflow: 'hidden', padding: '26px 28px', minHeight: 300, display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-start justify-between" style={{ gap: 16 }}>
            <div>
              <div style={mono}>Net balance</div>
              <div style={{ marginTop: 12, fontSize: 56, lineHeight: 1, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(net)} <span style={{ fontSize: 24, fontWeight: 500, color: C.muted, letterSpacing: 0 }}>MAD</span>
              </div>
              <div className="flex items-center" style={{ marginTop: 16, gap: 14 }}>
                <span style={{ fontSize: 13, color: C.muted }}>Level <b style={{ color: C.ink, fontWeight: 600 }}>{level}</b></span>
                <span style={{ width: 1, height: 13, background: C.border }}></span>
                <span style={{ fontSize: 13, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalXp)} XP total</span>
              </div>
            </div>
            <div className="flex flex-col items-end" style={{ gap: 8 }}>
              {hasData && (
                <span className="inline-flex items-center" style={{ gap: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, color: net >= 0 ? C.incomeText : C.over, background: net >= 0 ? 'rgba(91,163,114,0.14)' : 'rgba(196,69,69,0.12)', border: `1px solid ${net >= 0 ? 'rgba(91,163,114,0.32)' : 'rgba(196,69,69,0.3)'}`, borderRadius: 6, padding: '4px 9px' }}>
                  {net >= 0 ? <TrendingUp size={13} strokeWidth={2} /> : <TrendingDown size={13} strokeWidth={2} />}
                  {net >= 0 ? '+' : '−'}
                  {fmt(Math.abs(net))} net
                </span>
              )}
              {streak > 0 && (
                <span className="inline-flex items-center" style={{ gap: 6, fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, color: C.ink, background: C.divider, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 9px' }}>
                  <Flame size={12} strokeWidth={1.8} style={{ color: C.accent }} />
                  {streak}-day streak
                </span>
              )}
            </div>
          </div>
          <div style={{ flex: 1 }}></div>
          {hasData ? (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tfSpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${fmt(v)} MAD`, 'Net']} labelStyle={{ color: C.faint }} cursor={false} />
                  <Area type="monotone" dataKey="value" stroke={C.accent} strokeWidth={2.5} fill="url(#tfSpark)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={TrendingUp} title="No activity yet" subtext="Add a transaction to see your trend" height={120} />
          )}
        </div>

        <div className="flex flex-col" style={{ gap: 24 }}>
          <div style={{ ...cardBase, flex: 1, borderLeft: `3px solid ${C.income}`, padding: '20px 22px' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 8, background: C.incomeSoft, color: C.income }}>
                <TrendingUp size={19} strokeWidth={1.7} />
              </div>
              {deltaBadge(incomeDelta, (incomeDelta ?? 0) >= 0)}
            </div>
            <div style={{ ...mono, fontSize: 10, marginTop: 16 }}>Income</div>
            <div style={{ marginTop: 7, fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {fmt(cur.income)} <span style={{ fontSize: 15, color: C.muted, fontWeight: 500 }}>MAD</span>
            </div>
          </div>
          <div style={{ ...cardBase, flex: 1, borderLeft: `3px solid ${C.accent}`, padding: '20px 22px' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 8, background: C.accentSoft, color: C.accent }}>
                <TrendingDown size={19} strokeWidth={1.7} />
              </div>
              {deltaBadge(expenseDelta, (expenseDelta ?? 0) <= 0)}
            </div>
            <div style={{ ...mono, fontSize: 10, marginTop: 16 }}>Expenses</div>
            <div style={{ marginTop: 7, fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {fmt(cur.expense)} <span style={{ fontSize: 15, color: C.muted, fontWeight: 500 }}>MAD</span>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2 — balance chart + donut */}
      <div className="dash-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 352px', gap: 24, marginTop: 24 }}>
        <div style={{ ...cardBase, padding: '24px 26px' }}>
          <div className="flex items-start justify-between">
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em' }}>Balance overview</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>Income against spending</div>
            </div>
            <div className="flex" style={{ gap: 3, background: C.divider, borderRadius: 8, padding: 3 }}>
              {(['7d', '30d'] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} style={{ border: 0, borderRadius: 6, padding: '5px 13px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', background: range === r ? C.card : 'transparent', color: range === r ? C.ink : C.muted, boxShadow: range === r ? '0 1px 2px rgba(26,24,21,0.10)' : 'none' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {hasData ? (
            <>
              <div style={{ marginTop: 24, height: 248 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cur.buckets} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={5}>
                    <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="4 4" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11.5, fill: C.muted }} />
                    <YAxis axisLine={false} tickLine={false} width={42} tick={{ fontSize: 10, fill: C.faint, fontFamily: MONO }} tickFormatter={(v: number) => fmt(v)} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,24,21,0.04)' }} formatter={(v: number, n: string) => [`${fmt(v)} MAD`, n === 'income' ? 'In' : 'Out']} labelStyle={{ color: C.faint }} />
                    <Bar dataKey="income" fill={C.income} radius={[5, 5, 0, 0]} maxBarSize={16} />
                    <Bar dataKey="expense" fill={C.blue} radius={[5, 5, 0, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center" style={{ gap: 26, marginTop: 18, paddingTop: 16, borderTop: `0.5px solid ${C.border}` }}>
                <span className="inline-flex items-center" style={{ gap: 8, fontSize: 13, color: C.ink2 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: C.income }}></span>Income
                </span>
                <span className="inline-flex items-center" style={{ gap: 8, fontSize: 13, color: C.ink2 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: C.blue }}></span>Expenses
                </span>
              </div>
            </>
          ) : (
            <EmptyState icon={BarChart3} title="No transactions in this range" subtext="Income and spending will chart here" height={248} />
          )}
        </div>

        <div style={{ ...cardBase, padding: '24px 26px' }}>
          <div className="flex items-start justify-between">
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em' }}>Cost analysis</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>Top spending categories</div>
            </div>
            <div className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, color: C.muted }}>
              <PieChartIcon size={17} strokeWidth={1.5} />
            </div>
          </div>

          {categories.list.length > 0 ? (
            <>
              <div style={{ position: 'relative', width: 188, height: 188, margin: '18px auto 4px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories.list} dataKey="amount" nameKey="name" innerRadius={62} outerRadius={80} paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
                      {categories.list.map((c2) => (
                        <Cell key={c2.name} fill={c2.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${fmt(v)} MAD`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ ...mono, fontSize: 10 }}>Total</div>
                  <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{fmt(categories.total)}</div>
                  <div style={{ fontSize: 11, color: C.faint }}>MAD</div>
                </div>
              </div>
              <div className="flex flex-col" style={{ gap: 1, marginTop: 14 }}>
                {categories.list.map((c2, i) => (
                  <div key={c2.name} className="flex items-center" style={{ gap: 10, padding: '7px 0', borderBottom: i < categories.list.length - 1 ? `0.5px solid ${C.divider}` : 'none' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: c2.color }}></span>
                    <span style={{ flex: 1, fontSize: 13 }}>{c2.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmt(c2.amount)}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted, width: 34, textAlign: 'right' }}>{c2.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={PieChartIcon} title="No expenses yet" subtext="Spending breaks down by category here" height={240} />
          )}
        </div>
      </div>
    </div>
  );
}
