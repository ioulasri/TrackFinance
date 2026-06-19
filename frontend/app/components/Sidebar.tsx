import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Target,
  Trophy,
  Settings,
  LogOut,
  LineChart,
  Camera,
  Download,
  RotateCw,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { authAPI, reportAPI } from '../api';

// ── Palette (matches the TrackFinance design mockup; see Dashboard.tsx) ──
const C = {
  paper: '#FAFAF7',
  card: '#FFFFFF',
  ink: '#1A1815',
  ink2: '#2A2825',
  muted: '#888780',
  faint: '#B4B2A9',
  border: '#E5E2DA',
  divider: '#F0EDE5',
  accent: '#E97B47',
};
const FONT = "'Inter',-apple-system,system-ui,sans-serif";
const MONO = "'IBM Plex Mono',monospace";

interface SidebarProps {
  user: {
    username: string;
    current_level: number;
    current_xp: number;
    avatar_url?: string;
  };
  onLogout: () => void;
  onAvatarUpdate?: (url: string) => void;
}

const PIN_KEY = 'tf_sidebar_pinned';

const menuItems = [
  { id: 'dashboard',    path: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'transactions', path: '/transactions', label: 'Transactions', icon: Receipt },
  { id: 'budgets',      path: '/budgets',      label: 'Budgets',      icon: Wallet },
  { id: 'goals',        path: '/goals',        label: 'Goals',        icon: Target },
  { id: 'recurring',    path: '/recurring',    label: 'Recurring',    icon: RotateCw },
  { id: 'analysis',     path: '/analysis',     label: 'Analysis',     icon: LineChart },
  { id: 'achievements', path: '/achievements', label: 'Achievements', icon: Trophy },
  { id: 'settings',     path: '/settings',     label: 'Settings',     icon: Settings },
];

