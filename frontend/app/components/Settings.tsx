import React, { useState } from 'react';
import { User, Lock, Bell, Globe } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

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
        <h1 className="text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account preferences and settings</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-xl">
              <User size={20} className="text-purple-600" />
            </div>
            <h3 className="text-gray-900">Profile Information</h3>
          </div>

          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 pb-6 border-b border-gray-100">
              <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-semibold">
                {profileData.username.substring(0, 2).toUpperCase()}
              </div>
              <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <Lock size={20} className="text-emerald-600" />
            </div>
            <h3 className="text-gray-900">Security</h3>
          </div>

          <div className="space-y-4">
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

            <Button variant="primary" size="medium" className="w-full mt-4">
              Update Password
            </Button>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Bell size={20} className="text-blue-600" />
              </div>
              <h3 className="text-gray-900">Notifications</h3>
            </div>

            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
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
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-purple-600 peer-focus:ring-2 peer-focus:ring-purple-600 transition-colors">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Display Preferences */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-50 rounded-xl">
                <Globe size={20} className="text-orange-600" />
              </div>
              <h3 className="text-gray-900">Display</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-gray-900">Currency</label>
                <select
                  value={preferences.currency}
                  onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="MAD">MAD - Moroccan Dirham</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-gray-900">Language</label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
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
