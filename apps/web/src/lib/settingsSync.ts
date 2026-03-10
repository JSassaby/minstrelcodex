import { supabase } from '@/integrations/supabase/client';

// ── Keys that sync as simple overwrites (remote wins on pull) ──────────────
const PREF_KEYS = [
  'pw-theme-chosen', 'pw-theme-mode', 'pw-music-prefs', 'pw-accessibility',
  'pw-language', 'minstrel_editor_font', 'minstrel-editor-fontsize',
  'minstrel-welcome-seen', 'minstrel-wizard-complete', 'minstrel-novel-created',
  'minstrel-wizard-config', 'minstrel-active-project', 'minstrel_wpm_record',
  'minstrel_offline_sessions', 'minstrel_wifi_configured', 'minstrel-narrative-beats',
  'pw-recent', 'pw-current',
];

// ── Keys that need union merge (never delete local data) ───────────────────
const MERGE_KEYS = ['pw-documents', 'pw-file-structure'];

function collectProjectSettingsKeys(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('minstrel-project-settings:')) {
      const val = localStorage.getItem(key);
      if (val !== null) out[key] = val;
    }
  }
  return out;
}

function buildLocalSnapshot(): Record<string, string> {
  const snap: Record<string, string> = {};
  for (const key of PREF_KEYS) {
    const val = localStorage.getItem(key);
    if (val !== null) snap[key] = val;
  }
  for (const key of MERGE_KEYS) {
    const val = localStorage.getItem(key);
    if (val !== null) snap[key] = val;
  }
  const projectKeys = collectProjectSettingsKeys();
  Object.assign(snap, projectKeys);
  return snap;
}

/** Merge two pw-documents objects: union of keys, prefer most recent lastModified */
function mergeDocuments(local: string | null, remote: string | null): string | null {
  if (!local && !remote) return null;
  if (!local) return remote;
  if (!remote) return local;
  try {
    const l = JSON.parse(local) as Record<string, { lastModified?: number }>;
    const r = JSON.parse(remote) as Record<string, { lastModified?: number }>;
    const merged: Record<string, unknown> = { ...r };
    for (const [k, lv] of Object.entries(l)) {
      const rv = r[k];
      if (!rv) {
        merged[k] = lv;
      } else {
        const lt = lv?.lastModified ?? 0;
        const rt = rv?.lastModified ?? 0;
        merged[k] = lt >= rt ? lv : rv;
      }
    }
    return JSON.stringify(merged);
  } catch {
    return local; // On parse error keep local
  }
}

/** Merge two pw-file-structure objects: union of root keys, local wins for conflicts */
function mergeFileStructure(local: string | null, remote: string | null): string | null {
  if (!local && !remote) return null;
  if (!local) return remote;
  if (!remote) return local;
  try {
    const l = JSON.parse(local) as Record<string, unknown>;
    const r = JSON.parse(remote) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...r, ...l }; // local wins
    // Add remote-only nested keys (root level)
    if (l.root && r.root && typeof l.root === 'object' && typeof r.root === 'object') {
      const lr = l.root as Record<string, unknown>;
      const rr = r.root as Record<string, unknown>;
      const mergedRoot = { ...rr, ...lr };
      merged.root = mergedRoot;
    }
    return JSON.stringify(merged);
  } catch {
    return local;
  }
}

/** Push all local settings to Supabase. Silent on failure, sets pending flag. */
export async function pushSettings(userId: string): Promise<void> {
  try {
    const settings = buildLocalSnapshot();
    const { error } = await supabase.from('user_settings').upsert({
      id: userId,
      settings: settings as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    localStorage.removeItem('minstrel-sync-pending');
    localStorage.setItem('minstrel-last-synced', new Date().toISOString());
  } catch {
    localStorage.setItem('minstrel-sync-pending', 'true');
  }
}

/** Pull settings from Supabase and merge into localStorage. Never deletes local data. */
export async function pullSettings(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('id', userId)
      .single();
    if (error || !data) return;

    const remote = data.settings as Record<string, string>;

    // Simple preference keys: remote wins
    for (const key of PREF_KEYS) {
      if (remote[key] !== undefined && remote[key] !== null) {
        localStorage.setItem(key, String(remote[key]));
      }
    }

    // Project settings keys from remote
    for (const [key, val] of Object.entries(remote)) {
      if (key.startsWith('minstrel-project-settings:')) {
        localStorage.setItem(key, String(val));
      }
    }

    // Merge keys: union, never delete local
    const localDocs = localStorage.getItem('pw-documents');
    const remoteDocs = remote['pw-documents'] ? String(remote['pw-documents']) : null;
    const mergedDocs = mergeDocuments(localDocs, remoteDocs);
    if (mergedDocs !== null) localStorage.setItem('pw-documents', mergedDocs);

    const localFs = localStorage.getItem('pw-file-structure');
    const remoteFs = remote['pw-file-structure'] ? String(remote['pw-file-structure']) : null;
    const mergedFs = mergeFileStructure(localFs, remoteFs);
    if (mergedFs !== null) localStorage.setItem('pw-file-structure', mergedFs);

  } catch {
    // Silent failure — local data untouched
  }
}

// ── Debounced sync ─────────────────────────────────────────────────────────
let syncTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced push (2s). No-op if userId is null. */
export function syncOnChange(userId: string | null): void {
  if (!userId) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    pushSettings(userId).catch(() => {});
    syncTimer = null;
  }, 2000);
}

/** Push immediately if minstrel-sync-pending is set and user is signed in. */
export async function flushPendingSync(userId: string): Promise<void> {
  if (localStorage.getItem('minstrel-sync-pending') === 'true') {
    await pushSettings(userId);
  }
}
