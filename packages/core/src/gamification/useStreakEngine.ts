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

/**
 * Minimum words per session for streak qualification: 50 words.
 * (See STREAK_MIN_WORDS in types.ts — lower than the XP session minimum of 100.)
 * The caller is responsible for checking this threshold before calling recordStreak().
 */
export function useStreakEngine(
  profile: WriterProfile,
  updateProfile: (u: Partial<WriterProfile>) => Promise<void>,
) {
  /** Call on app open to check if streak broke */
  const checkStreak = useCallback(() => {
    if (!profile.lastWritingDate) return;
    const gap = daysBetween(profile.lastWritingDate, getToday());

    if (gap <= 1) return; // still active (0 = same day, 1 = yesterday)

    if (gap === 2 && !profile.quillsRestActive) {
      // One day missed — activate Quill's Rest if allowed (once per 7 days)
      const canUseQuillsRest = !profile.lastQuillsRestDate || daysBetween(profile.lastQuillsRestDate, getToday()) >= 7;
      if (canUseQuillsRest) {
        updateProfile({ quillsRestActive: true, lastQuillsRestDate: getToday() });
        return;
      }
    }

    // Streak broken
    if (gap > 2 || (gap === 2 && profile.quillsRestActive)) {
      updateProfile({ currentStreak: 0, quillsRestActive: false });
    }
  }, [profile, updateProfile]);

  /** Call when a valid session completes (caller must verify ≥ STREAK_MIN_WORDS words) */
  const recordStreak = useCallback(() => {
    const today = getToday();
    if (profile.lastWritingDate === today) return; // already counted today

    const newStreak = profile.currentStreak + 1;
    const longestStreak = Math.max(newStreak, profile.longestStreak);
    updateProfile({
      currentStreak: newStreak,
      longestStreak,
      lastWritingDate: today,
      quillsRestActive: false,
    });
  }, [profile, updateProfile]);

  return {
    currentStreak: profile.currentStreak,
    quillsRestActive: profile.quillsRestActive,
    checkStreak,
    recordStreak,
  };
}
