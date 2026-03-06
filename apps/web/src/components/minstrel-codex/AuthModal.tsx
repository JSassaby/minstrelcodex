import { useState } from 'react';
import ModalShell, { ModalButton } from './ModalShell';

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--terminal-border)',
  background: 'var(--terminal-surface)',
  color: 'var(--terminal-text)',
  fontSize: '14px',
  fontFamily: uiFont,
  outline: 'none',
};

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  onSignUp: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
}

export default function AuthModal({ visible, onClose, onSignIn, onSignUp }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) { setError('Email and password are required'); return; }
    setLoading(true); setError(''); setSuccess('');

    const fn = mode === 'signin' ? onSignIn : onSignUp;
    const { error: e } = await fn(email.trim(), password);

    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }

    if (mode === 'signup') {
      setSuccess('Account created. Check your email to confirm before signing in.');
      setLoading(false);
    } else {
      // signIn succeeded — close modal
      setEmail(''); setPassword('');
      setLoading(false);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <ModalShell visible={visible} title="ACCOUNT" onClose={onClose} width="380px">
      <div style={{ padding: '4px 0' }}>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', gap: '2px', marginBottom: '20px',
          borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--terminal-border)',
        }}>
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                background: mode === m ? 'var(--terminal-accent)' : 'var(--terminal-surface)',
                color: mode === m ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                fontSize: '12px', fontWeight: '600', fontFamily: uiFont,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', marginBottom: '14px', borderRadius: '9px',
            border: '1px solid rgba(224,92,92,0.4)', background: 'rgba(224,92,92,0.08)',
            fontSize: '13px', fontFamily: uiFont, color: '#e05c5c',
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '10px 14px', marginBottom: '14px', borderRadius: '9px',
            border: '1px solid rgba(92,224,92,0.4)', background: 'rgba(92,224,92,0.08)',
            fontSize: '13px', fontFamily: uiFont, color: 'var(--terminal-accent)',
          }}>
            {success}
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            autoFocus
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            style={inputStyle}
          />
        </div>

        <ModalButton
          label={
            loading
              ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
              : (mode === 'signin' ? 'Sign In' : 'Create Account')
          }
          focused
          onClick={handleSubmit}
        />
      </div>
    </ModalShell>
  );
}
