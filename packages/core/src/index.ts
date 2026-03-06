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
export type { DocumentRecord, FileStructureRecord, RecentFileRecord, PreferenceRecord } from './db';

// Cloud adapters
export type { CloudAdapter, RemoteFile } from './adapters/CloudAdapter';
export { TokenExpiredError } from './adapters/CloudAdapter';
export { GoogleDriveAdapter } from './adapters/GoogleDriveAdapter';

// Sync engine
export { useSyncEngine } from './hooks/useSyncEngine';
export type { SyncStatus } from './hooks/useSyncEngine';
