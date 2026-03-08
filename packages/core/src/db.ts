import Dexie, { type Table } from 'dexie';

export interface DocumentRecord {
  id: string; // filename / path
  content: string;
  lastModified: string;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'deleted';
}

export interface FileStructureRecord {
  id: 'root'; // always 'root'
  data: string; // JSON-serialised FileStructure
}

export interface RecentFileRecord {
  order: number; // 0 = most recent
  filename: string;
}

export interface PreferenceRecord {
  key: string;
  value: string;
}

export interface NoteRecord {
  id: string;
  projectId: string;
  type: 'character' | 'place';
  name: string;
  description: string;
  body: string;
}

export interface WritingStatRecord {
  date: string; // YYYY-MM-DD — primary key
  words: number;
}

import type { WritingSessionRecord, AchievementRecord, CraftSkillRecord } from './gamification/types';

class MinstrelDB extends Dexie {
  documents!: Table<DocumentRecord, string>;
  fileStructure!: Table<FileStructureRecord, string>;
  recentFiles!: Table<RecentFileRecord, number>;
  preferences!: Table<PreferenceRecord, string>;
  notes!: Table<NoteRecord, string>;
  writingStats!: Table<WritingStatRecord, string>;
  writingSessions!: Table<WritingSessionRecord, string>;
  achievements!: Table<AchievementRecord, string>;
  craftSkills!: Table<CraftSkillRecord, string>;

  constructor() {
    super('minstrel-codex');
    this.version(1).stores({
      documents: 'id, lastModified, syncStatus',
      fileStructure: 'id',
      recentFiles: '++order, filename',
      preferences: 'key',
    });
    this.version(2).stores({
      notes: 'id, projectId, type',
      writingStats: 'date',
    });
    this.version(3).stores({
      writingSessions: 'id, chronicleId, startedAt',
      achievements: 'id, category',
      craftSkills: 'skill',
    });
  }
}

export const db = new MinstrelDB();

// ── Shared in-memory docs cache ───────────────────────────────────────
// Populated by useDocumentStorage on mount; updated by useFileStructure
// whenever it creates, renames, or deletes documents — so loadDocument()
// is always a cache hit even for files created mid-session.
import type { DocumentData } from './types';
export const docsCache: Record<string, DocumentData> = {};

// ── Helpers ──────────────────────────────────────────────────────────

export async function migrateFromLocalStorage(): Promise<void> {
  const alreadyMigrated = await db.preferences.get('migrated-v1');
  if (alreadyMigrated) return;

  // Migrate documents
  const rawDocs = localStorage.getItem('pw-documents');
  if (rawDocs) {
    try {
      const docs = JSON.parse(rawDocs) as Record<string, unknown>;
      const records: DocumentRecord[] = Object.entries(docs).map(([id, val]) => {
        if (typeof val === 'string') {
          return { id, content: val, lastModified: new Date().toISOString(), syncStatus: 'pending' as const };
        }
        const d = val as { content?: string; lastModified?: string };
        return {
          id,
          content: d.content ?? '',
          lastModified: d.lastModified ?? new Date().toISOString(),
          syncStatus: 'pending' as const,
        };
      });
      await db.documents.bulkPut(records);
    } catch {
      // ignore corrupt data
    }
  }

  // Migrate file structure
  const rawFs = localStorage.getItem('pw-file-structure');
  if (rawFs) {
    await db.fileStructure.put({ id: 'root', data: rawFs });
  }

  // Migrate recent files
  const rawRecent = localStorage.getItem('pw-recent');
  if (rawRecent) {
    try {
      const recent = JSON.parse(rawRecent) as string[];
      await db.recentFiles.bulkPut(
        recent.slice(0, 10).map((filename, order) => ({ order, filename }))
      );
    } catch {
      // ignore
    }
  }

  // Migrate preferences
  const prefKeys: Record<string, string> = {
    'pw-language': 'language',
    'pw-font-family': 'font-family',
    'pw-pin': 'pin',
    'pw-typing-best': 'typing-best',
  };
  for (const [lsKey, dbKey] of Object.entries(prefKeys)) {
    const val = localStorage.getItem(lsKey);
    if (val !== null) {
      await db.preferences.put({ key: dbKey, value: val });
    }
  }

  await db.preferences.put({ key: 'migrated-v1', value: 'true' });
}
