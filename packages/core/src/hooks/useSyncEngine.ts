import { useState, useEffect, useRef, useCallback } from 'react';
import { db, docsCache } from '../db';
import type { CloudAdapter } from '../adapters/CloudAdapter';
import { TokenExpiredError } from '../adapters/CloudAdapter';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline' | 'disconnected';

const SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes — full bidirectional sync

interface SyncEngineOptions {
  onTokenExpired?: () => void;
  /** Called after pull with an array of all remote file paths so the UI tree can be rebuilt */
  onRemotePaths?: (paths: string[]) => void;
}

export function useSyncEngine(adapter: CloudAdapter | null, options: SyncEngineOptions = {}) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const adapterRef = useRef<CloudAdapter | null>(adapter);
  useEffect(() => { adapterRef.current = adapter; }, [adapter]);

  const onTokenExpiredRef = useRef(options.onTokenExpired);
  useEffect(() => { onTokenExpiredRef.current = options.onTokenExpired; }, [options.onTokenExpired]);

  const onRemotePathsRef = useRef(options.onRemotePaths);
  useEffect(() => { onRemotePathsRef.current = options.onRemotePaths; }, [options.onRemotePaths]);

  const performSync = useCallback(async (direction: 'pull' | 'push' | 'both') => {
    const a = adapterRef.current;
    if (!a || !a.isConnected()) {
      setSyncStatus('disconnected');
      return;
    }
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');

    try {
      const updatedIds: string[] = [];

      // ── Pull: remote wins if remote is newer ────────────────────────
      if (direction === 'pull' || direction === 'both') {
        const remoteFiles = await a.list();

        for (const [localId, remoteFile] of remoteFiles) {
          const local = docsCache[localId];
          const localTime = local?.lastModified ? new Date(local.lastModified).getTime() : 0;

          if (remoteFile.modifiedTime > localTime) {
            const content = await a.pull(remoteFile.id);
            if (content !== null) {
              const lastModified = new Date(remoteFile.modifiedTime).toISOString();
              docsCache[localId] = { content, lastModified };
              await db.documents.put({
                id: localId,
                content,
                lastModified,
                syncStatus: 'synced',
              });
              updatedIds.push(localId);
            }
          }
        }

        if (updatedIds.length > 0) {
          window.dispatchEvent(
            new CustomEvent('minstrel:remote-pull', { detail: { updatedIds } })
          );
        }

        // Notify about ALL remote file paths so the file tree can be synced
        const allRemotePaths = Array.from(remoteFiles.keys());
        if (allRemotePaths.length > 0) {
          onRemotePathsRef.current?.(allRemotePaths);
        }
      }

      // ── Push: upload all pending docs ────────────────────────────────
      if (direction === 'push' || direction === 'both') {
        const pending = await db.documents.where('syncStatus').equals('pending').toArray();

        for (const doc of pending) {
          const remoteId = await a.push(doc.id, doc.content);
          if (remoteId !== null) {
            await db.documents.update(doc.id, { syncStatus: 'synced' });
          }
        }

        // ── Delete: remove remotely-deleted docs from Drive ─────────────
        const deleted = await db.documents.where('syncStatus').equals('deleted').toArray();
        for (const doc of deleted) {
          try {
            await a.delete(doc.id);
          } catch {
            // best-effort — file may already be gone
          }
          // Remove the tombstone from local DB
          await db.documents.delete(doc.id);
        }
      }

      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        setSyncStatus('error');
        onTokenExpiredRef.current?.();
        return;
      }
      console.error('[useSyncEngine] sync error:', err);
      setSyncStatus('error');
    }
  }, []); // stable — reads from adapterRef

  // On mount: pull then push
  useEffect(() => {
    if (!adapter) return;
    performSync('both');
  }, []); // run once on mount

  // Every 2 minutes: full bidirectional sync
  useEffect(() => {
    if (!adapter) return;
    const interval = setInterval(() => performSync('both'), SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [adapter]); // re-run when adapter changes so interval is set up when token loads

  // React to adapter connection changes
  useEffect(() => {
    if (!adapter) {
      setSyncStatus('disconnected');
      return;
    }
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    if (adapter.isConnected()) {
      setSyncStatus('synced');
    }
  }, [adapter]);

  // Online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (adapterRef.current?.isConnected()) performSync('push');
    };
    const handleOffline = () => setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // stable

  const triggerSync = useCallback(() => performSync('both'), [performSync]);

  return { syncStatus, lastSyncTime, triggerSync };
}
