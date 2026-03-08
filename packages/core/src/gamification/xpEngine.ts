import { WRITER_RANKS, STREAK_TIERS, type SessionXPBreakdown, type WriterRank } from './types';

/**
 * 0.5 Renown per word (base rate).
 * Session bonus (highest tier only):
 *   ≥ 1,000 words → +200
 *   ≥   500 words → +75
 *   ≥   250 words → +25
 * Streak multiplier applies to (base + session bonus) only.
 * Streak day bonus (+10 × streakDay) is added after multiplication.
 */
export function calculateSessionXP(
  wordCount: number,
  durationMinutes: number,
  streakDay: number,
): SessionXPBreakdown {
  const baseRenown = wordCount * 0.5;

  let sessionBonus = 0;
  if (wordCount >= 1000) sessionBonus = 200;
  else if (wordCount >= 500) sessionBonus = 75;
  else if (wordCount >= 250) sessionBonus = 25;

  // Focus multiplier removed from design spec — always 1.0
  const focusMultiplier = getFocusMultiplier(durationMinutes);
  const streakMultiplier = getStreakMultiplier(streakDay);

  // Daily streak maintained bonus: +10 Renown × streak day
  const streakDayBonus = streakDay * 10;

  const totalRenown = Math.round((baseRenown + sessionBonus) * streakMultiplier) + streakDayBonus;

  return {
    baseXp: baseRenown,
    sessionBonus,
    focusMultiplier,
    streakMultiplier,
    streakDayBonus,
    totalXp: totalRenown,
  };
}

export function getStreakMultiplier(streakDay: number): number {
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    if (streakDay >= STREAK_TIERS[i].minDays) return STREAK_TIERS[i].multiplier;
  }
  return 1.0;
}

/** Focus multiplier is not part of the Renown design spec — returns 1.0 always. */
export function getFocusMultiplier(_durationMinutes: number): number {
  return 1.0;
}

export function getLevelForXP(totalRenown: number): { level: number; title: string; xpForCurrent: number; xpForNext: number | null } {
  let rank: WriterRank = WRITER_RANKS[0];
  for (let i = WRITER_RANKS.length - 1; i >= 0; i--) {
    if (totalRenown >= WRITER_RANKS[i].renownRequired) {
      rank = WRITER_RANKS[i];
      break;
    }
  }
  const nextRank = WRITER_RANKS.find(r => r.level === rank.level + 1);
  return {
    level: rank.level,
    title: rank.title,
    xpForCurrent: rank.renownRequired,
    xpForNext: nextRank?.renownRequired ?? null,
  };
}
