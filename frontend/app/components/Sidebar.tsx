import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, List, Wallet, Target, Trophy, Settings, LogOut, LineChart } from 'lucide-react';
import { XPBar } from './XPBar';

interface SidebarProps {
  user: {
    username: string;
    current_level: number;
    current_xp: number;
  };
  onLogout: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: Home },
    { id: 'transactions', path: '/transactions', label: 'Transactions', icon: List },
    { id: 'budgets', path: '/budgets', label: 'Budgets', icon: Wallet },
    { id: 'goals', path: '/goals', label: 'Goals', icon: Target },
    { id: 'analysis', path: '/analysis', label: 'Analysis', icon: LineChart },
    { id: 'achievements', path: '/achievements', label: 'Achievements', icon: Trophy },
    { id: 'settings', path: '/settings', label: 'Settings', icon: Settings },
  ];

  const username = user?.username || 'User';
  const level = user?.current_level ?? 0;
  const currentXP = user?.current_xp ?? 0;
  const requiredXP = ((level + 1) ** 2) * 100;
  const initials = username.substring(0, 2).toUpperCase();

  return (
    <div className="w-60 h-screen bg-sidebar border-r border-border flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border bg-sidebar">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-xl shadow-sm">
            <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight">TrackFinance</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${isActive
                  ? 'bg-secondary text-foreground font-semibold shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`
              }
            >
              <Icon size={18} />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border space-y-4">
        <div className="flex items-center gap-3 py-1">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold border border-border shadow-sm flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {/* Username */}
            <p className="font-medium text-foreground text-sm truncate">{username}</p>
            {/* Level Badge */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="px-1.5 py-0.5 bg-secondary border border-border rounded flex items-center gap-1">
                <span className="text-[10px] font-bold text-muted-foreground">LVL {level}</span>
                <span className="text-[10px]">🔥</span>
              </div>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="px-1 pb-2">
          <XPBar
            currentXP={currentXP}
            requiredXP={requiredXP}
            level={level}
          />
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-all shadow-sm bg-white"
        >
          <LogOut size={16} />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}