// Import engine
export { importFiles, convertTxt, convertMarkdown, convertHtml, convertDocx, convertPdf } from './import';
export type { ImportedFile, SupportedExtension } from './import';

// Design system
export { DESIGN_TOKENS } from './design/tokens';
export type { DesignTokens } from './design/tokens';

// Narrative engine
export { detectBeat, useNarrativeEngine } from './narrative';
export type { BeatType, NarrativeBeat, NarrativeState } from './narrative';

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
  CHRONICLES,
  useChronicleEngine,
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
  ChronicleCheckContext,
  ChronicleDefinition,
} from './gamification';
