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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-gray-900">TrackFinance</h1>
          <p className="text-gray-600 mt-2">Welcome back! Please login to your account.</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-md p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-200 rounded focus:ring-2 focus:ring-purple-600"
                />
                <span className="ml-2 text-sm text-gray-900">Remember me</span>
              </label>
              <button type="button" className="text-sm text-purple-600 hover:text-purple-700">
                Forgot password?
              </button>
            </div>

            <Button type="submit" variant="primary" size="large" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </div>

        {/* Register Link */}
        <p className="text-center mt-6 text-gray-600">
          Don't have an account?{' '}
          <button 
            onClick={onSwitchToRegister}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
