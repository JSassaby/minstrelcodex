import { useCallback } from 'react';
import type { WriterProfile } from './types';

function getToday(): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date()); // YYYY-MM-DD
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / (86400 * 1000));
}

export function useStreakEngine(
  profile: WriterProfile,
  updateProfile: (u: Partial<WriterProfile>) => Promise<void>,
) {
  /** Call on app open to check if streak broke */
  const checkStreak = useCallback(() => {
    if (!profile.lastWritingDate) return;
    const gap = daysBetween(profile.lastWritingDate, getToday());

    if (gap <= 1) return; // still active (0 = same day, 1 = yesterday)

    if (gap === 2 && !profile.emberActive) {
      // One day missed — activate ember if allowed (once per 7 days)
      const canEmber = !profile.lastEmberDate || daysBetween(profile.lastEmberDate, getToday()) >= 7;
      if (canEmber) {
        updateProfile({ emberActive: true, lastEmberDate: getToday() });
        return;
      }
    }

    // Streak broken
    if (gap > 2 || (gap === 2 && profile.emberActive)) {
      updateProfile({ currentStreak: 0, emberActive: false });
    }
  }, [profile, updateProfile]);

  /** Call when a valid session completes (≥100 words) */
  const recordStreak = useCallback(() => {
    const today = getToday();
    if (profile.lastWritingDate === today) return; // already counted today

    const newStreak = profile.currentStreak + 1;
    const longestStreak = Math.max(newStreak, profile.longestStreak);
    updateProfile({
      currentStreak: newStreak,
      longestStreak,
      lastWritingDate: today,
      emberActive: false,
    });
  }, [profile, updateProfile]);

  return {
    currentStreak: profile.currentStreak,
    emberActive: profile.emberActive,
    checkStreak,
    recordStreak,
  };
}
