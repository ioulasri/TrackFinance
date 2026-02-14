import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, List, Wallet, Target, Trophy, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  user: {
    name: string;
    level: number;
    avatar: string;
  };
  onLogout: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: Home },
    { id: 'transactions', path: '/transactions', label: 'Transactions', icon: List },
    { id: 'budgets', path: '/budgets', label: 'Budgets', icon: Wallet },
    { id: 'goals', path: '/goals', label: 'Goals', icon: Target },
    { id: 'achievements', path: '/achievements', label: 'Achievements', icon: Trophy },
    { id: 'settings', path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-60 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-600 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">TrackFinance</span>
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
                `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-purple-50 text-purple-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
            {user.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-0.5 bg-purple-600 rounded-md">
                <span className="text-xs font-bold text-white">LVL {user.level}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={18} />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}
