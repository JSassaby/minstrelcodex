import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TOKEN_KEY = 'pw-google-token';

/**
 * Manages Google Drive connection state.
 * Checks both localStorage (for persisted provider_token) and the active
 * Supabase session (for Google identity) to determine connection status.
 */
export function useGoogleToken() {
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [justConnected, setJustConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasGoogleIdentity, setHasGoogleIdentity] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.provider_token) {
        const hadToken = !!localStorage.getItem(TOKEN_KEY);
        localStorage.setItem(TOKEN_KEY, session.provider_token);
        setGoogleToken(session.provider_token);
        if (!hadToken) setJustConnected(true);
      }
      if (session?.user) {
        const googleId = session.user.app_metadata?.providers?.includes('google');
        setHasGoogleIdentity(!!googleId);
        setUserEmail(session.user.email || null);
      }
    });

    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) {
        const hadToken = !!localStorage.getItem(TOKEN_KEY);
        localStorage.setItem(TOKEN_KEY, session.provider_token);
        setGoogleToken(session.provider_token);
        if (!hadToken) setJustConnected(true);
      }
      if (session?.user) {
        const googleId = session.user.app_metadata?.providers?.includes('google');
        setHasGoogleIdentity(!!googleId);
        setUserEmail(session.user.email || null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setGoogleToken(null);
    setJustConnected(false);
    setUserEmail(null);
  }, []);

  const dismissJustConnected = useCallback(() => {
    setJustConnected(false);
  }, []);

  // Try to refresh and get a new provider token
  const refreshToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.refreshSession();
    if (data.session?.provider_token) {
      localStorage.setItem(TOKEN_KEY, data.session.provider_token);
      setGoogleToken(data.session.provider_token);
      return data.session.provider_token;
    }
    return null;
  }, []);

  const isConnected = !!googleToken;

  return { googleToken, isConnected, clearToken, justConnected, dismissJustConnected, userEmail, hasGoogleIdentity, refreshToken };
}
