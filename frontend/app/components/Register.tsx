import React, { useState, type FormEvent } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { authAPI } from '../api';

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
      const response = await authAPI.register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });
      localStorage.setItem('token', response.data.access_token);
      onRegister();
    } catch (err: any) {
      setErrors({
        general: err.response?.data?.detail || 'Registration failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden selection:bg-primary/30 selection:text-primary">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '9s' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '11s' }} />
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
          <p className="text-muted-foreground mt-2">Create your account and start tracking!</p>
        </div>

        {/* Register Card */}
        <div className="bg-card/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50 p-8">
          {errors.general && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium">
              {errors.general}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              placeholder="Enter your email"
              label="Email Address"
              icon={<Mail size={20} />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <Input
              type="text"
              placeholder="Choose a username"
              label="Username"
              icon={<User size={20} />}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />

            <Input
              type="password"
              placeholder="Create a password"
              label="Password"
              icon={<Lock size={20} />}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              required
            />

            <Input
              type="password"
              placeholder="Confirm your password"
              label="Confirm Password"
              icon={<Lock size={20} />}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              error={errors.confirmPassword}
              required
            />

            <label className="flex items-start cursor-pointer group mt-2">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 bg-background border-border rounded text-primary focus:ring-primary focus:ring-offset-0 transition-all cursor-pointer"
                required
              />
              <span className="ml-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                I agree to the{' '}
                <a href="#" className="text-primary hover:text-primary/80 transition-colors">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary hover:text-primary/80 transition-colors">Privacy Policy</a>
              </span>
            </label>

            <Button type="submit" variant="primary" size="large" className="w-full mt-4 shadow-[0_0_20px_rgba(127,13,242,0.3)] hover:shadow-[0_0_25px_rgba(127,13,242,0.5)]" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </div>

        {/* Login Link */}
        <p className="text-center mt-8 text-muted-foreground">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}
