import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { DEFAULT_PROFILE, type WriterProfile } from './types';
import { getLevelForXP } from './xpEngine';

const PROFILE_KEY = 'writer-profile';

export function useWriterProfile() {
  const [profile, setProfile] = useState<WriterProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    db.preferences.get(PROFILE_KEY).then(rec => {
      if (rec) {
        try {
          setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(rec.value) });
        } catch { /* use default */ }
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (p: WriterProfile) => {
    await db.preferences.put({ key: PROFILE_KEY, value: JSON.stringify(p) });
  }, []);

  const updateProfile = useCallback(async (updates: Partial<WriterProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      persist(next);
      return next;
    });
  }, [persist]);

  const addXP = useCallback(async (xp: number) => {
    setProfile(prev => {
      const newTotal = prev.totalXp + xp;
      const { level, title } = getLevelForXP(newTotal);
      const next: WriterProfile = { ...prev, totalXp: newTotal, level, title };
      persist(next);
      return next;
    });
  }, [persist]);

  return { profile, loaded, updateProfile, addXP };
}
