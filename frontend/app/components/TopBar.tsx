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
      <header className="sticky top-0 z-20 h-14 bg-card/95 backdrop-blur-sm border-b border-border flex items-center px-4 gap-4">
        {/* Page title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
            <PageIcon size={16} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground leading-tight">{meta.title}</div>
            {meta.subtitle && (
              <div className="text-[11px] text-muted-foreground leading-tight">{meta.subtitle}</div>
            )}
          </div>
        </div>

        {/* Center — command palette trigger */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex-1 max-w-md mx-auto h-9 flex items-center gap-2 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open command palette"
        >
          <Search size={14} className="shrink-0" />
          <span className="text-sm">Jump to…</span>
          <kbd className="ml-auto text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
            ⌘K
          </kbd>
        </button>

        {/* Right — AI + avatar/streak chip */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAIClick}
            title="Ask AI"
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card hover:bg-primary/5 hover:border-primary/30 text-foreground transition-colors group"
          >
            <Sparkles size={14} className="text-primary group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium hidden sm:inline">Ask AI</span>
          </button>

          <div className="flex items-center gap-2 h-9 pl-1 pr-3 rounded-lg border border-border bg-card">
            <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold overflow-hidden shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <span className="text-sm font-medium text-foreground hidden md:inline">{user?.username ?? 'User'}</span>
            {streak > 0 && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600 dark:text-amber-500 tabular-nums">
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
