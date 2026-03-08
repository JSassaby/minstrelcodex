// ── Gamification Types & Constants ─────────────────────────────────

export type CraftSkillType = 'narrative' | 'dialogue' | 'description' | 'argument' | 'reflection';

export interface WritingSessionRecord {
  id: string;
  chronicleId: string;
  startedAt: string;
  endedAt: string;
  wordCount: number;
  durationSeconds: number;
  xpEarned: number;
  streakDay: number;
}

export interface AchievementRecord {
  id: string;
  unlockedAt: string;
  category: string;
}

export interface CraftSkillRecord {
  skill: CraftSkillType;
  xp: number;
  level: number;
}

export interface WriterProfile {
  totalXp: number;
  level: number;
  title: string;
  currentStreak: number;
  longestStreak: number;
  emberActive: boolean;
  lastEmberDate: string | null;
  lastWritingDate: string | null;
}

export interface WriterRank {
  level: number;
  title: string;
  xpRequired: number;
}

export const WRITER_RANKS: WriterRank[] = [
  { level: 1, title: 'Apprentice Scribe', xpRequired: 0 },
  { level: 2, title: 'Journeyman Scribe', xpRequired: 1_000 },
  { level: 3, title: 'Wordsmith', xpRequired: 5_000 },
  { level: 4, title: 'Storyteller', xpRequired: 15_000 },
  { level: 5, title: 'Chronicle Keeper', xpRequired: 40_000 },
  { level: 6, title: 'Loremaster', xpRequired: 100_000 },
  { level: 7, title: 'Master Bard', xpRequired: 250_000 },
  { level: 8, title: 'Grand Minstrel', xpRequired: 500_000 },
  { level: 9, title: 'Saga Weaver', xpRequired: 1_000_000 },
  { level: 10, title: 'Mythwright', xpRequired: 2_500_000 },
];

export const DEFAULT_PROFILE: WriterProfile = {
  totalXp: 0,
  level: 1,
  title: 'Apprentice Scribe',
  currentStreak: 0,
  longestStreak: 0,
  emberActive: false,
  lastEmberDate: null,
  lastWritingDate: null,
};

export const SESSION_MIN_WORDS = 100;
export const SESSION_MIN_MINUTES = 5;
export const SESSION_IDLE_MS = 2 * 60 * 1000; // 2 minutes idle = session end

export interface SessionXPBreakdown {
  baseXp: number;
  sessionBonus: number;
  focusMultiplier: number;
  streakMultiplier: number;
  totalXp: number;
}
