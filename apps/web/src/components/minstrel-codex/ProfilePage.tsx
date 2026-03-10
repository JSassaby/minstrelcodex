import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { DESIGN_TOKENS as DT } from '@minstrelcodex/core';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { pullSettings, pushSettings } from '@/lib/settingsSync';
import { VERSION } from '@/lib/version';
import {
  PROVIDERS,
  getProviderKey,
  setProviderKey,
  getActiveProvider,
  setActiveProvider,
  hasActiveProvider,
  getActiveModel,
  setActiveModel,
  getOllamaUrl,
  setOllamaUrl,
  getOllamaModel,
  setOllamaModel,
} from '@/lib/editorProviders';
import type { ProviderId } from '@/lib/editorProviders';

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'account' | 'preferences' | 'providers' | 'sync' | 'security' | 'about';
type AccountView = 'signin' | 'signup' | 'reset' | 'profile';

interface ProfilePageProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
  onOpenSecuritySettings: () => void;
  onOpenStorageSettings: () => void;
  onAuthSuccess: (label: string) => void;
  onSignOut: () => void;
  defaultTab?: Tab;
}

// ── Constants ──────────────────────────────────────────────────────────────

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

const TIMEZONES = [
  'Auto-detect',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Helsinki',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const SHORTCUTS = [
  ['Ctrl+Shift+B', 'Toggle file browser'],
  ['Ctrl+S', 'Save'],
  ['Ctrl+N', 'New file'],
  ['Ctrl+Z', 'Undo'],
  ['Ctrl+Shift+V', 'Quick snapshot'],
  ['Ctrl+=', 'Increase font size'],
  ['Ctrl+-', 'Decrease font size'],
  ['F11', 'Focus / typewriter mode'],
  ['Ctrl+Shift+U', 'Writer Dashboard'],
  ['Ctrl+P', 'Print'],
  ['ESC', 'Close panel / open menu'],
  ['↑ ↓', 'Navigate file browser'],
  ['N', 'New file in browser'],
  ['Shift+N', 'New folder in browser'],
  ['F2', 'Rename file in browser'],
  ['Delete', 'Delete item in browser'],
];

// ── Helpers ────────────────────────────────────────────────────────────────

function nameToColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 55%, 38%)`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

// ── Style helpers ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', border: '1px solid #2a3550', borderRadius: 0,
  background: '#0a0f1a', color: '#c8c8c8', fontSize: '13px', fontFamily: uiFont, outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: 600,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--terminal-accent)', fontFamily: uiFont,
  marginBottom: '6px',
};

const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '10px 0', background: '#4ecdc4', border: '1px solid #4ecdc4',
  borderRadius: 0, color: '#0a0a0a', fontFamily: uiFont, fontSize: '13px', fontWeight: 600,
  letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  padding: '8px 16px', background: 'transparent', border: '1px solid #444',
  borderRadius: 0, color: '#c8c8c8', fontFamily: uiFont, fontSize: '12px',
  cursor: 'pointer', letterSpacing: '0.04em',
};

const linkStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#4ecdc4', fontFamily: uiFont,
  fontSize: '12px', cursor: 'pointer', padding: 0, textDecoration: 'underline',
};

const sectionHeader = (label: string) => (
  <div style={{
    fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--terminal-accent)',
    fontFamily: uiFont, marginBottom: '14px', marginTop: '4px',
  }}>{label}</div>
);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

// ── Google SVG ─────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function AuthForms({
  onAuthSuccess,
}: {
  onAuthSuccess: (label: string) => void;
}) {
  const [view, setView] = useState<AccountView>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  function switchView(v: AccountView) { setView(v); setError(''); setInfo(''); }

  async function handleSignIn() {
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setLoading(true); setError('');
    const { data, error: e } = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (e) { setError(e.message); return; }
    if (data.user) {
      try { await pullSettings(data.user.id); } catch {}
      onAuthSuccess(data.user.user_metadata?.full_name || data.user.user_metadata?.display_name || data.user.email || 'you');
    }
  }

  async function handleSignUp() {
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    const { data, error: e } = await signUpWithEmail(email.trim(), password, displayName.trim());
    setLoading(false);
    if (e) { setError(e.message); return; }
    if (data.user && !data.user.email_confirmed_at) {
      setInfo('Account created! Check your email to confirm before signing in.');
      return;
    }
    if (data.user) {
      try { await pullSettings(data.user.id); } catch {}
      onAuthSuccess(displayName.trim() || data.user.email || 'you');
    }
  }

  async function handleReset() {
    if (!email.trim()) { setError('Enter your email address.'); return; }
    setLoading(true); setError('');
    const { error: e } = await resetPassword(email.trim());
    setLoading(false);
    if (e) { setError(e.message); return; }
    setInfo('Reset email sent. Check your inbox.');
  }

  return (
    <div>
      {sectionHeader('Sign In to Your Account')}
      <p style={{ fontSize: '13px', color: '#888', fontFamily: uiFont, lineHeight: 1.5, marginBottom: '20px' }}>
        Sign in to sync your settings and files across devices. Your work is always saved locally — an account is optional.
      </p>

      {error && (
        <div style={{ padding: '9px 12px', marginBottom: '14px', border: '1px solid rgba(224,92,92,0.35)', background: 'rgba(224,92,92,0.07)', fontSize: '12px', color: '#e05c5c', lineHeight: 1.4 }}>
          {error}
        </div>
      )}
      {info && (
        <div style={{ padding: '9px 12px', marginBottom: '14px', border: '1px solid rgba(78,205,196,0.3)', background: 'rgba(78,205,196,0.06)', fontSize: '12px', color: '#4ecdc4', lineHeight: 1.4 }}>
          {info}
        </div>
      )}

      {view === 'signin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '9px 0', background: 'transparent', border: '1px solid #444', borderRadius: 0, color: '#c8c8c8', fontFamily: uiFont, fontSize: '13px', cursor: 'pointer' }}
            onClick={signInWithGoogle}
          >
            <GoogleIcon /> Continue with Google
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }} />
            <span style={{ fontSize: '11px', color: '#555' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }} />
          </div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoFocus style={inputStyle} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" onKeyDown={e => { if (e.key === 'Enter') handleSignIn(); }} style={inputStyle} />
          <button onClick={handleSignIn} disabled={loading} style={primaryBtn}>{loading ? 'Signing in…' : 'Sign In'}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => switchView('signup')} style={linkStyle}>No account? Sign up</button>
            <button onClick={() => switchView('reset')} style={linkStyle}>Forgot password?</button>
          </div>
        </div>
      )}

      {view === 'signup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name (optional)" autoFocus style={inputStyle} />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" style={inputStyle} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={inputStyle} />
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" onKeyDown={e => { if (e.key === 'Enter') handleSignUp(); }} style={inputStyle} />
          <div style={{ fontSize: '11px', color: '#555' }}>Min 8 characters</div>
          <button onClick={handleSignUp} disabled={loading} style={primaryBtn}>{loading ? 'Creating account…' : 'Create Account'}</button>
          <button onClick={() => switchView('signin')} style={{ ...linkStyle, textAlign: 'center' as const }}>Already have an account? Sign in</button>
        </div>
      )}

      {view === 'reset' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoFocus style={inputStyle} onKeyDown={e => { if (e.key === 'Enter') handleReset(); }} />
          <button onClick={handleReset} disabled={loading} style={primaryBtn}>{loading ? 'Sending…' : 'Send Reset Email'}</button>
          <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.4 }}>Requires internet connection.</div>
          <button onClick={() => switchView('signin')} style={linkStyle}>← Back to sign in</button>
        </div>
      )}
    </div>
  );
}

function AccountProfile({
  user,
  onSignOut,
}: {
  user: User;
  onSignOut: () => void;
}) {
  const name = user.user_metadata?.full_name || user.user_metadata?.display_name || user.email || '?';
  const initials = name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [deleteStage, setDeleteStage] = useState<'idle' | 'confirm'>('idle');
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const provider = user.app_metadata?.provider;
  const providerLabel = provider === 'google' ? 'Google Account' : 'Email Account';

  async function saveName() {
    if (!nameValue.trim()) { setEditingName(false); return; }
    setSaving(true);
    try {
      await supabase.from('user_profiles').upsert({ id: user.id, display_name: nameValue.trim(), updated_at: new Date().toISOString() });
      await supabase.auth.updateUser({ data: { display_name: nameValue.trim() } });
    } catch {}
    setSaving(false);
    setEditingName(false);
  }

  async function handleDelete() {
    if (deleteInput !== 'DELETE') { setDeleteError('Type DELETE to confirm.'); return; }
    try {
      // Sign out first — full account deletion requires a server-side call
      await supabase.auth.signOut();
      onSignOut();
    } catch {
      setDeleteError('Could not complete deletion. Please contact support.');
    }
  }

  return (
    <div>
      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '28px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: nameToColor(name), display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '24px', fontWeight: 600, color: '#fff', flexShrink: 0,
        }}>{initials}</div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#c8c8c8', fontFamily: uiFont, marginBottom: '4px' }}>{nameValue}</div>
          <div style={{ fontSize: '11px', color: '#555', fontFamily: uiFont }}>{providerLabel}</div>
        </div>
      </div>

      {/* Display name */}
      <Field label="Display Name">
        {editingName ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              autoFocus
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={saveName} disabled={saving} style={{ ...ghostBtn, borderColor: '#4ecdc4', color: '#4ecdc4' }}>
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditingName(false)} style={ghostBtn}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#c8c8c8', fontFamily: uiFont }}>{nameValue}</span>
            <button onClick={() => setEditingName(true)} style={linkStyle}>Edit</button>
          </div>
        )}
      </Field>

      {/* Email */}
      <Field label="Email">
        <span style={{ fontSize: '13px', color: '#888', fontFamily: uiFont }}>{user.email}</span>
      </Field>

      {/* Sign out */}
      <button
        onClick={onSignOut}
        style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #e05c5c', borderRadius: 0, color: '#e05c5c', fontFamily: uiFont, fontSize: '12px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' }}
      >
        Sign Out
      </button>

      {/* Delete account */}
      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #1a2540' }}>
        {deleteStage === 'idle' ? (
          <button onClick={() => setDeleteStage('confirm')} style={{ ...linkStyle, color: '#555', fontSize: '11px' }}>
            Delete Account…
          </button>
        ) : (
          <div>
            <div style={{ fontSize: '12px', color: '#e05c5c', fontFamily: uiFont, lineHeight: 1.5, marginBottom: '12px' }}>
              <strong>This permanently deletes your account and all synced data.</strong><br />
              Your local files are not affected.
            </div>
            <div style={{ fontSize: '12px', color: '#888', fontFamily: uiFont, marginBottom: '8px' }}>
              Type <strong style={{ color: '#e05c5c' }}>DELETE</strong> to confirm:
            </div>
            {deleteError && <div style={{ fontSize: '12px', color: '#e05c5c', marginBottom: '8px' }}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                autoFocus
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="DELETE"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={handleDelete} style={{ ...ghostBtn, borderColor: '#e05c5c', color: '#e05c5c' }}>Confirm</button>
              <button onClick={() => { setDeleteStage('idle'); setDeleteInput(''); setDeleteError(''); }} style={ghostBtn}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreferencesTab({ user, onSync }: { user: User | null; onSync: () => void }) {
  const [goal, setGoal] = useState(() => parseInt(localStorage.getItem('mc-word-count-target') || '500', 10));
  const [timezone, setTimezone] = useState(() => localStorage.getItem('minstrel-timezone') || 'Auto-detect');
  const [saved, setSaved] = useState(false);

  const theme = localStorage.getItem('pw-theme-mode') || 'terminal';
  const lang = localStorage.getItem('pw-language') || 'en-GB';

  async function save() {
    localStorage.setItem('mc-word-count-target', String(goal));
    localStorage.setItem('minstrel-timezone', timezone);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (user) onSync();
  }

  return (
    <div>
      {!user && (
        <div style={{ padding: '10px 14px', borderLeft: '3px solid #555', background: 'rgba(255,255,255,0.03)', fontSize: '12px', color: '#888', fontFamily: uiFont, marginBottom: '20px', lineHeight: 1.5 }}>
          Sign in to save preferences to your profile and sync them across devices.
        </div>
      )}

      <Field label="Writing Goal (words/day)">
        <input
          type="number"
          value={goal}
          onChange={e => setGoal(Math.max(100, Math.min(10000, Number(e.target.value))))}
          min={100} max={10000} step={50}
          style={inputStyle}
        />
        <div style={{ fontSize: '11px', color: '#555', marginTop: '5px', fontFamily: uiFont }}>Used for daily progress tracking.</div>
      </Field>

      <Field label="Timezone">
        <select
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}
        >
          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </select>
        <div style={{ fontSize: '11px', color: '#555', marginTop: '5px', fontFamily: uiFont }}>Used for streak calculation and daily reset.</div>
      </Field>

      <Field label="Theme">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#c8c8c8', fontFamily: uiFont, textTransform: 'capitalize' }}>{theme}</span>
          <span style={{ fontSize: '11px', color: '#555', fontFamily: uiFont }}>— Change in Settings → Theme</span>
        </div>
      </Field>

      <Field label="Language">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#c8c8c8', fontFamily: uiFont }}>{lang}</span>
          <span style={{ fontSize: '11px', color: '#555', fontFamily: uiFont }}>— Change in Settings → Language</span>
        </div>
      </Field>

      <button onClick={save} style={primaryBtn}>
        {saved ? 'Saved ✓' : 'Save Preferences'}
      </button>
    </div>
  );
}

function SyncTab({ user, onSwitchTab }: { user: User | null; onSwitchTab: (t: Tab) => void }) {
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const lastSynced = localStorage.getItem('minstrel-last-synced');

  async function handleSyncNow() {
    if (!user) return;
    setSyncing(true);
    await pushSettings(user.id);
    setSyncing(false);
    setSyncDone(true);
    setTimeout(() => setSyncDone(false), 3000);
  }

  if (!user) {
    return (
      <div>
        {sectionHeader('Cross-Device Sync')}
        <p style={{ fontSize: '13px', color: '#888', fontFamily: uiFont, marginBottom: '16px', lineHeight: 1.5 }}>
          Sign in on the Account tab to enable cross-device sync.
        </p>
        <button onClick={() => onSwitchTab('account')} style={ghostBtn}>Go to Account</button>
      </div>
    );
  }

  const WHAT_SYNCS_LEFT = ['Theme', 'Font', 'Font size', 'Language', 'Accessibility settings', 'Music preferences', 'Writing goal', 'Timezone'];
  const WHAT_SYNCS_RIGHT = ['File structure', 'All documents', 'Project settings', 'Renown & level', 'Streaks', 'Chronicles'];

  return (
    <div>
      {sectionHeader('Cross-Device Sync')}

      {/* Sync status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', color: '#888', fontFamily: uiFont }}>
          Last synced: {lastSynced ? relativeTime(lastSynced) : 'Never'}
        </div>
        <button onClick={handleSyncNow} disabled={syncing} style={{ ...ghostBtn, borderColor: '#4ecdc4', color: '#4ecdc4', padding: '5px 14px' }}>
          {syncing ? 'Syncing…' : syncDone ? 'Synced ✓' : 'Sync Now'}
        </button>
      </div>

      {/* What syncs */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', fontFamily: uiFont, marginBottom: '10px' }}>WHAT SYNCS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
          {[...WHAT_SYNCS_LEFT.map((s, i) => <div key={'l' + i} style={{ fontSize: '12px', color: '#888', fontFamily: uiFont, padding: '2px 0' }}>· {s}</div>),
             ...WHAT_SYNCS_RIGHT.map((s, i) => <div key={'r' + i} style={{ fontSize: '12px', color: '#888', fontFamily: uiFont, padding: '2px 0', gridColumn: '2' }}>· {s}</div>)]}
        </div>
      </div>

      {/* Behaviour */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', fontFamily: uiFont, marginBottom: '8px' }}>SYNC BEHAVIOUR</div>
        <p style={{ fontSize: '12px', color: '#888', fontFamily: uiFont, lineHeight: 1.6 }}>
          Changes sync automatically in the background. If you go offline, changes are queued and pushed when you reconnect. On sign-in, cloud data is merged with your local data — nothing is deleted.
        </p>
      </div>

      {/* Google Drive */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', fontFamily: uiFont, marginBottom: '8px' }}>GOOGLE DRIVE</div>
        <p style={{ fontSize: '12px', color: '#888', fontFamily: uiFont, lineHeight: 1.6, marginBottom: '8px' }}>
          Google Drive sync is a separate feature for file backup and is configured in Settings → Storage. It works independently of your Minstrel account sync.
        </p>
      </div>
    </div>
  );
}

function SecurityTab({ onOpenSecuritySettings }: { onOpenSecuritySettings: () => void }) {
  return (
    <div>
      {sectionHeader('Security')}
      <p style={{ fontSize: '13px', color: '#888', fontFamily: uiFont, lineHeight: 1.6, marginBottom: '20px' }}>
        PIN lock and security settings are managed in the main Settings panel.
      </p>
      <button onClick={onOpenSecuritySettings} style={ghostBtn}>Open Security Settings</button>
    </div>
  );
}

function AboutTab() {
  return (
    <div>
      {/* App identity */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#c8a84b', marginBottom: '6px' }}>
          Minstrel Codex
        </div>
        <div style={{ fontSize: '11px', color: '#555', fontFamily: uiFont, marginBottom: '10px' }}>Version {VERSION}</div>
        <div style={{ fontSize: '13px', color: '#888', fontFamily: uiFont, lineHeight: 1.6 }}>
          A distraction-free writing environment for those who take their craft seriously.
        </div>
      </div>

      {/* Built with */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', fontFamily: uiFont, marginBottom: '8px' }}>BUILT WITH</div>
        <div style={{ fontSize: '12px', color: '#888', fontFamily: uiFont, lineHeight: 1.8 }}>
          TipTap · Supabase · Vite · React · Lucide Icons
        </div>
      </div>

      {/* Philosophy */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', fontFamily: uiFont, marginBottom: '8px' }}>PHILOSOPHY</div>
        <p style={{ fontSize: '12px', color: '#888', fontFamily: uiFont, lineHeight: 1.6, marginBottom: '8px' }}>
          Minstrel Codex is built local-first. Your writing lives on your device and stays yours. Cloud sync is an opt-in layer that adds convenience — it never changes how the app works without a connection.
        </p>
        <p style={{ fontSize: '12px', color: '#888', fontFamily: uiFont, lineHeight: 1.6 }}>
          Every feature is keyboard-navigable. Every interface element is intentional. The design system enforces discipline: no decorative shadows, no unnecessary rounding, no visual noise that competes with your words.
        </p>
      </div>

      {/* Keyboard shortcuts */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', fontFamily: uiFont, marginBottom: '10px' }}>KEYBOARD SHORTCUTS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
          {SHORTCUTS.map(([key, desc], i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', padding: '4px 0', borderBottom: '1px solid #111', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--terminal-accent)', minWidth: '90px', flexShrink: 0 }}>{key}</span>
              <span style={{ fontSize: '11px', color: '#888', fontFamily: uiFont }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '11px', color: '#555', fontFamily: uiFont, paddingTop: '16px', borderTop: '1px solid #1a2540' }}>
        © 2026 Minstrel Codex. Your words are yours.
      </div>
    </div>
  );
}

function ProviderRow({
  id,
  onSaved,
}: {
  id: ProviderId;
  onSaved: () => void;
}) {
  const config = PROVIDERS[id];
  const [keyVal, setKeyVal] = useState(() => getProviderKey(id));
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ollamaUrl, setOllamaUrlLocal] = useState(() => getOllamaUrl());
  const [ollamaModelVal, setOllamaModelVal] = useState(() => getOllamaModel());
  // Reactive: re-reads whenever minstrel-editor-provider changes in localStorage
  const [isActive, setIsActive] = useState(() => getActiveProvider() === id);
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'minstrel-editor-provider') {
        setIsActive(getActiveProvider() === id);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [id]);

  const handleSave = async () => {
    if (id === 'ollama') {
      setOllamaUrl(ollamaUrl);
      setOllamaModel(ollamaModelVal);
    } else {
      await setProviderKey(id, keyVal);
    }
    // Auto-set as active if no provider is currently set
    if (!hasActiveProvider()) {
      const hasValue = id === 'ollama' ? !!ollamaModelVal : !!keyVal;
      if (hasValue) {
        setActiveProvider(id); // also dispatches StorageEvent
        setIsActive(true);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, background: '#0a0f1a', border: '1px solid #2a3550',
    borderRadius: 0, color: '#c8c8c8', fontFamily: uiFont, fontSize: '12px',
    padding: '7px 10px', outline: 'none',
  };

  return (
    <div style={{ border: '1px solid #1a2540', padding: '14px', marginBottom: '10px', background: '#0a0a0a' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', fontFamily: uiFont, color: '#c8c8c8', fontWeight: 600, flex: 1 }}>
          {config.label}
        </span>
        <span style={{
          fontSize: '10px', fontFamily: uiFont, letterSpacing: '0.06em',
          color: config.isLocal ? '#f5c542' : '#5b9cf6',
          border: `1px solid ${config.isLocal ? '#f5c54240' : '#5b9cf640'}`,
          padding: '2px 6px',
        }}>
          {config.isLocal ? 'LOCAL' : 'CLOUD'}
        </span>
        {isActive && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontFamily: uiFont, color: '#4ecdc4' }}>
            <span style={{ width: '6px', height: '6px', background: '#4ecdc4', display: 'inline-block' }} />
            Active
          </span>
        )}
      </div>

      {id === 'ollama' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
          <input
            style={{ ...inputStyle, flex: 'none', width: '100%', boxSizing: 'border-box' }}
            placeholder="http://localhost:11434"
            value={ollamaUrl}
            onChange={e => setOllamaUrlLocal(e.target.value)}
          />
          <input
            style={{ ...inputStyle, flex: 'none', width: '100%', boxSizing: 'border-box' }}
            placeholder="e.g. mistral, llama3"
            value={ollamaModelVal}
            onChange={e => setOllamaModelVal(e.target.value)}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          <input
            type={show ? 'text' : 'password'}
            style={inputStyle}
            placeholder={config.keyPlaceholder ?? ''}
            value={keyVal}
            onChange={e => setKeyVal(e.target.value)}
          />
          <button
            onClick={() => setShow(p => !p)}
            style={{ background: 'transparent', border: '1px solid #2a3550', borderRadius: 0, color: '#888', padding: '0 10px', cursor: 'pointer', fontFamily: uiFont, fontSize: '11px' }}
          >{show ? 'Hide' : 'Show'}</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={handleSave}
          style={{
            padding: '6px 14px', background: '#4ecdc4', border: 'none', borderRadius: 0,
            color: '#0a0a0a', fontFamily: uiFont, fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.04em',
          }}
        >Save</button>
        {saved && <span style={{ fontSize: '12px', fontFamily: uiFont, color: '#4ecdc4' }}>✓ Saved</span>}
        {!isActive && (id === 'ollama' ? ollamaModelVal : keyVal) && (
          <button
            onClick={() => {
              setActiveProvider(id); // dispatches StorageEvent — sibling rows update reactively
              if (id !== 'ollama' && config.models[0]) setActiveModel(id, config.models[0]);
              setIsActive(true);
              onSaved();
            }}
            style={{
              padding: '6px 14px', background: 'transparent', border: '1px solid #444',
              borderRadius: 0, color: '#888', fontFamily: uiFont, fontSize: '12px',
              cursor: 'pointer',
            }}
          >Set as active</button>
        )}
        {id !== 'ollama' && (
          <a
            href={config.keyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: 'auto', fontSize: '11px', fontFamily: uiFont, color: '#5b9cf6', textDecoration: 'none', opacity: 0.8 }}
          >Get key →</a>
        )}
      </div>

      {!config.isLocal && config.models.length > 0 && isActive && (
        <div style={{ marginTop: '10px', borderTop: '1px solid #1a2540', paddingTop: '10px' }}>
          <div style={{ fontSize: '10px', fontFamily: uiFont, color: '#555', marginBottom: '6px', letterSpacing: '0.06em' }}>MODEL</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {config.models.map(m => (
              <button
                key={m}
                onClick={() => { setActiveModel(id, m); onSaved(); }}
                style={{
                  padding: '4px 10px', background: getActiveModel(id) === m ? '#4ecdc4' : 'transparent',
                  border: `1px solid ${getActiveModel(id) === m ? '#4ecdc4' : '#333'}`,
                  borderRadius: 0, color: getActiveModel(id) === m ? '#0a0a0a' : '#888',
                  fontFamily: uiFont, fontSize: '11px', cursor: 'pointer',
                }}
              >{m}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProvidersTab() {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  return (
    <div>
      <div style={{ fontSize: '10px', fontFamily: uiFont, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4ecdc4', marginBottom: '12px' }}>
        AI Editor Providers
      </div>
      <div style={{ fontSize: '13px', fontFamily: uiFont, color: '#888', lineHeight: 1.6, marginBottom: '20px' }}>
        Add your API key for any AI provider you already use. Keys are stored locally and never shared.
      </div>

      {(Object.keys(PROVIDERS) as ProviderId[]).map(id => (
        <ProviderRow key={id} id={id} onSaved={refresh} />
      ))}

      <div style={{
        marginTop: '16px', padding: '12px 14px',
        border: '1px solid #1a2540', background: '#080c14',
        fontSize: '11px', fontFamily: uiFont, color: '#555', lineHeight: 1.65,
        borderLeft: '2px solid #1a2540',
      }}>
        Your API keys are stored securely in your browser. They are only used to make editorial feedback requests and are never sent to Minstrel servers.
      </div>
    </div>
  );
}

// ── Main ProfilePage ───────────────────────────────────────────────────────

export default function ProfilePage({
  visible, user, onClose, onOpenSecuritySettings, onOpenStorageSettings,
  onAuthSuccess, onSignOut, defaultTab = 'account',
}: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  useEffect(() => {
    if (visible) setActiveTab(defaultTab);
  }, [visible, defaultTab]);

  // Keyboard: Escape closes
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  if (!visible) return null;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'account', label: 'Account' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'providers', label: 'Providers' },
    { id: 'sync', label: 'Sync' },
    { id: 'security', label: 'Security' },
    { id: 'about', label: 'About' },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: DT.Z_INDEX.modal - 1,
        display: 'flex', alignItems: 'stretch',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        style={{
          marginLeft: 'auto',
          width: '680px',
          maxWidth: '100vw',
          background: '#0a0a0a',
          borderLeft: '1px solid #1a2540',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #1a2540',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: '#0d1117',
        }}>
          <span style={{ ...DT.TYPOGRAPHY.sectionHeader, fontSize: '11px' }}>Profile</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '4px 6px', fontFamily: uiFont }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c8c8c8'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#555'; }}
          >✕</button>
        </div>

        {/* Body: left nav + content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left nav */}
          <div style={{
            width: '140px', flexShrink: 0,
            borderRight: '1px solid #1a2540',
            padding: '12px 0', display: 'flex', flexDirection: 'column',
            background: '#0d1117',
          }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 16px', background: 'transparent', border: 'none', borderRadius: 0,
                  borderLeft: activeTab === tab.id ? '2px solid var(--terminal-accent)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--terminal-accent)' : '#666',
                  fontFamily: uiFont, fontSize: '12px', fontWeight: activeTab === tab.id ? 600 : 400,
                  cursor: 'pointer', letterSpacing: '0.02em',
                  transition: 'color 0.1s, border-color 0.1s',
                }}
                onMouseEnter={e => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.color = '#c8c8c8'; }}
                onMouseLeave={e => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.color = '#666'; }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            {activeTab === 'account' && (
              user
                ? <AccountProfile user={user} onSignOut={onSignOut} />
                : <AuthForms onAuthSuccess={onAuthSuccess} />
            )}
            {activeTab === 'preferences' && (
              <PreferencesTab
                user={user}
                onSync={() => { if (user) pushSettings(user.id).catch(() => {}); }}
              />
            )}
            {activeTab === 'providers' && <ProvidersTab />}
            {activeTab === 'sync' && (
              <SyncTab user={user} onSwitchTab={setActiveTab} />
            )}
            {activeTab === 'security' && (
              <SecurityTab onOpenSecuritySettings={onOpenSecuritySettings} />
            )}
            {activeTab === 'about' && <AboutTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
