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
  renown: number;
  level: number;
  title: string;
  currentStreak: number;
  longestStreak: number;
  quillsRestActive: boolean;
  lastQuillsRestDate: string | null;
  lastWritingDate: string | null;
}

export interface WriterRank {
  level: number;
  title: string;
  renownRequired: number;
  unlocks: string;
}

export const WRITER_RANKS: WriterRank[] = [
  { level: 1,  title: 'Apprentice Scribe',  renownRequired: 0,      unlocks: 'Song Complete screen, basic stats' },
  { level: 2,  title: 'Wandering Scribe',   renownRequired: 1000,   unlocks: 'Streak tracking, daily Renown display' },
  { level: 3,  title: 'Keeper of Tales',    renownRequired: 3000,   unlocks: 'First Chronicles visible' },
  { level: 4,  title: 'Journeyman Bard',    renownRequired: 6000,   unlocks: 'Session history chart' },
  { level: 5,  title: 'Wordsmith',          renownRequired: 10000,  unlocks: "Pace predictions in stats panel, Quill's Rest tokens" },
  { level: 6,  title: 'Chronicler',         renownRequired: 16000,  unlocks: 'Full Chronicle Ledger (Ctrl+Shift+C)' },
  { level: 7,  title: 'Storyteller',        renownRequired: 24000,  unlocks: 'Shareable milestone cards' },
  { level: 8,  title: 'Master of Words',    renownRequired: 34000,  unlocks: 'Custom streak badge' },
  { level: 9,  title: 'Voice of Ages',      renownRequired: 46000,  unlocks: 'Legacy stats (all-time totals)' },
  { level: 10, title: 'The Devoted',        renownRequired: 60000,  unlocks: 'Dedicated Scribe theme' },
  { level: 11, title: 'Grand Bard',         renownRequired: 80000,  unlocks: 'Hall of Works (completed novels list)' },
  { level: 12, title: 'Legend of the Page', renownRequired: 100000, unlocks: 'All features. Permanent gold streak badge.' },
];

export interface StreakTier {
  minDays: number;
  maxDays: number | null; // null = no upper bound
  multiplier: number;
  label: string;
}

export const STREAK_TIERS: StreakTier[] = [
  { minDays: 0,  maxDays: 2,    multiplier: 1.0,  label: '' },
  { minDays: 3,  maxDays: 6,    multiplier: 1.2,  label: 'On a Roll' },
  { minDays: 7,  maxDays: 13,   multiplier: 1.5,  label: 'Finding the Rhythm' },
  { minDays: 14, maxDays: 29,   multiplier: 1.75, label: 'The Dedicated Scribe' },
  { minDays: 30, maxDays: null, multiplier: 2.0,  label: 'Legend of the Page' },
];

export const DEFAULT_PROFILE: WriterProfile = {
  renown: 0,
  level: 1,
  title: 'Apprentice Scribe',
  currentStreak: 0,
  longestStreak: 0,
  quillsRestActive: false,
  lastQuillsRestDate: null,
  lastWritingDate: null,
};

/** Minimum words for a session to qualify for XP/Renown */
export const SESSION_MIN_WORDS = 100;
export const SESSION_MIN_MINUTES = 5;
export const SESSION_IDLE_MS = 2 * 60 * 1000; // 2 minutes idle = session end

/** Minimum words for a session to count toward streak (lower threshold) */
export const STREAK_MIN_WORDS = 50;

export interface SessionXPBreakdown {
  baseXp: number;
  sessionBonus: number;
  focusMultiplier: number;
  streakMultiplier: number;
  streakDayBonus: number;
  totalXp: number;
}
