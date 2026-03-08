import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Handles the OAuth redirect callback.
 *
 * Supabase PKCE flow: Google → Supabase → here with ?code=...
 * Lovable implicit flow: Lovable → here with #access_token=...
 *
 * The Supabase client automatically parses hash tokens on init
 * (detectSessionInUrl defaults to true). For the PKCE code param
 * we call exchangeCodeForSession explicitly, then navigate home.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const code = new URLSearchParams(window.location.search).get('code');
      const hasHash = window.location.hash.includes('access_token');

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else if (!hasHash) {
        // No code or hash tokens — nothing to process, redirect immediately
        navigate('/', { replace: true });
        return;
      }

      // Wait briefly for session to settle, then redirect
      navigate('/', { replace: true });
    };
    run();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '20px',
      background: '#000',
      color: '#0f0',
      fontFamily: 'monospace',
      fontSize: '14px',
    }}>
      <div style={{
        width: '24px',
        height: '24px',
        border: '2px solid rgba(0, 255, 0, 0.2)',
        borderTop: '2px solid #0f0',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ opacity: 0.8 }}>Signing in...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
