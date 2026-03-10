import { useState } from 'react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } from '@/lib/auth';
import { pullSettings } from '@/lib/settingsSync';

type View = 'signin' | 'signup' | 'reset';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onAuthSuccess?: (label: string) => void;
  // Legacy props kept for backward compatibility (ignored — auth is handled here)
  onSignIn?: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  onSignUp?: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
}

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: '1px solid #2a3550',
  borderRadius: 0,
  background: '#0a0f1a',
  color: '#c8c8c8',
  fontSize: '13px',
  fontFamily: uiFont,
  outline: 'none',
};

function Notice() {
  return (
    <div style={{
      marginTop: '18px',
      padding: '10px 12px',
      borderLeft: '3px solid #4ecdc4',
      background: 'rgba(78,205,196,0.05)',
      fontSize: '11px',
      fontFamily: uiFont,
      color: '#888',
      lineHeight: 1.5,
    }}>
      Signing in is optional. Your work is always saved locally on this device.
      An account lets you sync settings and files across devices.
    </div>
  );
}

export default function AuthModal({ visible, onClose, onAuthSuccess }: AuthModalProps) {
  const [view, setView] = useState<View>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (!visible) return null;

  function switchView(v: View) {
    setView(v);
    setError('');
    setInfo('');
  }

  function reset() {
    setDisplayName(''); setEmail(''); setPassword(''); setConfirmPassword('');
    setError(''); setInfo(''); setLoading(false);
  }

  function close() { reset(); onClose(); }

  async function handleSignIn() {
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setLoading(true); setError('');
    const { data, error: e } = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (e) { setError(e.message); return; }
    if (data.user) {
      try { await pullSettings(data.user.id); } catch {}
      const label = data.user.user_metadata?.full_name || data.user.user_metadata?.display_name || data.user.email || 'you';
      onAuthSuccess?.(label);
    }
    close();
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
      const label = displayName.trim() || data.user.email || 'you';
      onAuthSuccess?.(label);
      close();
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

  const primaryBtnStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 0',
    background: '#4ecdc4',
    border: '1px solid #4ecdc4',
    borderRadius: 0,
    color: '#0a0a0a',
    fontFamily: uiFont,
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.65 : 1,
    textTransform: 'uppercase' as const,
  };

  const googleBtnStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 0',
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: 0,
    color: '#c8c8c8',
    fontFamily: uiFont,
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  };

  const linkStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#4ecdc4',
    fontFamily: uiFont,
    fontSize: '12px',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  };

  const GoogleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div style={{
        width: '100%', maxWidth: '420px',
        background: '#0d1117',
        border: '1px solid #1a2540',
        borderRadius: 0,
        boxShadow: 'none',
        fontFamily: uiFont,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #1a2540',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c8c8c8', opacity: 0.65 }}>
            {view === 'signin' ? 'Sign In' : view === 'signup' ? 'Create Account' : 'Reset Password'}
          </span>
          <button onClick={close} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 24px 20px' }}>

          {/* Error / info */}
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

          {/* ── SIGN IN ── */}
          {view === 'signin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button style={googleBtnStyle} onClick={signInWithGoogle}>
                <GoogleIcon /> Continue with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }} />
                <span style={{ fontSize: '11px', color: '#555' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }} />
              </div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoFocus style={inputStyle} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" onKeyDown={e => { if (e.key === 'Enter') handleSignIn(); }} style={inputStyle} />
              <button onClick={handleSignIn} disabled={loading} style={primaryBtnStyle}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <button onClick={() => switchView('signup')} style={linkStyle}>No account? Sign up</button>
                <button onClick={() => switchView('reset')} style={linkStyle}>Forgot password?</button>
              </div>
            </div>
          )}

          {/* ── SIGN UP ── */}
          {view === 'signup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name (optional)" autoFocus style={inputStyle} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" style={inputStyle} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={inputStyle} />
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" onKeyDown={e => { if (e.key === 'Enter') handleSignUp(); }} style={inputStyle} />
              <div style={{ fontSize: '11px', color: '#555' }}>Min 8 characters</div>
              <button onClick={handleSignUp} disabled={loading} style={primaryBtnStyle}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
              <button onClick={() => switchView('signin')} style={{ ...linkStyle, textAlign: 'center' as const }}>Already have an account? Sign in</button>
            </div>
          )}

          {/* ── RESET PASSWORD ── */}
          {view === 'reset' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoFocus style={inputStyle} onKeyDown={e => { if (e.key === 'Enter') handleReset(); }} />
              <button onClick={handleReset} disabled={loading} style={primaryBtnStyle}>
                {loading ? 'Sending…' : 'Send Reset Email'}
              </button>
              <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.4 }}>
                Check your email for a reset link. Requires internet connection.
              </div>
              <button onClick={() => switchView('signin')} style={linkStyle}>← Back to sign in</button>
            </div>
          )}

          <Notice />
        </div>
      </div>
    </div>
  );
}
