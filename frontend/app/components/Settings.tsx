import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Bell, Globe, Camera, Loader2, Check, AlertCircle, MessageCircle, Send, Copy, Unlink } from 'lucide-react';
import { authAPI, telegramAPI, type TelegramStatus, type TelegramLinkCode } from '../api';
import {
  C,
  MONO,
  FONT,
  Page,
  PageHeader,
  Card,
  SectionTitle,
  PrimaryButton,
  DSStyles,
} from './ds';

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

// ── Shared visual atoms (local to Settings) ──────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  background: C.card,
  border: `1px solid ${C.border}`,
  color: C.ink,
  borderRadius: 8,
  fontSize: 13.5,
  fontFamily: FONT,
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 500,
  color: C.ink2,
};

function SettingsCard({
  icon: Icon,
  title,
  tint,
  iconColor,
  children,
  onSubmit,
}: {
  icon: typeof User;
  title: string;
  tint: string;
  iconColor: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
}) {
  const inner = (
    <>
      <div className="flex items-center" style={{ gap: 12, marginBottom: 20 }}>
        <div className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 8, background: tint, color: iconColor }}>
          <Icon size={18} strokeWidth={1.7} />
        </div>
        <SectionTitle title={title} />
      </div>
      {children}
    </>
  );
  return onSubmit ? (
    <form onSubmit={onSubmit}>
      <Card style={{ padding: 22 }}>{inner}</Card>
    </form>
  ) : (
    <Card style={{ padding: 22 }}>{inner}</Card>
  );
}

function StatusBanner({ kind, message }: { kind: 'error' | 'success'; message: string }) {
  const isError = kind === 'error';
  return (
    <div
      className="flex items-center"
      style={{
        gap: 8,
        padding: 12,
        borderRadius: 8,
        fontSize: 13,
        color: isError ? C.over : C.incomeText,
        background: isError ? C.overSoft : C.incomeSoft,
        border: `1px solid ${isError ? 'rgba(196,69,69,0.3)' : 'rgba(91,163,114,0.3)'}`,
      }}
    >
      {isError ? <AlertCircle size={15} className="shrink-0" /> : <Check size={15} className="shrink-0" />}
      {message}
    </div>
  );
}

