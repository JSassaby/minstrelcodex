import { useState, useCallback, useEffect, useRef } from 'react';
import type { CurrentDocument, DocumentData } from '@minstrelcodex/core';
import { db, docsCache, migrateFromLocalStorage } from '@minstrelcodex/core';

const CURRENT_KEY = 'pw-current';

// ── Internal helpers ──────────────────────────────────────────────────

async function dbGetAllDocuments(): Promise<Record<string, DocumentData>> {
  const rows = await db.documents.toArray();
  return Object.fromEntries(rows.map(r => [r.id, { content: r.content, lastModified: r.lastModified }]));
}

async function dbGetRecentFilenames(): Promise<string[]> {
  const rows = await db.recentFiles.orderBy('order').toArray();
  return rows.map(r => r.filename).slice(0, 10);
}

async function dbPushRecent(filename: string): Promise<void> {
  await db.recentFiles.where('filename').equals(filename).delete();
  const existing = await db.recentFiles.orderBy('order').toArray();
  const updated = [
    { order: 0, filename },
    ...existing.slice(0, 9).map((r, i) => ({ ...r, order: i + 1 })),
  ];
  await db.recentFiles.clear();
  await db.recentFiles.bulkPut(updated);
}

function writeSessionState(filename: string, content: string, saved: boolean): void {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify({ filename, content, saved }));
  } catch {
    // quota exceeded — ignore
  }
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useDocumentStorage() {
  const [currentDocument, setCurrentDocument] = useState<CurrentDocument>({
    filename: '',
    content: '',
    saved: true,
    lastModified: null,
  });

  // Always-current ref so stable callbacks can read the latest state.
  const currentDocRef = useRef(currentDocument);
  useEffect(() => { currentDocRef.current = currentDocument; }, [currentDocument]);

  const recentCache = useRef<string[]>([]);
  const initialised = useRef(false);

  // ── Mount: migrate + populate cache ──────────────────────────────

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    (async () => {
      try {
        await migrateFromLocalStorage();
        const allDocs = await dbGetAllDocuments();
        Object.assign(docsCache, allDocs);
        recentCache.current = await dbGetRecentFilenames();
      } catch (err) {
        console.error('[useDocumentStorage] init error:', err);
        // Fallback: try to restore docsCache from localStorage directly
        try {
          const raw = localStorage.getItem('pw-documents');
          if (raw) Object.assign(docsCache, JSON.parse(raw) as Record<string, DocumentData>);
        } catch {
          // ignore
        }
      }

      // Restore last session
      const saved = localStorage.getItem(CURRENT_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved) as { filename?: string; content?: string; saved?: boolean };
          if (data.content) {
            setCurrentDocument({
              filename: data.filename ?? '',
              content: data.content,
              saved: data.saved ?? true,
              lastModified: new Date().toISOString(),
            });
          }
        } catch {
          // ignore
        }
      }
    })();
  }, []);

  // ── Stable 10-second autosave ─────────────────────────────────────
  // Uses currentDocRef so the interval is never reconstructed.

  useEffect(() => {
    const interval = setInterval(() => {
      const { filename, content, saved } = currentDocRef.current;
      // Always persist session state so content survives hard-refreshes.
      writeSessionState(filename, content, saved);
      // Save named document to Dexie if there are unsaved changes.
      if (filename && !saved) {
        const lastModified = new Date().toISOString();
        docsCache[filename] = { content, lastModified };
        db.documents
          .put({ id: filename, content, lastModified, syncStatus: 'pending' })
          .catch(console.error);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []); // empty — intentionally never reconstructed

  // ── Public API ────────────────────────────────────────────────────

  const saveDocument = useCallback((filename: string, content: string) => {
    const lastModified = new Date().toISOString();

    // Update shared cache immediately.
    docsCache[filename] = { content, lastModified };
    recentCache.current = [filename, ...recentCache.current.filter(f => f !== filename)].slice(0, 10);

    // Update React state.
    setCurrentDocument(prev => ({ ...prev, filename, content, saved: true, lastModified }));

    // Persist session state and write to Dexie in the background.
    writeSessionState(filename, content, true);
    db.documents.put({ id: filename, content, lastModified, syncStatus: 'pending' }).catch(console.error);
    dbPushRecent(filename).catch(console.error);
  }, []);

  const loadDocument = useCallback((filename: string): string | null => {
    // ── Auto-save current document before switching ────────────────
    const current = currentDocRef.current;
    if (current.filename && current.filename !== filename) {
      const { filename: curFile, content: curContent, saved } = current;
      writeSessionState(curFile, curContent, saved);
      if (!saved) {
        const lastModified = new Date().toISOString();
        docsCache[curFile] = { content: curContent, lastModified };
        db.documents
          .put({ id: curFile, content: curContent, lastModified, syncStatus: 'pending' })
          .catch(console.error);
      }
    }

    // ── Load from cache ────────────────────────────────────────────
    const doc = docsCache[filename];

    if (doc) {
      const content = typeof doc === 'string' ? doc : (doc.content || '');
      const lastModified = typeof doc === 'string' ? new Date().toISOString() : doc.lastModified;
      setCurrentDocument({ filename, content, saved: true, lastModified });
      recentCache.current = [filename, ...recentCache.current.filter(f => f !== filename)].slice(0, 10);
      dbPushRecent(filename).catch(console.error);
      return content;
    }

    // ── Cache miss: file was created mid-session by useFileStructure ──
    // Return '' so the editor clears, and fetch real content from Dexie
    // in case it has been written (e.g. rename with existing content).
    setCurrentDocument(prev => ({ ...prev, filename, content: '', saved: true, lastModified: new Date().toISOString() }));
    db.documents.get(filename).then(row => {
      if (!row) return;
      const entry = { content: row.content, lastModified: row.lastModified };
      docsCache[filename] = entry;
      setCurrentDocument({ filename, content: row.content, saved: true, lastModified: row.lastModified });
    }).catch(console.error);

    return '';
  }, []);

  const getAllDocuments = useCallback((): Record<string, DocumentData> => {
    return docsCache;
  }, []);

  const getRecentFiles = useCallback((): string[] => {
    return recentCache.current.slice(0, 5);
  }, []);

  // saveState kept for manual calls (Ctrl+S path writes it too via saveDocument).
  const saveState = useCallback((content: string) => {
    const { filename, saved } = currentDocRef.current;
    writeSessionState(filename, content, saved);
  }, []); // stable — reads from ref

  const loadState = useCallback((): { filename: string; content: string; saved: boolean } | null => {
    const saved = localStorage.getItem(CURRENT_KEY);
    if (!saved) return null;
    try {
      const data = JSON.parse(saved) as { filename?: string; content?: string; saved?: boolean };
      if (data.content) {
        setCurrentDocument({
          filename: data.filename || '',
          content: data.content,
          saved: data.saved ?? true,
          lastModified: new Date().toISOString(),
        });
        return { filename: data.filename || '', content: data.content, saved: data.saved ?? true };
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const updateContent = useCallback((content: string) => {
    setCurrentDocument(prev => ({ ...prev, content, saved: false }));
  }, []);

  const createNew = useCallback(() => {
    setCurrentDocument({ filename: '', content: '', saved: true, lastModified: null });
  }, []);

  return {
    currentDocument,
    setCurrentDocument,
    saveDocument,
    loadDocument,
    getAllDocuments,
    getRecentFiles,
    saveState,
    loadState,
    updateContent,
    createNew,
  };
}
