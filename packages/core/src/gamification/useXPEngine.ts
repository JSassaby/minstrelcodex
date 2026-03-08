import { useCallback } from 'react';
import { calculateSessionXP, getLevelForXP, getStreakMultiplier } from './xpEngine';
import type { WriterProfile, SessionXPBreakdown } from './types';

export function useXPEngine(
  profile: WriterProfile,
  addXP: (xp: number) => Promise<void>,
) {
  const awardSessionXP = useCallback(
    (wordCount: number, durationSeconds: number): SessionXPBreakdown => {
      const durationMinutes = durationSeconds / 60;
      const breakdown = calculateSessionXP(wordCount, durationMinutes, profile.currentStreak);
      addXP(breakdown.totalXp);
      return breakdown;
    },
    [profile.currentStreak, addXP],
  );

  const { level, title, xpForCurrent, xpForNext } = getLevelForXP(profile.renown);
  const xpInLevel = profile.renown - xpForCurrent;
  const xpNeeded = xpForNext !== null ? xpForNext - xpForCurrent : null;

  return {
    awardSessionXP,
    currentLevel: level,
    currentTitle: title,
    xpInLevel,
    xpNeeded,
    totalXp: profile.renown,
    streakMultiplier: getStreakMultiplier(profile.currentStreak),
  };
}
