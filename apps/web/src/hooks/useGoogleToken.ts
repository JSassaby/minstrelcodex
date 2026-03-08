import { useState, useCallback, useEffect } from 'react';
const ACCESS_KEY = 'mc-drive-access-token';
const REFRESH_KEY = 'mc-drive-refresh-token';
const TOKEN_CHANGED_EVENT = 'mc-google-token-changed';

const DEVICE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-device`;

/**
 * Manages the Google Drive access token independently of any auth.
 * Tokens are obtained via the OAuth Device Authorization Flow (RFC 8628)
 * and stored in localStorage. No OAuth redirects — entirely in-app.
 *
 * Uses a custom event to keep multiple hook instances in sync.
 */
export function useGoogleToken() {
  const [googleToken, setGoogleTokenState] = useState<string | null>(() =>
    localStorage.getItem(ACCESS_KEY)
  );

  const isConnected = !!googleToken;

  // Listen for token changes from other hook instances
  useEffect(() => {
    const handler = () => {
      setGoogleTokenState(localStorage.getItem(ACCESS_KEY));
    };
    window.addEventListener(TOKEN_CHANGED_EVENT, handler);
    // Also listen for storage events (cross-tab sync)
    window.addEventListener('storage', (e) => {
      if (e.key === ACCESS_KEY) setGoogleTokenState(e.newValue);
    });
    return () => {
      window.removeEventListener(TOKEN_CHANGED_EVENT, handler);
    };
  }, []);

  const setToken = useCallback((accessToken: string, refreshToken?: string) => {
    localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    setGoogleTokenState(accessToken);
    window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setGoogleTokenState(null);
    window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
  }, []);

  // Use the stored refresh token to get a new access token
  const refreshToken = useCallback(async (): Promise<string | null> => {
    const stored = localStorage.getItem(REFRESH_KEY);
    if (!stored) return null;
    try {
      const res = await fetch(DEVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: 'refresh-token', refreshToken: stored }),
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem(ACCESS_KEY, data.access_token);
        setGoogleTokenState(data.access_token);
        window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
        return data.access_token;
      }
    } catch {}
    return null;
  }, []);

  return { googleToken, isConnected, setToken, clearToken, refreshToken };
}
