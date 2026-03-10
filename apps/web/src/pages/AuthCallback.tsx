import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { pullSettings } from '@/lib/settingsSync';

/**
 * Handles the OAuth redirect callback.
 *
 * Supabase PKCE flow: Google → Supabase → here with ?code=...
 * Implicit flow: here with #access_token=...
 *
 * After session is established, pulls remote settings (additive — never
 * clears local data), then redirects to "/".
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
        navigate('/', { replace: true });
        return;
      }

      // Pull remote settings before redirect so they're available immediately
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await pullSettings(user.id);
      } catch {
        // Silent — local data always wins
      }

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
      gap: '16px',
      background: '#0a0f14',
      color: '#00dfa0',
      fontFamily: "var(--font-ui, 'Space Grotesk', sans-serif)",
      fontSize: '13px',
      letterSpacing: '0.04em',
    }}>
      <div style={{
        width: '20px',
        height: '20px',
        border: '2px solid rgba(0,223,160,0.2)',
        borderTop: '2px solid #00dfa0',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ opacity: 0.6 }}>Signing you in…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
