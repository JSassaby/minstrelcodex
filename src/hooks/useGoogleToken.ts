import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TOKEN_KEY = 'pw-google-token';

/**
 * Persists the Google OAuth provider_token in localStorage
 * so it survives page reloads (Supabase only exposes it once after callback).
 */
export function useGoogleToken() {
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  // Listen for auth state changes — capture provider_token when it appears
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.provider_token) {
        localStorage.setItem(TOKEN_KEY, session.provider_token);
        setGoogleToken(session.provider_token);
      }
    });

    // Also check the current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) {
        localStorage.setItem(TOKEN_KEY, session.provider_token);
        setGoogleToken(session.provider_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setGoogleToken(null);
  }, []);

  const isConnected = !!googleToken;

  return { googleToken, isConnected, clearToken };
}
