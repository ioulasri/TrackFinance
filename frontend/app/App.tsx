import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Budgets } from './components/Budgets';
import { Achievements } from './components/Achievements';
import { Settings } from './components/Settings';
import { authAPI } from './api';

type AuthState = 'login' | 'register' | 'authenticated';
type Page = 'dashboard' | 'transactions' | 'budgets' | 'achievements' | 'settings';

interface User {
  id: number;
  username: string;
  email: string;
  level: number;
  current_xp: number;
  total_xp: number;
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
      setAuthState('authenticated');
    } catch (error) {
      localStorage.removeItem('token');
      setAuthState('login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    fetchUser();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setAuthState('login');
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-gray-900 font-semibold">Loading...</h2>
        </div>
      </div>
    );
  }

  // Auth screens
  if (authState === 'login') {
    return (
      <Login
        onSwitchToRegister={() => setAuthState('register')}
        onLogin={handleLogin}
      />
    );
  }

  if (authState === 'register') {
    return (
      <Register
        onSwitchToLogin={() => setAuthState('login')}
        onRegister={handleLogin}
      />
    );
  }

  // Main App Layout
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={(page) => setCurrentPage(page as Page)}
        user={{
          name: user?.username || 'User',
          level: user?.level || 1,
          avatar: '',
        }}
      />

      {/* Main Content */}
      <main className="flex-1 ml-60 p-8">
        <div className="max-w-7xl mx-auto">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'transactions' && <Transactions />}
          {currentPage === 'budgets' && <Budgets />}
          {currentPage === 'achievements' && <Achievements />}
          {currentPage === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}
