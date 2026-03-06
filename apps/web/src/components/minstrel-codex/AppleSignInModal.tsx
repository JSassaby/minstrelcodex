import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import ModalShell, { ModalButton } from './ModalShell';

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

interface AppleSignInModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AppleSignInModal({ visible, onClose }: AppleSignInModalProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (visible) checkAuth(); }, [visible]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setAuthenticated(session?.user?.app_metadata?.provider === 'apple');
  };

  const signIn = async () => {
    setLoading(true); setError('');
    const { error } = await lovable.auth.signInWithOAuth('apple', { redirect_uri: window.location.origin + '/auth/callback' });
    if (error) { setError(error.message || 'Sign-in failed'); setLoading(false); }
  };

  if (!visible) return null;

  return (
    <ModalShell visible={visible} title="🍎 Apple Sign In" onClose={onClose} width="420px">
      <div style={{ minHeight: '140px' }}>
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '9px', border: '1px solid rgba(224,92,92,0.4)', background: 'rgba(224,92,92,0.08)', fontSize: '13px', fontFamily: uiFont, color: '#e05c5c' }}>
            ⚠ {error}
          </div>
        )}
        {authenticated ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>✓</div>
            <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px', fontFamily: uiFont }}>Apple Account Connected</p>
            <p style={{ fontSize: '12px', opacity: 0.5, marginBottom: '24px', fontFamily: uiFont }}>Linked and ready for iCloud storage.</p>
            <ModalButton label="Close" focused onClick={onClose} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <p style={{ marginBottom: '6px', fontSize: '14px', fontFamily: uiFont }}>Sign in with Apple to enable iCloud storage</p>
            <p style={{ marginBottom: '24px', fontSize: '12px', opacity: 0.5, fontFamily: uiFont }}>Sync files via iCloud across your Apple devices</p>
            <ModalButton label={loading ? 'Signing in…' : '🍎 Sign in with Apple'} focused onClick={signIn} />
          </div>
        )}
      </div>
    </ModalShell>
  );
}
