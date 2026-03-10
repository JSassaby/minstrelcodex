import { useState, useEffect, useCallback } from 'react';

/**
 * Reactive boolean backed by localStorage.
 * Re-renders whenever the value changes — in this tab (via synthetic StorageEvent)
 * or in another tab (via native storage event).
 */
export function useLocalStorageBoolean(
  key: string,
  defaultValue: boolean = false
): [boolean, (next: boolean) => void] {
  const read = () => {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return raw === 'true';
  };

  const [value, setValue] = useState<boolean>(read);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== key) return;
      setValue(e.newValue === 'true');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key]);

  const set = useCallback(
    (next: boolean) => {
      localStorage.setItem(key, String(next));
      setValue(next);
      // Dispatch synthetic StorageEvent so same-tab listeners fire
      window.dispatchEvent(
        new StorageEvent('storage', { key, newValue: String(next), oldValue: String(!next) })
      );
    },
    [key]
  );

  return [value, set];
}
