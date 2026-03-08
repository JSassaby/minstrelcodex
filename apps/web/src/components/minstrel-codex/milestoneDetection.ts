import type { ShareableCardData } from './ShareableCard';

// ── Streak milestones ──────────────────────────────────────────────
export const STREAK_MILESTONES = [
  { days: 3,   badge: 'Kindling',        emoji: '🕯️' },
  { days: 7,   badge: 'Steady Flame',    emoji: '🔥' },
  { days: 14,  badge: 'Burning Bright',  emoji: '🔥🔥' },
  { days: 30,  badge: 'Eternal Flame',   emoji: '🔥🔥🔥' },
  { days: 60,  badge: 'The Long Watch',  emoji: '⚔️' },
  { days: 90,  badge: 'The Devoted',     emoji: '📜' },
  { days: 180, badge: 'Voice of Ages',   emoji: '✨' },
  { days: 365, badge: 'Legend of the Page', emoji: '👑' },
] as const;

// ── Level-up detection ─────────────────────────────────────────────
export interface MilestoneEvent {
  id: string;
  card: ShareableCardData;
}

/**
 * Given the previous and new streak, return any milestone cards that were just crossed.
 */
export function detectStreakMilestones(
  prevStreak: number,
  newStreak: number,
  totalXp: number,
): MilestoneEvent[] {
  const events: MilestoneEvent[] = [];
  for (const m of STREAK_MILESTONES) {
    if (prevStreak < m.days && newStreak >= m.days) {
      events.push({
        id: `streak-${m.days}-${Date.now()}`,
        card: {
          type: 'streak',
          headline: `${m.emoji} ${m.badge}`,
          subtitle: `${m.days}-day writing streak achieved!`,
          currentStreak: newStreak,
          totalXp,
        },
      });
    }
  }
  return events;
}

/**
 * Given the previous and new level, return a level-up card if the level increased.
 */
export function detectLevelUp(
  prevLevel: number,
  newLevel: number,
  newTitle: string,
  totalXp: number,
): MilestoneEvent | null {
  if (newLevel > prevLevel) {
    return {
      id: `level-${newLevel}-${Date.now()}`,
      card: {
        type: 'level-up',
        headline: `⚔ Level ${newLevel}`,
        subtitle: newTitle,
        currentLevel: newLevel,
        currentTitle: newTitle,
        totalXp,
      },
    };
  }
  return null;
}
