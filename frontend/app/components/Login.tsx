import React, { useState, type FormEvent } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { authAPI } from '../api';

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authAPI.login({ username, password });
      localStorage.setItem('token', response.data.access_token);
      onLogin();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden selection:bg-primary/30 selection:text-primary">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-purple-800 rounded-2xl mb-4 shadow-[0_0_20px_rgba(127,13,242,0.4)]">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">TrackFinance</h1>
          <p className="text-muted-foreground mt-2">
            {isForgotPassword
              ? 'Reset your password to regain access.'
              : 'Welcome back! Please login to your account.'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50 p-8">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-sm font-medium">
              {success}
            </div>
          )}

          {!isForgotPassword ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                type="text"
                placeholder="Enter your username"
                label="Username"
                icon={<User size={20} />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                type="password"
                placeholder="Enter your password"
                label="Password"
                icon={<Lock size={20} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />

              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 bg-background border-border rounded text-primary focus:ring-primary focus:ring-offset-0 transition-all cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
                </label>
                <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); }} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </button>
              </div>

              <Button type="submit" variant="primary" size="large" className="w-full mt-4 shadow-[0_0_20px_rgba(127,13,242,0.3)] hover:shadow-[0_0_25px_rgba(127,13,242,0.5)]" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-6">
              <Input
                type="text"
                placeholder="Enter your username"
                label="Username"
                icon={<User size={20} />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                type="password"
                placeholder="Enter your old password"
                label="Old Password"
                icon={<Lock size={20} />}
                value={resetOldPassword}
                onChange={(e) => setResetOldPassword(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                type="password"
                placeholder="Enter your new password"
                label="New Password"
                icon={<Lock size={20} />}
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                required
                disabled={loading}
              />

              <Button type="submit" variant="primary" size="large" className="w-full mt-4 shadow-[0_0_20px_rgba(127,13,242,0.3)] hover:shadow-[0_0_25px_rgba(127,13,242,0.5)]" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </div>

        {/* Register Link */}
        <p className="text-center mt-8 text-muted-foreground">
          {isForgotPassword ? (
            <>
              Remember your password?{' '}
              <button
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); }}
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                Login
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                Register
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
