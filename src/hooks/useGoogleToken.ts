import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TOKEN_KEY = 'pw-google-token';
const JUST_CONNECTED_KEY = 'pw-google-just-connected';

/**
 * Persists the Google OAuth provider_token in localStorage
 * so it survives page reloads (Supabase only exposes it once after callback).
 */
export function useGoogleToken() {
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [justConnected, setJustConnected] = useState<boolean>(() => {
    const val = localStorage.getItem(JUST_CONNECTED_KEY);
    if (val) {
      localStorage.removeItem(JUST_CONNECTED_KEY);
      return true;
    }
    return false;
  });
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Listen for auth state changes — capture provider_token when it appears
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.provider_token) {
        const hadToken = !!localStorage.getItem(TOKEN_KEY);
        localStorage.setItem(TOKEN_KEY, session.provider_token);
        setGoogleToken(session.provider_token);
        if (!hadToken) {
          // Fresh connection — flag it
          localStorage.setItem(JUST_CONNECTED_KEY, '1');
          setJustConnected(true);
        }
        setUserEmail(session.user?.email || null);
      }
    });

    // Also check the current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) {
        const hadToken = !!localStorage.getItem(TOKEN_KEY);
        localStorage.setItem(TOKEN_KEY, session.provider_token);
        setGoogleToken(session.provider_token);
        if (!hadToken) {
          localStorage.setItem(JUST_CONNECTED_KEY, '1');
          setJustConnected(true);
        }
      }
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(JUST_CONNECTED_KEY);
    setGoogleToken(null);
    setJustConnected(false);
    setUserEmail(null);
  }, []);

  const dismissJustConnected = useCallback(() => {
    setJustConnected(false);
  }, []);

  const isConnected = !!googleToken;

  return { googleToken, isConnected, clearToken, justConnected, dismissJustConnected, userEmail };
}