export function Sidebar({ user, onLogout, onAvatarUpdate }: SidebarProps) {
  // The sidebar has exactly two states — collapsed (64px) and expanded (240px).
  // The "expanded" state is fully sticky (no hover-peek) so that content always
  // knows where the sidebar's right edge is. The toggle is on the user.
  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PIN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, expanded ? '1' : '0');
    } catch { /* ignore */ }
    // Tell App.tsx so it can shift the main column to match.
    window.dispatchEvent(new CustomEvent('tf:sidebar-pin-change', { detail: { pinned: expanded } }));
  }, [expanded]);

  const username = user?.username || 'User';
  const level = user?.current_level ?? 0;
  const currentXP = user?.current_xp ?? 0;
  const requiredXP = ((level + 1) ** 2) * 100;
  const initials = username.substring(0, 2).toUpperCase();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await reportAPI.downloadFinancialReport(username);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setIsUploading(true);
      const response = await authAPI.uploadAvatar(formData);
      if (onAvatarUpdate && response.data.avatar_url) {
        onAvatarUpdate(response.data.avatar_url);
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const xpPct = requiredXP > 0 ? Math.min((currentXP / requiredXP) * 100, 100) : 0;

  return (
    <aside
      style={{ width: expanded ? 240 : 64, background: C.card, borderRight: `0.5px solid ${C.border}`, fontFamily: FONT, color: C.ink }}
      className={`tf-sidebar ${expanded ? '' : 'collapsed'} fixed left-0 top-0 z-30 flex h-screen flex-col transition-[width] duration-200 ease-out`}
    >
      <style>{`
        .tf-nav{display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:0;border-radius:7px;padding:9px 10px;font-size:13.5px;font-weight:500;cursor:pointer;transition:background 150ms;background:transparent;color:${C.ink2};text-decoration:none;}
        .tf-sidebar.collapsed .tf-nav{justify-content:center;padding:9px 0;}
        .tf-nav:hover{background:${C.divider};}
        .tf-nav.active{background:${C.ink};color:${C.paper};}
        .tf-nav.active:hover{background:${C.ink};}
        .tf-foot{display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:0;background:transparent;border-radius:7px;padding:9px 10px;font-size:13px;cursor:pointer;transition:background 150ms;}
        .tf-foot:hover{background:${C.divider};}
        .tf-sidebar.collapsed .tf-foot{justify-content:center;padding:9px 0;}
      `}</style>

      {/* Logo header — toggles expand/collapse */}
      {expanded ? (
        <div className="flex shrink-0 items-center" style={{ height: 64, padding: '0 20px', gap: 11, borderBottom: `0.5px solid ${C.border}` }}>
          <div className="flex shrink-0 items-center justify-center" style={{ width: 30, height: 30, borderRadius: 7, background: C.ink, color: C.paper }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16" /><path d="M4 19V5" /><polyline points="7 14 11 10 14 13 20 6" /></svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>TrackFinance</div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="ml-auto rounded-md p-1.5"
            style={{ color: C.muted, background: 'transparent', border: 0, cursor: 'pointer' }}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="group flex w-full shrink-0 items-center justify-center"
          style={{ height: 64, borderBottom: `0.5px solid ${C.border}`, background: 'transparent', border: 0, cursor: 'pointer' }}
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <div className="flex shrink-0 items-center justify-center group-hover:hidden" style={{ width: 30, height: 30, borderRadius: 7, background: C.ink, color: C.paper }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16" /><path d="M4 19V5" /><polyline points="7 14 11 10 14 13 20 6" /></svg>
          </div>
          <PanelLeftOpen size={20} className="hidden group-hover:block" style={{ color: C.muted }} />
        </button>
      )}

      {/* Nav */}
      <nav style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 2 }} className="flex-1 overflow-hidden">
        {expanded && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, fontWeight: 500, padding: '8px 8px 6px' }}>Menu</div>}
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={expanded ? undefined : item.label}
              className={({ isActive }) => `tf-nav${isActive ? ' active' : ''}`}
            >
              <Icon size={19} strokeWidth={1.5} className="shrink-0" />
              {expanded && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }} className="shrink-0">
        {/* XP / identity card */}
        {expanded ? (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 13, marginBottom: 6 }}>
            <div className="flex items-center" style={{ gap: 10 }}>
              <div className="relative shrink-0 cursor-pointer" onClick={handleAvatarClick}>
                <div className="group relative flex items-center justify-center overflow-hidden" style={{ width: 30, height: 30, borderRadius: '50%', background: C.ink, color: C.paper, fontSize: 12, fontWeight: 600 }}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={username} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initials.toLowerCase()}</span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <Camera className="text-white" size={13} />
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <div className="animate-spin rounded-full" style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }} className="truncate">{username}</div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, marginTop: 2 }}>Level {level} · Progress</div>
              </div>
            </div>
            <div style={{ marginTop: 11, height: 6, borderRadius: 4, background: C.divider, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${xpPct}%`, borderRadius: 4, background: C.accent, transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)' }}></div>
            </div>
            <div className="flex justify-between" style={{ marginTop: 7, fontFamily: MONO, fontSize: 10, color: C.muted, letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}>
              <span>{currentXP.toLocaleString('en-US')} XP</span>
              <span>{requiredXP.toLocaleString('en-US')} XP</span>
            </div>
          </div>
        ) : (
          <div className="relative mx-auto cursor-pointer" onClick={handleAvatarClick} style={{ marginBottom: 6 }}>
            <div className="group relative flex items-center justify-center overflow-hidden" style={{ width: 32, height: 32, borderRadius: '50%', background: C.ink, color: C.paper, fontSize: 12, fontWeight: 600 }}>
              {user.avatar_url ? <img src={user.avatar_url} alt={username} className="h-full w-full object-cover" /> : <span>{initials.toLowerCase()}</span>}
            </div>
            <span className="absolute" style={{ bottom: -3, right: -3, padding: '1px 4px', background: C.accent, color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 5, lineHeight: 1, border: `1.5px solid ${C.card}` }}>{level}</span>
            <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>
        )}

        {/* Action buttons */}
        <button onClick={handleExport} disabled={isExporting} title={expanded ? undefined : 'Export report'} className="tf-foot" style={{ color: C.ink2 }}>
          {isExporting ? (
            <div className="shrink-0 animate-spin rounded-full" style={{ width: 16, height: 16, border: `2px solid ${C.divider}`, borderTopColor: C.accent }} />
          ) : (
            <Download size={18} strokeWidth={1.5} className="shrink-0" />
          )}
          {expanded && <span style={{ whiteSpace: 'nowrap' }}>{isExporting ? 'Generating…' : 'Export report'}</span>}
        </button>
        <button onClick={onLogout} title={expanded ? undefined : 'Logout'} className="tf-foot" style={{ color: C.muted }}>
          <LogOut size={18} strokeWidth={1.5} className="shrink-0" />
          {expanded && <span style={{ whiteSpace: 'nowrap' }}>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