// Terracotta-tinted toggle switch (recolors the old emerald/primary switch).
function Toggle({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; ariaLabel?: string }) {
  return (
    <span className="relative inline-block" style={{ width: 44, height: 24, flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={onChange} aria-label={ariaLabel} className="sr-only peer" />
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 999,
          background: checked ? C.accent : C.divider,
          border: `1px solid ${checked ? C.accent : C.border}`,
          transition: 'background 150ms, border-color 150ms',
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 22 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 2px rgba(26,24,21,0.2)',
          transition: 'left 150ms',
        }}
      />
    </span>
  );
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
    <Page>
      <DSStyles />
      <style>{`
        .set-input:focus{border-color:${C.accent} !important;box-shadow:0 0 0 3px ${C.accentSoft};}
        .set-link:hover{background:${C.accentDark} !important;}
        .set-iconbtn:hover{background:${C.divider};}
        @media (max-width:1024px){.set-grid{grid-template-columns:minmax(0,1fr) !important;}}
      `}</style>

      <PageHeader eyebrow="Preferences" title="Settings" />

      <div className="set-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 24, marginTop: 26, alignItems: 'start' }}>

        {/* ── Profile Information ─────────────────────────────────── */}
        <SettingsCard icon={User} title="Profile" tint={C.accentSoft} iconColor={C.accent} onSubmit={handleSaveProfile}>
          <div className="flex flex-col" style={{ gap: 16 }}>
            {/* Avatar */}
            <div className="flex flex-col items-center" style={{ gap: 10, paddingBottom: 20, borderBottom: `1px solid ${C.divider}` }}>
              <div className="relative group">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center"
                    style={{ width: 80, height: 80, borderRadius: '50%', background: C.divider, color: C.ink, fontSize: 24, fontWeight: 600 }}
                  >
                    {userLoading ? '…' : initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarStatus.loading}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                  style={{ borderRadius: '50%', background: 'rgba(26,24,21,0.5)', border: 0, cursor: 'pointer' }}
                  aria-label="Change avatar"
                >
                  {avatarStatus.loading
                    ? <Loader2 size={20} className="animate-spin" style={{ color: '#fff' }} />
                    : <Camera size={20} style={{ color: '#fff' }} />}
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
                style={{ background: 'none', border: 0, fontSize: 13, fontWeight: 500, color: C.accent, cursor: 'pointer', fontFamily: FONT }}
                className="disabled:opacity-50"
              >
                {avatarStatus.loading ? 'Uploading…' : 'Change Avatar'}
              </button>

              {avatarStatus.error && (
                <p style={{ fontSize: 12, color: C.over, textAlign: 'center' }}>{avatarStatus.error}</p>
              )}
              {avatarStatus.success && (
                <p style={{ fontSize: 12, color: C.incomeText, textAlign: 'center' }}>{avatarStatus.success}</p>
              )}
            </div>

            {/* Email — read-only (changing email requires re-verification) */}
            <div>
              <label style={fieldLabelStyle}>Email Address</label>
              <input
                type="email"
                value={userLoading ? '…' : (user?.email ?? '')}
                readOnly
                style={{ ...inputStyle, background: C.paper, color: C.muted, cursor: 'not-allowed' }}
                className="select-all"
                title="Email cannot be changed"
              />
              <p style={{ marginTop: 6, fontSize: 12, color: C.muted }}>Email changes require re-verification and are not supported yet.</p>
            </div>

            {/* Username — editable */}
            <div>
              <label style={fieldLabelStyle}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={50}
                required
                style={inputStyle}
                className="set-input"
              />
            </div>

            {profileStatus.error && <StatusBanner kind="error" message={profileStatus.error} />}
            {profileStatus.success && <StatusBanner kind="success" message={profileStatus.success} />}

            <PrimaryButton
              type="submit"
              style={{ width: '100%' }}
              disabled={profileStatus.loading || userLoading || username === user?.username}
            >
              {profileStatus.loading
                ? <><Loader2 className="animate-spin" size={16} /> Saving…</>
                : 'Save Changes'}
            </PrimaryButton>
          </div>
        </SettingsCard>

        {/* ── Security ────────────────────────────────────────────── */}
        <SettingsCard icon={Lock} title="Security" tint={C.incomeSoft} iconColor={C.income} onSubmit={handlePasswordSubmit}>
          <div className="flex flex-col" style={{ gap: 16 }}>
            {passwordStatus.error && <StatusBanner kind="error" message={passwordStatus.error} />}
            {passwordStatus.success && <StatusBanner kind="success" message={passwordStatus.success} />}

            <div>
              <label style={fieldLabelStyle}>Current Password</label>
              <input
                type="password"
                placeholder="Enter current password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                style={inputStyle}
                className="set-input"
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>New Password</label>
              <input
                type="password"
                placeholder="At least 8 characters"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                style={inputStyle}
                className="set-input"
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Confirm New Password</label>
              <input
                type="password"
                placeholder="Repeat new password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                style={inputStyle}
                className="set-input"
              />
            </div>

            <PrimaryButton type="submit" style={{ width: '100%' }} disabled={passwordStatus.loading}>
              {passwordStatus.loading
                ? <><Loader2 className="animate-spin" size={16} /> Updating…</>
                : 'Update Password'}
            </PrimaryButton>
          </div>
        </SettingsCard>

        {/* ── Preferences column ──────────────────────────────────── */}
        <div className="flex flex-col" style={{ gap: 24 }}>

          {/* Notifications */}
          <SettingsCard icon={Bell} title="Notifications" tint="rgba(59,130,163,0.14)" iconColor={C.blue}>
            <div className="flex flex-col" style={{ gap: 16 }}>
              {(Object.entries(notifications) as [keyof typeof defaultNotifications, boolean][]).map(([key, value]) => {
                const labels: Record<keyof typeof defaultNotifications, string> = {
                  budgetAlerts: 'Budget Alerts',
                  achievementUnlocked: 'Achievement Unlocked',
                  weeklyReport: 'Weekly Report',
                  monthlyReport: 'Monthly Report',
                };
                return (
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <span style={{ fontSize: 13.5, color: C.ink2 }}>{labels[key]}</span>
                    <Toggle
                      checked={value}
                      ariaLabel={labels[key]}
                      onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                    />
                  </label>
                );
              })}
              <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Notification preferences are saved locally.</p>
            </div>
          </SettingsCard>

          {/* Display Preferences */}
          <SettingsCard icon={Globe} title="Display" tint={C.accentSoft} iconColor={C.accent}>
            <div className="flex flex-col" style={{ gap: 16 }}>
              <div>
                <label style={fieldLabelStyle}>Currency</label>
                <select
                  value={preferences.currency}
                  onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                  style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                  className="set-input"
                >
                  <option value="MAD">MAD – Moroccan Dirham</option>
                  <option value="USD">USD – US Dollar</option>
                  <option value="EUR">EUR – Euro</option>
                  <option value="GBP">GBP – British Pound</option>
                </select>
              </div>

              <div>
                <label style={fieldLabelStyle}>Language</label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                  className="set-input"
                >
                  <option value="English">English</option>
                  <option value="French">Français</option>
                  <option value="Arabic">العربية</option>
                </select>
              </div>
              <p style={{ fontSize: 12, color: C.muted }}>Display preferences are saved locally.</p>
            </div>
          </SettingsCard>

          {/* Telegram */}
          <SettingsCard icon={MessageCircle} title="Telegram" tint={C.accentSoft} iconColor={C.accent}>
            <div className="flex flex-col" style={{ gap: 16 }}>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                Message TrackFinance on Telegram to log spending or ask questions, e.g.{' '}
                <span style={{ color: C.ink2 }}>“I spent 50 MAD on lunch”</span>.
              </p>

              {telegramStatus.error && <StatusBanner kind="error" message={telegramStatus.error} />}
              {telegramStatus.success && <StatusBanner kind="success" message={telegramStatus.success} />}

              {telegram?.linked ? (
                <div className="flex flex-col" style={{ gap: 12 }}>
                  <div
                    className="flex items-center justify-between"
                    style={{ padding: 12, borderRadius: 8, background: C.incomeSoft, border: `1px solid rgba(91,163,114,0.3)` }}
                  >
                    <div className="flex items-center" style={{ gap: 8, fontSize: 13, color: C.incomeText }}>
                      <Check size={15} />
                      <span>Connected{telegram.chat_id_masked ? ` (${telegram.chat_id_masked})` : ''}</span>
                    </div>
                  </div>

                  {/* Notifications toggle */}
                  <label className="flex items-center justify-between cursor-pointer" style={{ padding: 12, borderRadius: 8, background: C.paper, border: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: C.ink }}>DM notifications</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                        Budget alerts, achievements, weekly digest, auto-posted recurring transactions.
                      </div>
                    </div>
                    <div className="ml-3 shrink-0">
                      <Toggle
                        checked={user?.telegram_notifications_enabled !== false}
                        ariaLabel="DM notifications"
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
                      />
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={handleUnlinkTelegram}
                    disabled={telegramStatus.loading}
                    className="inline-flex items-center justify-center disabled:opacity-60"
                    style={{
                      width: '100%',
                      gap: 7,
                      padding: '9px 15px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      fontFamily: FONT,
                      color: C.over,
                      background: C.card,
                      border: `1px solid ${C.over}`,
                      cursor: telegramStatus.loading ? 'default' : 'pointer',
                    }}
                  >
                    {telegramStatus.loading
                      ? <><Loader2 className="animate-spin" size={16} /> Unlinking…</>
                      : <><Unlink size={16} /> Unlink Telegram</>}
                  </button>
                </div>
              ) : linkCode ? (
                <div className="flex flex-col" style={{ gap: 12 }}>
                  <div style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: C.paper, padding: 16, textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Your one-time code (expires in 10 minutes)</p>
                    <div className="flex items-center justify-center" style={{ gap: 8 }}>
                      <code style={{ fontSize: 20, fontFamily: MONO, fontWeight: 600, letterSpacing: '0.18em', color: C.ink }} className="select-all">
                        {linkCode.code}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="set-iconbtn flex items-center justify-center"
                        style={{ padding: 8, borderRadius: 6, border: 0, background: 'transparent', cursor: 'pointer', transition: 'background 150ms' }}
                        title="Copy /start command"
                        aria-label="Copy"
                      >
                        {codeCopied ? <Check size={15} style={{ color: C.income }} /> : <Copy size={15} style={{ color: C.muted }} />}
                      </button>
                    </div>
                  </div>
                  <a
                    href={linkCode.deeplink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="set-link inline-flex w-full items-center justify-center"
                    style={{ gap: 8, borderRadius: 8, background: C.accent, color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 500, transition: 'background 150ms' }}
                  >
                    <Send size={16} /> Open in Telegram
                  </a>
                  <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                    Telegram will open with{' '}
                    <code style={{ padding: '1px 5px', borderRadius: 4, background: C.divider, color: C.ink2, fontFamily: MONO }}>/start {linkCode.code}</code>{' '}
                    pre-filled. Just tap send.
                  </p>
                </div>
              ) : (
                <PrimaryButton
                  type="button"
                  style={{ width: '100%' }}
                  onClick={handleGenerateLinkCode}
                  disabled={telegramStatus.loading}
                >
                  {telegramStatus.loading
                    ? <><Loader2 className="animate-spin" size={16} /> Generating…</>
                    : <><Send size={16} /> Connect Telegram</>}
                </PrimaryButton>
              )}
            </div>
          </SettingsCard>
        </div>

      </div>
    </Page>
  );
}
