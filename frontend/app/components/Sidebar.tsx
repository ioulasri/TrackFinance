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
  PinIcon,
  PinOff,
} from 'lucide-react';
import { XPBar } from './XPBar';
import { authAPI, reportAPI } from '../api';
import { Logo, LogoMark } from './Logo';

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
  const [pinned, setPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PIN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [hovered, setHovered] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expanded = pinned || hovered;

  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, pinned ? '1' : '0');
    } catch { /* ignore */ }
  }, [pinned]);

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

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: expanded ? 240 : 64 }}
      className={`group/sidebar fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-30
        flex flex-col transition-[width] duration-200 ease-out
        ${!pinned && hovered ? 'shadow-[6px_0_24px_-12px_rgba(5,150,105,0.15)]' : ''}`}
    >
      {/* Logo header */}
      <div
        className={`h-14 flex items-center border-b border-sidebar-border shrink-0
          ${expanded ? 'px-3 gap-2.5' : 'justify-center'}`}
      >
        <LogoMark size={28} className="text-primary shrink-0" />
        {expanded && (
          <>
            <span
              className="font-bold text-foreground text-lg tracking-tight whitespace-nowrap"
              style={{ letterSpacing: '-0.02em' }}
            >
              TrackFinance
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPinned(p => !p); }}
              className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
              aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
            >
              {pinned ? <PinOff size={14} /> : <PinIcon size={14} />}
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={item.label}
              className={({ isActive }) =>
                `relative flex items-center gap-3 h-10 px-3 rounded-lg transition-colors group
                ${isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'}`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Left accent strip on active item */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                  )}
                  <Icon size={18} className="shrink-0" />
                  <span
                    className={`text-sm whitespace-nowrap transition-opacity duration-150
                      ${expanded ? 'opacity-100' : 'opacity-0'}`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-2 space-y-2 shrink-0">
        {/* Avatar + identity */}
        <div className={`flex items-center gap-2.5 ${expanded ? 'p-2' : 'justify-center p-1'}`}>
          <div className="relative cursor-pointer shrink-0" onClick={handleAvatarClick}>
            <div className="relative w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold border border-border shadow-sm overflow-hidden group">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs">{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            {/* Tiny level chip overlay (always visible) */}
            <span className="absolute -bottom-1 -right-1 px-1 py-0.5 bg-foreground text-background text-[9px] font-bold rounded-md leading-none shadow-sm border border-background">
              {level}
            </span>
            <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>

          <div
            className={`flex-1 min-w-0 transition-opacity duration-150 overflow-hidden
              ${expanded ? 'opacity-100' : 'opacity-0 w-0'}`}
          >
            <p className="font-medium text-foreground text-sm truncate">{username}</p>
            <div className="mt-1">
              <XPBar currentXP={currentXP} requiredXP={requiredXP} level={level} />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className={expanded ? 'space-y-1' : 'space-y-1'}>
          <button
            onClick={handleExport}
            disabled={isExporting}
            title="Export report"
            className={`w-full flex items-center gap-2 h-9 rounded-lg text-foreground hover:bg-sidebar-accent transition-colors
              ${expanded ? 'px-3 justify-start' : 'justify-center'}`}
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
            ) : (
              <Download size={16} className="text-primary shrink-0" />
            )}
            <span className={`text-sm font-medium whitespace-nowrap transition-opacity ${expanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
              {isExporting ? 'Generating…' : 'Export Report'}
            </span>
          </button>
          <button
            onClick={onLogout}
            title="Logout"
            className={`w-full flex items-center gap-2 h-9 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors
              ${expanded ? 'px-3 justify-start' : 'justify-center'}`}
          >
            <LogOut size={16} className="shrink-0" />
            <span className={`text-sm font-medium whitespace-nowrap transition-opacity ${expanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
