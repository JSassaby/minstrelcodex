import { WRITER_RANKS, type SessionXPBreakdown, type WriterRank } from './types';

/** 1 word = 1 XP base */
export function calculateSessionXP(
  wordCount: number,
  durationMinutes: number,
  streakDay: number,
): SessionXPBreakdown {
  const baseXp = wordCount;
  const sessionBonus = wordCount >= 100 ? 50 : 0;
  const focusMultiplier = getFocusMultiplier(durationMinutes);
  const streakMultiplier = getStreakMultiplier(streakDay);

  const totalXp = Math.round((baseXp + sessionBonus) * focusMultiplier * streakMultiplier);

  return { baseXp, sessionBonus, focusMultiplier, streakMultiplier, totalXp };
}

export function getStreakMultiplier(streakDay: number): number {
  if (streakDay >= 30) return 3.0;
  if (streakDay >= 14) return 2.5;
  if (streakDay >= 7) return 2.0;
  if (streakDay >= 3) return 1.5;
  return 1.0;
}

export function getFocusMultiplier(durationMinutes: number): number {
  return durationMinutes >= 30 ? 1.5 : 1.0;
}

export function getLevelForXP(totalXp: number): { level: number; title: string; xpForCurrent: number; xpForNext: number | null } {
  let rank: WriterRank = WRITER_RANKS[0];
  for (let i = WRITER_RANKS.length - 1; i >= 0; i--) {
    if (totalXp >= WRITER_RANKS[i].xpRequired) {
      rank = WRITER_RANKS[i];
      break;
    }
  }
  const nextRank = WRITER_RANKS.find(r => r.level === rank.level + 1);
  return {
    level: rank.level,
    title: rank.title,
    xpForCurrent: rank.xpRequired,
    xpForNext: nextRank?.xpRequired ?? null,
  };
}
