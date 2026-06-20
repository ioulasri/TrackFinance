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
import { Recurring } from './components/Recurring';
import { Settings } from './components/Settings';
import { AIAssistant } from './components/AIAssistant';
import { LandingPage } from './components/LandingPage';
import { TopBar } from './components/TopBar';
import { LogoMark } from './components/Logo';
import { authAPI } from './api';

type AuthState = 'landing' | 'login' | 'register' | 'verify-email' | 'oauth-callback' | 'authenticated';

interface User {
  id: number;
  username: string;
  email: string;
  current_level: number;
  current_xp: number;
  total_xp: number;
  current_streak?: number;
  avatar_url?: string;
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarPinned, setSidebarPinned] = useState<boolean>(() => {
    try { return localStorage.getItem('tf_sidebar_pinned') === '1'; } catch { return false; }
  });

  // Sidebar notifies us when the pin toggles so we can shift main content.
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ pinned: boolean }>).detail;
      setSidebarPinned(!!detail?.pinned);
    };
    window.addEventListener('tf:sidebar-pin-change', onChange);
    return () => window.removeEventListener('tf:sidebar-pin-change', onChange);
  }, []);

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
      if (token) {
        localStorage.setItem('token', token);
        // Clean the URL only after the token is safely persisted
        window.history.replaceState({}, '', '/');
        fetchUser(true);
        return;
      } else {
        console.error('OAuth error:', error);
        window.history.replaceState({}, '', '/');
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

  const handleProfileUpdate = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="inline-flex mb-4 animate-pulse">
            <LogoMark size={56} className="text-primary" />
          </div>
          <h2 className="text-foreground font-semibold">Loading…</h2>
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
      <div className="min-h-screen bg-background text-foreground">
        {/* Sidebar — fixed left, collapses to 64px */}
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

        {/* Main column — offset by sidebar (64px collapsed, 240px when pinned) */}
        <div
          className={`${sidebarPinned ? 'pl-60' : 'pl-16'} min-h-screen flex flex-col transition-[padding] duration-200`}
          style={{
            backgroundColor: '#FAFAF7',
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cg fill='none' stroke='%234F46E5' stroke-opacity='0.05'%3E%3Ccircle cx='120' cy='120' r='30'/%3E%3Ccircle cx='120' cy='120' r='58'/%3E%3Ccircle cx='120' cy='120' r='86'/%3E%3Ccircle cx='120' cy='120' r='114'/%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: '240px 240px',
          }}
        >
          <TopBar user={user} />
          <main className="flex-1" style={{ padding: '30px 36px 48px' }}>
            <div style={{ maxWidth: 1320, margin: '0 auto' }}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/recurring" element={<Recurring />} />
                <Route path="/analysis" element={<Analysis />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/settings" element={<Settings onProfileUpdate={handleProfileUpdate} />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </main>
        </div>

        {/* AI Assistant - listens for tf:open-ai event from TopBar */}
        <AIAssistant />
      </div>
    </BrowserRouter>
  );
}