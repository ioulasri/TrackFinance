import React, { useState, type FormEvent } from 'react';
import { Mail, Lock, User, CheckCircle, ArrowLeft } from 'lucide-react';
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
const OAUTH_BASE_URL = API_URL.replace(/\/$/, '');

interface RegisterProps {
  onSwitchToLogin: () => void;
  onRegister: () => void;
}

export function Register({ onSwitchToLogin, onRegister }: RegisterProps) {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !acceptTerms) return;
    setLoading(true);
    setErrors({});

    try {
      await authAPI.register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });
      setRegistered(true);
    } catch (err: any) {
      setErrors({
        general: err.response?.data?.detail || 'Registration failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await authAPI.resendVerification(formData.email);
      setResendSuccess(true);
    } catch {
      setResendSuccess(true);
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${OAUTH_BASE_URL}/v1/users/oauth/google`;
  };

  const handleDiscordLogin = () => {
    window.location.href = `${OAUTH_BASE_URL}/v1/users/oauth/discord`;
  };

  // Check your email screen
  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] bg-gradient-to-br from-emerald-50 to-green-50 rounded-full blur-[100px] opacity-60" />
          <div className="absolute bottom-[-30%] left-[-20%] w-[50%] h-[50%] bg-gradient-to-tr from-violet-50 to-indigo-50 rounded-full blur-[100px] opacity-50" />
        </div>

        <div className="w-full max-w-[420px] relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-violet-200">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">TrackFinance</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-7 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 rounded-full mb-4">
              <Mail className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Check your email! 📧</h2>
            <p className="text-gray-500 text-sm mb-1">We've sent a verification link to:</p>
            <p className="text-gray-900 font-semibold text-sm mb-5">{formData.email}</p>
            <p className="text-gray-400 text-xs mb-5">Click the link in the email to verify your account. The link expires in 24 hours.</p>

            {!resendSuccess ? (
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors disabled:opacity-50"
              >
                {resendLoading ? 'Sending...' : "Didn't receive it? Resend"}
              </button>
            ) : (
              <p className="text-sm text-emerald-600 font-medium">
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Verification email resent!
              </p>
            )}
          </div>

          <p className="text-center mt-6">
            <button
              onClick={onSwitchToLogin}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              Back to Login
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-30%] left-[-20%] w-[60%] h-[60%] bg-gradient-to-br from-violet-50 to-indigo-50 rounded-full blur-[100px] opacity-60" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[50%] h-[50%] bg-gradient-to-tr from-blue-50 to-purple-50 rounded-full blur-[100px] opacity-50" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-violet-200">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create an account</h1>
          <p className="text-gray-500 mt-1 text-sm">Start tracking your finances today</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-7">
          {/* Social Login Buttons */}
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
              <span className="px-3 bg-white text-gray-400 font-medium">or sign up with email</span>
            </div>
          </div>

          {errors.general && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email"
              label="Email Address"
              icon={<Mail size={18} />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              type="text"
              placeholder="Choose a username"
              label="Username"
              icon={<User size={18} />}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <Input
              type="password"
              placeholder="Create a password"
              label="Password"
              icon={<Lock size={18} />}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              required
            />
            <Input
              type="password"
              placeholder="Confirm your password"
              label="Confirm Password"
              icon={<Lock size={18} />}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              error={errors.confirmPassword}
              required
            />

            <label className="flex items-start cursor-pointer group mt-1">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 bg-white border-gray-300 rounded text-violet-600 focus:ring-violet-500 focus:ring-offset-0 transition-all cursor-pointer"
                required
              />
              <span className="ml-2 text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                I agree to the{' '}
                <a href="#" className="text-violet-600 hover:text-violet-700 transition-colors">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-violet-600 hover:text-violet-700 transition-colors">Privacy Policy</a>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-gray-500">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-violet-600 hover:text-violet-700 font-semibold transition-colors"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
