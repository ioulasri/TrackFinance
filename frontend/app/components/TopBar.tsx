/**
 * Top app bar — shown above every authenticated page.
 *
 * Left:   current page icon + title (driven by route)
 * Center: ⌘K command palette button (opens jump-to-page list)
 * Right:  AI shortcut + avatar/streak chip
 *
 * The AI button dispatches a global `tf:open-ai` event that AIAssistant
 * listens for — keeps the two components decoupled.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, Wallet, Target, Trophy, Settings,
  LineChart, RotateCw, Search, Sparkles, Flame, ArrowRight,
} from 'lucide-react';
import { C, FONT, MONO } from './ds';

interface TopBarProps {
  user: {
    username?: string;
    avatar_url?: string;
    current_level?: number;
    current_streak?: number;
  } | null;
}

const ROUTE_META: Record<string, { title: string; subtitle?: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  '/dashboard':    { title: 'Dashboard',    subtitle: 'Overview',     icon: LayoutDashboard },
  '/transactions': { title: 'Transactions', subtitle: 'All activity', icon: Receipt },
  '/budgets':      { title: 'Budgets',      subtitle: 'Monthly caps', icon: Wallet },
  '/goals':        { title: 'Goals',        subtitle: 'Savings',      icon: Target },
  '/recurring':    { title: 'Recurring',    subtitle: 'Auto-posted',  icon: RotateCw },
  '/analysis':     { title: 'Analysis',     subtitle: 'Trends',       icon: LineChart },
  '/achievements': { title: 'Achievements', subtitle: 'Milestones',   icon: Trophy },
  '/settings':     { title: 'Settings',     subtitle: 'Preferences',  icon: Settings },
};

const PALETTE_ITEMS = Object.entries(ROUTE_META).map(([path, m]) => ({
  path,
  title: m.title,
  subtitle: m.subtitle,
  icon: m.icon,
}));

export function TopBar({ user }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);

  const meta = ROUTE_META[location.pathname] ?? { title: 'TrackFinance', icon: LayoutDashboard };
  const PageIcon = meta.icon;

  const initials = (user?.username || '??').substring(0, 2).toUpperCase();
  const streak = user?.current_streak ?? 0;

  // Global ⌘K / Ctrl-K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Reset palette state on close
  useEffect(() => {
    if (!paletteOpen) {
      setPaletteQuery('');
      setPaletteIndex(0);
    }
  }, [paletteOpen]);

  const filtered = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return PALETTE_ITEMS;
    return PALETTE_ITEMS.filter(i =>
      i.title.toLowerCase().includes(q) || (i.subtitle ?? '').toLowerCase().includes(q)
    );
  }, [paletteQuery]);

  const handleAIClick = () => {
    window.dispatchEvent(new Event('tf:open-ai'));
  };

  const handlePaletteSelect = (path: string) => {
    setPaletteOpen(false);
    navigate(path);
  };

  return (
    <>
      <header
        className="sticky top-0 z-20 flex items-center gap-5"
        style={{ height: 64, padding: '0 28px', background: C.card, borderBottom: `0.5px solid ${C.border}`, fontFamily: FONT, color: C.ink }}
      >
        {/* Page title */}
        <div className="flex flex-col min-w-0" style={{ gap: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{meta.title}</div>
          {meta.subtitle && (
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>{meta.subtitle}</div>
          )}
        </div>

        {/* Center — command palette trigger */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="relative mx-auto"
          style={{ flex: 1, maxWidth: 520, display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.paper, color: C.muted, cursor: 'pointer', fontFamily: FONT }}
          aria-label="Open command palette"
        >
          <Search size={16} className="shrink-0" />
          <span style={{ fontSize: 13 }}>Jump to…</span>
          <kbd style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, color: C.faint, border: `1px solid ${C.border}`, borderRadius: 5, padding: '2px 6px' }}>⌘K</kbd>
        </button>

        {/* Right — AI + avatar/streak chip */}
        <div className="flex items-center shrink-0" style={{ gap: 12 }}>
          <button
            type="button"
            onClick={handleAIClick}
            title="Ask AI"
            className="ds-primary inline-flex items-center"
            style={{ gap: 7, border: 0, borderRadius: 8, padding: '8px 13px', fontSize: 13, fontWeight: 500, color: '#fff', background: C.accent, cursor: 'pointer', fontFamily: FONT, transition: 'background 150ms' }}
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">Ask AI</span>
          </button>

          <div className="flex items-center" style={{ gap: 9, padding: '4px 10px 4px 4px', border: `1px solid ${C.border}`, borderRadius: 999 }}>
            <div className="flex items-center justify-center overflow-hidden shrink-0" style={{ width: 28, height: 28, borderRadius: '50%', background: C.ink, color: C.paper, fontSize: 11, fontWeight: 600 }}>
              {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : initials.toLowerCase()}
            </div>
            <span className="hidden md:inline" style={{ fontSize: 13, fontWeight: 500 }}>{user?.username ?? 'User'}</span>
            {streak > 0 && (
              <span className="inline-flex items-center" style={{ gap: 2, fontSize: 12, fontWeight: 600, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>
                <Flame size={12} />
                {streak}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Command palette modal */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4 bg-foreground/30 backdrop-blur-[2px]"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search size={16} className="text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Jump to a page…"
                value={paletteQuery}
                onChange={(e) => { setPaletteQuery(e.target.value); setPaletteIndex(0); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setPaletteIndex(i => Math.min(i + 1, filtered.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setPaletteIndex(i => Math.max(i - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const item = filtered[paletteIndex];
                    if (item) handlePaletteSelect(item.path);
                  }
                }}
                className="flex-1 bg-transparent border-0 outline-none text-base text-foreground placeholder:text-muted-foreground"
              />
              <kbd className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                Esc
              </kbd>
            </div>
            <ul className="max-h-80 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">No matches.</li>
              ) : (
                filtered.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = idx === paletteIndex;
                  return (
                    <li key={item.path}>
                      <button
                        type="button"
                        onClick={() => handlePaletteSelect(item.path)}
                        onMouseEnter={() => setPaletteIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                          ${isActive ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted/60'}`}
                      >
                        <Icon size={16} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{item.title}</div>
                          {item.subtitle && (
                            <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                          )}
                        </div>
                        {isActive && <ArrowRight size={14} className="text-primary" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
