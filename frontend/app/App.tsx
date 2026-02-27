import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { VerifyEmail } from './components/VerifyEmail';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Budgets } from './components/Budgets';
import { Goals } from './components/Goals';
import { Analysis } from './components/Analysis';
import { Achievements } from './components/Achievements';
import { Settings } from './components/Settings';
import { AIAssistant } from './components/AIAssistant';
import { LandingPage } from './components/LandingPage';
import { authAPI } from './api';

type AuthState = 'landing' | 'login' | 'register' | 'verify-email' | 'oauth-callback' | 'authenticated';

interface User {
  id: number;
  username: string;
  email: string;
  current_level: number;
  current_xp: number;
  total_xp: number;
  avatar_url?: string;
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    // Check if user is landing on the /verify-email page
    if (window.location.pathname === '/verify-email') {
      setAuthState('verify-email');
      setLoading(false);
      return;
    }

    // Handle OAuth callback — extract token from URL
    if (window.location.pathname === '/oauth-callback') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const error = params.get('error');
      // Clean the URL
      window.history.replaceState({}, '', '/');
      if (token) {
        localStorage.setItem('token', token);
        fetchUser(true);
        return;
      } else {
        console.error('OAuth error:', error);
        setAuthState('login');
        setLoading(false);
        return;
      }
    }

    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (fromLogin = false) => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
      setAuthState('authenticated');
    } catch (error) {
      localStorage.removeItem('token');
      setAuthState(fromLogin ? 'login' : 'landing');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    setAuthState('authenticated');
    fetchUser(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setAuthState('landing');
  };

  const handleAvatarUpdate = (url: string) => {
    if (user) {
      setUser({ ...user, avatar_url: url });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl mb-4 shadow-[0_0_20px_rgba(127,13,242,0.4)]">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-foreground font-semibold">Loading...</h2>
        </div>
      </div>
    );
  }

  // Auth screens
  if (authState === 'landing') {
    return (
      <LandingPage
        onLoginClick={() => setAuthState('login')}
        onRegisterClick={() => setAuthState('register')}
      />
    );
  }

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
        onRegister={() => setAuthState('login')}
      />
    );
  }

  if (authState === 'verify-email') {
    return (
      <VerifyEmail
        onBackToLogin={() => {
          window.history.replaceState({}, '', '/');
          setAuthState('login');
        }}
      />
    );
  }

  // Main App Layout with Routing
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
        {/* Sidebar */}
        <Sidebar
          user={{
            username: user?.username ?? 'User',
            current_level: user?.current_level ?? 0,
            current_xp: user?.current_xp ?? 0,
            avatar_url: user?.avatar_url,
          }}
          onLogout={handleLogout}
          onAvatarUpdate={handleAvatarUpdate}
        />

        {/* Main Content */}
        <main className="flex-1 ml-60 p-8">
          <div className="max-w-[1600px] mx-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>

        {/* AI Assistant - Available on all pages */}
        <AIAssistant />
      </div>
    </BrowserRouter>
  );
}