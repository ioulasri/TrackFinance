import React, { useState, type FormEvent } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { authAPI } from '../api';

// Get the API base URL for OAuth redirects
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (hostname.includes('ondigitalocean.app')) {
      return `${protocol}//${hostname.replace('frontend', 'backend')}`;
    }
    return `${protocol}//${hostname}:8000`;
  }
  return 'http://localhost:8000';
};
const API_URL = getApiUrl();

interface LoginProps {
  onSwitchToRegister: () => void;
  onLogin: () => void;
}

export function Login({ onSwitchToRegister, onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetOldPassword, setResetOldPassword] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Email not verified state
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    setShowResendVerification(false);

    try {
      const response = await authAPI.login({ username, password });
      localStorage.setItem('token', response.data.access_token);
      onLogin();
    } catch (err: any) {
      const detail = err.response?.data?.detail || '';
      if (detail === 'EMAIL_NOT_VERIFIED') {
        setError('Your email has not been verified. Please check your inbox or resend the verification email.');
        setShowResendVerification(true);
      } else {
        setError(detail || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await authAPI.resetPassword({
        username,
        old_password: resetOldPassword,
        new_password: resetNewPassword,
      });
      setSuccess('Password reset successfully! You can now log in.');
      setIsForgotPassword(false);
      setPassword('');
      setResetOldPassword('');
      setResetNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Reset failed. Please verify your username and old password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!resendEmail) return;
    setResendLoading(true);
    try {
      await authAPI.resendVerification(resendEmail);
      setResendSuccess(true);
    } catch {
      setResendSuccess(true);
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/v1/users/oauth/google`;
  };

  const handleDiscordLogin = () => {
    window.location.href = `${API_URL}/api/v1/users/oauth/discord`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4 relative overflow-hidden">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] bg-gradient-to-br from-violet-100 to-indigo-50 rounded-full blur-[100px] opacity-60" />
        <div className="absolute bottom-[-30%] left-[-20%] w-[50%] h-[50%] bg-gradient-to-tr from-blue-50 to-purple-50 rounded-full blur-[100px] opacity-50" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-violet-200">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isForgotPassword
              ? 'Reset your password to regain access'
              : 'Log in to your TrackFinance account'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-7">
          {/* Social Login Buttons */}
          {!isForgotPassword && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>

                <button
                  onClick={handleDiscordLogin}
                  className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-[#5865F2] border border-[#5865F2] rounded-xl text-sm font-medium text-white hover:bg-[#4752C4] transition-all duration-200 active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Discord
                </button>
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-gray-400 font-medium">or continue with email</span>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm font-medium">
              {success}
            </div>
          )}

          {/* Resend Verification Section */}
          {showResendVerification && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-100 rounded-xl">
              {!resendSuccess ? (
                <div className="space-y-3">
                  <p className="text-amber-700 text-sm font-medium">Enter your email to resend the verification link:</p>
                  <Input
                    type="email"
                    placeholder="Your email address"
                    icon={<Mail size={18} />}
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                  />
                  <Button
                    onClick={handleResendVerification}
                    variant="primary"
                    size="small"
                    className="w-full"
                    disabled={resendLoading || !resendEmail}
                  >
                    {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                  </Button>
                </div>
              ) : (
                <p className="text-emerald-600 text-sm font-medium">
                  ✓ If that email is registered and unverified, a new link has been sent!
                </p>
              )}
            </div>
          )}

          {!isForgotPassword ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your username"
                label="Username"
                icon={<User size={18} />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                type="password"
                placeholder="Enter your password"
                label="Password"
                icon={<Lock size={18} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 bg-white border-gray-300 rounded text-violet-600 focus:ring-violet-500 focus:ring-offset-0 transition-all cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-500 group-hover:text-gray-700 transition-colors">Remember me</span>
                </label>
                <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); setShowResendVerification(false); }} className="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200"
              >
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your username"
                label="Username"
                icon={<User size={18} />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
              <Input
                type="password"
                placeholder="Enter your old password"
                label="Old Password"
                icon={<Lock size={18} />}
                value={resetOldPassword}
                onChange={(e) => setResetOldPassword(e.target.value)}
                required
                disabled={loading}
              />
              <Input
                type="password"
                placeholder="Enter your new password"
                label="New Password"
                icon={<Lock size={18} />}
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        {/* Bottom link */}
        <p className="text-center mt-6 text-sm text-gray-500">
          {isForgotPassword ? (
            <>
              Remember your password?{' '}
              <button
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); setShowResendVerification(false); }}
                className="text-violet-600 hover:text-violet-700 font-semibold transition-colors"
              >
                Log in
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-violet-600 hover:text-violet-700 font-semibold transition-colors"
              >
                Sign up
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
