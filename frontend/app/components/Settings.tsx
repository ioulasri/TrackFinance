import React, { useState } from 'react';
import { User, Lock, Bell, Globe } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { authAPI } from '../api';

export function Settings() {
  const [profileData, setProfileData] = useState({
    email: 'alex.johnson@example.com',
    username: 'Alex Johnson',
    avatar: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStatus, setPasswordStatus] = useState({
    loading: false,
    error: '',
    success: ''
  });

  const [notifications, setNotifications] = useState({
    budgetAlerts: true,
    achievementUnlocked: true,
    weeklyReport: false,
    monthlyReport: true,
  });

  const [preferences, setPreferences] = useState({
    currency: 'MAD',
    language: 'English',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and settings</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-xl">
              <User size={20} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Profile Information</h3>
          </div>

          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 pb-6 border-b border-border">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-semibold shadow-[0_0_15px_rgba(127,13,242,0.3)]">
                {profileData.username.substring(0, 2).toUpperCase()}
              </div>
              <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                Change Avatar
              </button>
            </div>

            <Input
              label="Email Address"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            />

            <Input
              label="Username"
              type="text"
              value={profileData.username}
              onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
            />

            <Button variant="primary" size="medium" className="w-full mt-4">
              Save Changes
            </Button>
          </div>
        </div>

        {/* Security */}
        <form onSubmit={async (e) => {
          e.preventDefault();
          setPasswordStatus({ loading: false, error: '', success: '' });

          if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setPasswordStatus({ loading: false, error: 'All fields are required', success: '' });
            return;
          }

          if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordStatus({ loading: false, error: 'New passwords do not match', success: '' });
            return;
          }

          if (passwordData.newPassword.length < 8) {
            setPasswordStatus({ loading: false, error: 'New password must be at least 8 characters long', success: '' });
            return;
          }

          try {
            setPasswordStatus({ loading: true, error: '', success: '' });
            await authAPI.changePassword({
              current_password: passwordData.currentPassword,
              new_password: passwordData.newPassword
            });
            setPasswordStatus({ loading: false, error: '', success: 'Password updated successfully!' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
          } catch (error: any) {
            setPasswordStatus({
              loading: false,
              error: error.response?.data?.detail || 'Failed to update password',
              success: ''
            });
          }
        }} className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Lock size={20} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Security</h3>
          </div>

          <div className="space-y-4">
            {passwordStatus.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                {passwordStatus.error}
              </div>
            )}
            {passwordStatus.success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-lg">
                {passwordStatus.success}
              </div>
            )}
            <Input
              label="Current Password"
              type="password"
              placeholder="Enter current password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Confirm new password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />

            <Button
              type="submit"
              variant="primary"
              size="medium"
              className="w-full mt-4"
              disabled={passwordStatus.loading}
            >
              {passwordStatus.loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>

        {/* Preferences */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Bell size={20} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
            </div>

            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {key === 'budgetAlerts' && 'Budget Alerts'}
                    {key === 'achievementUnlocked' && 'Achievement Unlocked'}
                    {key === 'weeklyReport' && 'Weekly Report'}
                    {key === 'monthlyReport' && 'Monthly Report'}
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted rounded-full peer-checked:bg-primary peer-checked:shadow-[0_0_10px_rgba(127,13,242,0.5)] peer-focus:ring-2 peer-focus:ring-primary/50 transition-all">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Display Preferences */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-500/10 rounded-xl">
                <Globe size={20} className="text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Display</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-foreground">Currency</label>
                <select
                  value={preferences.currency}
                  onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                  className="w-full px-4 py-2.5 bg-input border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="MAD">MAD - Moroccan Dirham</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-foreground">Language</label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  className="w-full px-4 py-2.5 bg-input border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="English">English</option>
                  <option value="French">Français</option>
                  <option value="Arabic">العربية</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
