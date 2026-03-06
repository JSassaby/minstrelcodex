import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
const ACCESS_KEY = 'mc-drive-access-token';
const REFRESH_KEY = 'mc-drive-refresh-token';

const DEVICE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-device`;

/**
 * Manages the Google Drive access token independently of Supabase auth.
 * Tokens are obtained via the OAuth Device Authorization Flow (RFC 8628)
 * and stored in localStorage. No OAuth redirects — entirely in-app.
 */
export function useGoogleToken() {
  const [googleToken, setGoogleTokenState] = useState<string | null>(() =>
    localStorage.getItem(ACCESS_KEY)
  );

  const isConnected = !!googleToken;

  const setToken = useCallback((accessToken: string, refreshToken?: string) => {
    localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    setGoogleTokenState(accessToken);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setGoogleTokenState(null);
  }, []);

  // Use the stored refresh token to get a new access token
  const refreshToken = useCallback(async (): Promise<string | null> => {
    const stored = localStorage.getItem(REFRESH_KEY);
    if (!stored) return null;
    try {
      const res = await fetch(DEVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh-token', refreshToken: stored }),
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem(ACCESS_KEY, data.access_token);
        setGoogleTokenState(data.access_token);
        return data.access_token;
      }
    } catch {}
    return null;
  }, []);

  return { googleToken, isConnected, setToken, clearToken, refreshToken };
}
