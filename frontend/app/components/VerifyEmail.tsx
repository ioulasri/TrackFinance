import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { Input } from './Input';
import { authAPI } from '../api';

interface VerifyEmailProps {
  onBackToLogin: () => void;
}

export function VerifyEmail({ onBackToLogin }: VerifyEmailProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please check your email link.');
      return;
    }

    verifyToken(token);
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await authAPI.verifyEmail(token);
      setStatus('success');
      setMessage(response.data.message || 'Email verified successfully!');
    } catch (err: any) {
      const detail = err.response?.data?.detail || '';
      if (detail.toLowerCase().includes('expired')) {
        setStatus('expired');
        setMessage('Your verification link has expired. Please request a new one.');
      } else {
        setStatus('error');
        setMessage(detail || 'Verification failed. The link may be invalid.');
      }
    }
  };

  const handleResend = async () => {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] bg-gradient-to-br from-violet-50 to-indigo-50 rounded-full blur-[100px] opacity-60" />
        <div className="absolute bottom-[-30%] left-[-20%] w-[50%] h-[50%] bg-gradient-to-tr from-emerald-50 to-green-50 rounded-full blur-[100px] opacity-50" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-violet-200">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">TrackFinance</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-7">
          {status === 'loading' && (
            <div className="text-center py-6">
              <Loader2 className="w-10 h-10 text-violet-600 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Verifying your email...</h2>
              <p className="text-gray-500 text-sm">Please wait while we confirm your email address.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 rounded-full mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Email Verified! 🎉</h2>
              <p className="text-gray-500 text-sm mb-5">{message}</p>
              <button
                onClick={onBackToLogin}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-violet-200"
              >
                Continue to Login
              </button>
            </div>
          )}

          {(status === 'error' || status === 'expired') && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-full mb-4">
                <XCircle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {status === 'expired' ? 'Link Expired' : 'Verification Failed'}
              </h2>
              <p className="text-gray-500 text-sm mb-5">{message}</p>

              {!resendSuccess ? (
                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    label="Resend verification"
                    icon={<Mail size={18} />}
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                  />
                  <button
                    onClick={handleResend}
                    disabled={resendLoading || !resendEmail}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200"
                  >
                    {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm font-medium">
                  If that email is registered and unverified, a new link has been sent!
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center mt-6">
          <button
            onClick={onBackToLogin}
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
