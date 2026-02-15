import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import ModalShell, { ModalButton } from './ModalShell';

interface AppleSignInModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AppleSignInModal({ visible, onClose }: AppleSignInModalProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    checkAuth();
  }, [visible]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.app_metadata?.provider === 'apple') {
      setAuthenticated(true);
    } else {
      setAuthenticated(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    setError('');
    const { error } = await lovable.auth.signInWithOAuth('apple', {
      redirect_uri: window.location.origin,
    });
    if (error) {
      setError(error.message || 'Sign-in failed');
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <ModalShell visible={visible} title="🍎 APPLE SIGN IN" onClose={onClose}>
      <div style={{ margin: '16px 0', minHeight: '150px' }}>
        {error && (
          <div style={{
            padding: '8px 12px', marginBottom: '12px',
            border: '1px solid var(--terminal-text)', opacity: 0.9,
            background: 'rgba(255,0,0,0.1)',
          }}>
            ⚠ {error}
          </div>
        )}

        {authenticated ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>✓</div>
            <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
              Apple Account Connected
            </p>
            <p style={{ fontSize: '12px', opacity: 0.6, marginBottom: '24px' }}>
              Your Apple account is linked and ready for iCloud storage.
            </p>
            <ModalButton label="CLOSE" focused={true} onClick={onClose} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ marginBottom: '8px', fontSize: '14px' }}>
              Sign in with Apple to enable iCloud storage
            </p>
            <p style={{ marginBottom: '24px', fontSize: '12px', opacity: 0.6 }}>
              Connect your Apple account to sync files via iCloud
            </p>
            <ModalButton
              label={loading ? 'SIGNING IN...' : '🍎 SIGN IN WITH APPLE'}
              focused={true}
              onClick={signIn}
            />
          </div>
        )}
      </div>
    </ModalShell>
  );
}
