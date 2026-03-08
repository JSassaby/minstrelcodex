// Types
export type {
  DocumentData,
  CurrentDocument,
  FileNode,
  FileStructure,
  AppColors,
  TypingBestScores,
  ModalType,
  Language,
  Difficulty,
  PinConfig,
} from './types';

// Database
export { db, docsCache, migrateFromLocalStorage } from './db';
export type { DocumentRecord, FileStructureRecord, RecentFileRecord, PreferenceRecord, NoteRecord, WritingStatRecord } from './db';

// Cloud adapters
export type { CloudAdapter, RemoteFile } from './adapters/CloudAdapter';
export { TokenExpiredError } from './adapters/CloudAdapter';
export { GoogleDriveAdapter } from './adapters/GoogleDriveAdapter';

// Sync engine
export { useSyncEngine } from './hooks/useSyncEngine';
export type { SyncStatus } from './hooks/useSyncEngine';

// Gamification
export {
  WRITER_RANKS,
  STREAK_TIERS,
  DEFAULT_PROFILE,
  SESSION_MIN_WORDS,
  SESSION_MIN_MINUTES,
  SESSION_IDLE_MS,
  STREAK_MIN_WORDS,
  calculateSessionXP,
  getStreakMultiplier,
  getFocusMultiplier,
  getLevelForXP,
  useWriterProfile,
  useStreakEngine,
  useSessionTracker,
  useXPEngine,
} from './gamification';
export type {
  CraftSkillType,
  WritingSessionRecord,
  AchievementRecord,
  CraftSkillRecord,
  WriterProfile,
  WriterRank,
  StreakTier,
  SessionXPBreakdown,
} from './gamification';
