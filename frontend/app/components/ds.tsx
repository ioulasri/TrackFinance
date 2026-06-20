import React from 'react';

/**
 * Shared design tokens + atoms for the authenticated app.
 * TrackFinance identity: warm paper, near-black ink, indigo accent, Inter +
 * IBM Plex Mono, with a concentric-ring motif. Landing/auth screens keep the
 * emerald theme — this is applied only inside the signed-in shell.
 */
export const C = {
  paper: '#FAFAF7',
  card: '#FFFFFF',
  ink: '#1A1815',
  ink2: '#2A2825',
  muted: '#888780',
  faint: '#B4B2A9',
  border: '#E5E2DA',
  divider: '#F0EDE5',
  grid: '#ECE9E1',
  accent: '#4F46E5',
  accentDark: '#4338CA',
  accentSoft: 'rgba(79,70,229,0.14)',
  income: '#5BA372',
  incomeText: '#3B7A4D',
  incomeSoft: 'rgba(91,163,114,0.12)',
  blue: '#3B82A3',
  gold: '#D4A845',
  purple: '#9C6FB0',
  over: '#C44545',
  overSoft: 'rgba(196,69,69,0.12)',
};

export const RAMP = [C.accent, C.income, C.gold, C.blue, C.purple, C.faint, '#C98A3B'];
export const FONT = "'Inter',-apple-system,system-ui,sans-serif";
export const MONO = "'IBM Plex Mono',monospace";

export const fmt = (n: number) => Math.round(n || 0).toLocaleString('en-US');
export const fmtMAD = (n: number) => `${fmt(n)} MAD`;
export const colorFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return RAMP[h % RAMP.length];
};

export const mono: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: C.muted,
  fontWeight: 500,
};

export const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
};

/** Page surface — sets font + ink for everything inside an authenticated page. */
export function Page({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontFamily: FONT, color: C.ink, ...style }}>{children}</div>;
}

/** Eyebrow + big title + optional right-aligned actions. */
export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between" style={{ gap: 16, flexWrap: 'wrap' }}>
      <div>
        <div style={mono}>{eyebrow}</div>
        <h1 style={{ margin: '8px 0 0', fontSize: 40, lineHeight: '44px', letterSpacing: '-0.025em', fontWeight: 600, color: C.ink }}>
          {title}
        </h1>
      </div>
      {actions}
    </div>
  );
}

export function Card({
  children,
  style,
  className,
  accent,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  accent?: string;
}) {
  return (
    <div className={className} style={{ ...cardStyle, ...(accent ? { borderLeft: `3px solid ${accent}` } : {}), ...style }}>
      {children}
    </div>
  );
}

export function MonoLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...mono, ...style }}>{children}</div>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

/** Solid indigo primary button. */
export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="ds-primary inline-flex items-center justify-center"
      style={{
        gap: 7,
        border: 0,
        borderRadius: 8,
        padding: '9px 15px',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: FONT,
        color: '#fff',
        background: C.accent,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background 150ms',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  active,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      className="ds-ghost inline-flex items-center"
      style={{
        gap: 7,
        border: `1px solid ${active ? C.ink : C.border}`,
        background: active ? C.ink : C.card,
        color: active ? C.paper : C.ink2,
        borderRadius: 7,
        padding: '6px 12px',
        fontSize: 12.5,
        fontWeight: 500,
        fontFamily: FONT,
        cursor: 'pointer',
        transition: 'all 150ms',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'pos' | 'neg' | 'neutral';
}) {
  const map = {
    pos: { color: C.incomeText, background: C.incomeSoft },
    neg: { color: C.over, background: C.overSoft },
    neutral: { color: C.ink, background: C.divider },
  }[tone];
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: 5, fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em', padding: '3px 8px', borderRadius: 6, ...map }}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  subtext,
  action,
  height = 220,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  subtext?: string;
  action?: React.ReactNode;
  height?: number;
}) {
  return (
    <div style={{ minHeight: height }} className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 13, border: `1px solid ${C.border}`, background: C.card, color: C.faint }}>
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginTop: 6 }}>{title}</p>
      {subtext && <p style={{ fontSize: 13, color: C.muted, maxWidth: 320 }}>{subtext}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

/** Hover styles for ds buttons/rows — mount once per page. */
export function DSStyles() {
  return (
    <style>{`
      .ds-primary:hover:not(:disabled){background:${C.accentDark} !important;}
      .ds-ghost:hover{border-color:${C.faint};}
      .ds-row:hover{background:${C.paper};}
      .ds-card-hover:hover{border-color:#D8D4C9;}
    `}</style>
  );
}
