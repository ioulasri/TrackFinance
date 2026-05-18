import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Bell, Globe, Camera, Loader2, Check, AlertCircle, MessageCircle, Send, Copy, Unlink } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { authAPI, telegramAPI, type TelegramStatus, type TelegramLinkCode } from '../api';

const PREFS_KEY = 'tf_preferences';
const NOTIF_KEY = 'tf_notifications';

const defaultNotifications = {
  budgetAlerts: true,
  achievementUnlocked: true,
  weeklyReport: false,
  monthlyReport: true,
};

const defaultPreferences = {
  currency: 'MAD',
  language: 'English',
};

function loadLocalJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

type Status = { loading: boolean; error: string; success: string };
const idle: Status = { loading: false, error: '', success: '' };

interface SettingsProps {
  onProfileUpdate?: (updates: Record<string, any>) => void;
}

export function Settings({ onProfileUpdate }: SettingsProps) {
  // ── Real user data ───────────────────────────────────────────────
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);

  // ── Profile form ─────────────────────────────────────────────────
  const [username, setUsername] = useState('');
  const [profileStatus, setProfileStatus] = useState<Status>(idle);
  const [avatarStatus, setAvatarStatus] = useState<Status>(idle);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Password form ─────────────────────────────────────────────────
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStatus, setPasswordStatus] = useState<Status>(idle);

  // ── Local preferences ─────────────────────────────────────────────
  const [notifications, setNotifications] = useState(() =>
    loadLocalJSON(NOTIF_KEY, defaultNotifications)
  );
  const [preferences, setPreferences] = useState(() =>
    loadLocalJSON(PREFS_KEY, defaultPreferences)
  );

  // ── Telegram linking ──────────────────────────────────────────────
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null);
  const [linkCode, setLinkCode] = useState<TelegramLinkCode | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<Status>(idle);
  const [codeCopied, setCodeCopied] = useState(false);

  // ── Load user on mount ────────────────────────────────────────────
  useEffect(() => {
    authAPI.getCurrentUser()
      .then((res) => {
        setUser(res.data);
        setUsername(res.data.username);
      })
      .catch(() => {/* token will have expired — App handles redirect */})
      .finally(() => setUserLoading(false));
  }, []);

  // ── Load Telegram link status on mount ────────────────────────────
  useEffect(() => {
    telegramAPI.status()
      .then((s) => setTelegram(s))
      .catch(() => {/* endpoint may not be deployed yet — silently ignore */});
  }, []);

  // ── Persist prefs to localStorage ────────────────────────────────
  useEffect(() => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
  }, [preferences]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setProfileStatus({ loading: true, error: '', success: '' });
    try {
      const res = await authAPI.updateProfile({ username: username.trim() });
      const data = res.data;

      // If the username changed the backend issues a fresh JWT — store it so
      // subsequent requests (and page refresh) don't 401.
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
      }

      setUser(data);
      setUsername(data.username);
      onProfileUpdate?.({ username: data.username, avatar_url: data.avatar_url });
      setProfileStatus({ loading: false, error: '', success: 'Username updated!' });
      setTimeout(() => setProfileStatus(idle), 3000);
    } catch (err: any) {
      setProfileStatus({
        loading: false,
        error: err.response?.data?.detail || 'Failed to update username.',
        success: '',
      });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarStatus({ loading: false, error: 'File must be under 5 MB.', success: '' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setAvatarStatus({ loading: true, error: '', success: '' });
    try {
      const res = await authAPI.uploadAvatar(formData);
      setUser(res.data);
      onProfileUpdate?.({ avatar_url: res.data.avatar_url });
      setAvatarStatus({ loading: false, error: '', success: 'Avatar updated!' });
      setTimeout(() => setAvatarStatus(idle), 3000);
    } catch (err: any) {
      setAvatarStatus({
        loading: false,
        error: err.response?.data?.detail || 'Failed to upload avatar.',
        success: '',
      });
    } finally {
      // Reset input so the same file can be re-selected if needed
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(idle);

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordStatus({ ...idle, error: 'All fields are required.' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus({ ...idle, error: 'New passwords do not match.' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordStatus({ ...idle, error: 'New password must be at least 8 characters.' });
      return;
    }

    setPasswordStatus({ loading: true, error: '', success: '' });
    try {
      await authAPI.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });
      setPasswordStatus({ loading: false, error: '', success: 'Password updated successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordStatus(idle), 4000);
    } catch (err: any) {
      setPasswordStatus({
        loading: false,
        error: err.response?.data?.detail || 'Failed to update password.',
        success: '',
      });
    }
  };

  const handleGenerateLinkCode = async () => {
    setTelegramStatus({ loading: true, error: '', success: '' });
    setCodeCopied(false);
    try {
      const code = await telegramAPI.generateLinkCode();
      setLinkCode(code);
      setTelegramStatus(idle);
    } catch (err: any) {
      setTelegramStatus({
        loading: false,
        error: err.response?.data?.detail || 'Failed to generate code.',
        success: '',
      });
    }
  };

  const handleUnlinkTelegram = async () => {
    setTelegramStatus({ loading: true, error: '', success: '' });
    try {
      await telegramAPI.unlink();
      setTelegram({ linked: false, chat_id_masked: null });
      setLinkCode(null);
      setTelegramStatus({ loading: false, error: '', success: 'Telegram unlinked.' });
      setTimeout(() => setTelegramStatus(idle), 3000);
    } catch (err: any) {
      setTelegramStatus({
        loading: false,
        error: err.response?.data?.detail || 'Failed to unlink.',
        success: '',
      });
    }
  };

  const handleCopyCode = async () => {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(`/start ${linkCode.code}`);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      /* clipboard API blocked — user can still copy manually */
    }
  };

  const initials = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : '??';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and settings</p>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* ── Profile Information ─────────────────────────────────── */}
        <form onSubmit={handleSaveProfile} className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-xl">
              <User size={20} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Profile</h3>
          </div>

          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 pb-6 border-b border-border">
              <div className="relative group">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-foreground text-2xl font-semibold">
                    {userLoading ? '…' : initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarStatus.loading}
                  className="absolute inset-0 rounded-full bg-foreground/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity disabled:cursor-not-allowed"
                  aria-label="Change avatar"
                >
                  {avatarStatus.loading
                    ? <Loader2 size={20} className="text-white animate-spin" />
                    : <Camera size={20} className="text-white" />}
                </button>
              </div>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={handleAvatarChange}
              />

              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarStatus.loading}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
              >
                {avatarStatus.loading ? 'Uploading…' : 'Change Avatar'}
              </button>

              {avatarStatus.error && (
                <p className="text-xs text-destructive text-center">{avatarStatus.error}</p>
              )}
              {avatarStatus.success && (
                <p className="text-xs text-emerald-600 text-center">{avatarStatus.success}</p>
              )}
            </div>

            {/* Email — read-only (changing email requires re-verification) */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-foreground">
                Email Address
              </label>
              <input
                type="email"
                value={userLoading ? '…' : (user?.email ?? '')}
                readOnly
                className="w-full px-4 py-2.5 bg-muted border border-border text-muted-foreground rounded-lg text-sm cursor-not-allowed select-all"
                title="Email cannot be changed"
              />
              <p className="mt-1 text-xs text-muted-foreground">Email changes require re-verification and are not supported yet.</p>
            </div>

            {/* Username — editable */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-foreground">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={50}
                required
                className="w-full px-4 py-2.5 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              />
            </div>

            {profileStatus.error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                <AlertCircle size={15} className="shrink-0" />
                {profileStatus.error}
              </div>
            )}
            {profileStatus.success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-lg">
                <Check size={15} className="shrink-0" />
                {profileStatus.success}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="medium"
              className="w-full"
              disabled={profileStatus.loading || userLoading || username === user?.username}
            >
              {profileStatus.loading
                ? <><Loader2 className="animate-spin" size={16} /> Saving…</>
                : 'Save Changes'}
            </Button>
          </div>
        </form>

        {/* ── Security ────────────────────────────────────────────── */}
        <form onSubmit={handlePasswordSubmit} className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Lock size={20} className="text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Security</h3>
          </div>

          <div className="space-y-4">
            {passwordStatus.error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                <AlertCircle size={15} className="shrink-0" />
                {passwordStatus.error}
              </div>
            )}
            {passwordStatus.success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-lg">
                <Check size={15} className="shrink-0" />
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
              placeholder="At least 8 characters"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Repeat new password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />

            <Button
              type="submit"
              variant="primary"
              size="medium"
              className="w-full"
              disabled={passwordStatus.loading}
            >
              {passwordStatus.loading
                ? <><Loader2 className="animate-spin" size={16} /> Updating…</>
                : 'Update Password'}
            </Button>
          </div>
        </form>

        {/* ── Preferences column ──────────────────────────────────── */}
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
              {(Object.entries(notifications) as [keyof typeof defaultNotifications, boolean][]).map(([key, value]) => {
                const labels: Record<keyof typeof defaultNotifications, string> = {
                  budgetAlerts: 'Budget Alerts',
                  achievementUnlocked: 'Achievement Unlocked',
                  weeklyReport: 'Weekly Report',
                  monthlyReport: 'Monthly Report',
                };
                return (
                  <label key={key} className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {labels[key]}
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted rounded-full peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/50 transition-all">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm" />
                      </div>
                    </div>
                  </label>
                );
              })}
              <p className="text-xs text-muted-foreground pt-1">Notification preferences are saved locally.</p>
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
                <label className="block mb-1.5 text-sm font-medium text-foreground">Currency</label>
                <select
                  value={preferences.currency}
                  onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                  className="w-full px-4 py-2.5 bg-input border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm appearance-none cursor-pointer"
                >
                  <option value="MAD">MAD – Moroccan Dirham</option>
                  <option value="USD">USD – US Dollar</option>
                  <option value="EUR">EUR – Euro</option>
                  <option value="GBP">GBP – British Pound</option>
                </select>
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-medium text-foreground">Language</label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  className="w-full px-4 py-2.5 bg-input border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm appearance-none cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="French">Français</option>
                  <option value="Arabic">العربية</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">Display preferences are saved locally.</p>
            </div>
          </div>

          {/* Telegram */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-sky-500/10 rounded-xl">
                <MessageCircle size={20} className="text-sky-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Telegram</h3>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Message TrackFinance on Telegram to log spending or ask questions, e.g.{' '}
                <span className="text-foreground">“I spent 50 MAD on lunch”</span>.
              </p>

              {telegramStatus.error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                  <AlertCircle size={15} className="shrink-0" />
                  {telegramStatus.error}
                </div>
              )}
              {telegramStatus.success && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-lg">
                  <Check size={15} className="shrink-0" />
                  {telegramStatus.success}
                </div>
              )}

              {telegram?.linked ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <Check size={15} />
                      <span>Connected{telegram.chat_id_masked ? ` (${telegram.chat_id_masked})` : ''}</span>
                    </div>
                  </div>

                  {/* Notifications toggle */}
                  <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <div className="text-sm font-medium text-foreground">DM notifications</div>
                      <div className="text-xs text-muted-foreground">
                        Budget alerts, achievements, weekly digest, auto-posted recurring transactions.
                      </div>
                    </div>
                    <div className="relative ml-3 shrink-0">
                      <input
                        type="checkbox"
                        checked={user?.telegram_notifications_enabled !== false}
                        onChange={async (e) => {
                          const next = e.target.checked;
                          // Optimistic update
                          setUser((u: any) => ({ ...(u || {}), telegram_notifications_enabled: next }));
                          try {
                            const res = await authAPI.updateProfile({ telegram_notifications_enabled: next });
                            setUser(res.data);
                          } catch {
                            // Revert on failure
                            setUser((u: any) => ({ ...(u || {}), telegram_notifications_enabled: !next }));
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted rounded-full peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/50 transition-all">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm" />
                      </div>
                    </div>
                  </label>

                  <Button
                    type="button"
                    variant="secondary"
                    size="medium"
                    className="w-full"
                    onClick={handleUnlinkTelegram}
                    disabled={telegramStatus.loading}
                  >
                    {telegramStatus.loading
                      ? <><Loader2 className="animate-spin" size={16} /> Unlinking…</>
                      : <><Unlink size={16} /> Unlink Telegram</>}
                  </Button>
                </div>
              ) : linkCode ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-2">Your one-time code (expires in 10 minutes)</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-xl font-mono font-semibold tracking-widest text-foreground select-all">
                        {linkCode.code}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="p-2 rounded-md hover:bg-muted transition-colors"
                        title="Copy /start command"
                        aria-label="Copy"
                      >
                        {codeCopied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} className="text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                  <a
                    href={linkCode.deeplink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 text-sm font-medium transition-colors"
                  >
                    <Send size={16} /> Open in Telegram
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Telegram will open with{' '}
                    <code className="px-1 py-0.5 rounded bg-muted text-foreground">/start {linkCode.code}</code>{' '}
                    pre-filled. Just tap send.
                  </p>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="medium"
                  className="w-full"
                  onClick={handleGenerateLinkCode}
                  disabled={telegramStatus.loading}
                >
                  {telegramStatus.loading
                    ? <><Loader2 className="animate-spin" size={16} /> Generating…</>
                    : <><Send size={16} /> Connect Telegram</>}
                </Button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
