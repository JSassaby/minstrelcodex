import { useState, useEffect, useRef, useCallback } from 'react';
import { db, docsCache } from '../db';
import type { CloudAdapter } from '../adapters/CloudAdapter';
import { TokenExpiredError } from '../adapters/CloudAdapter';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline' | 'disconnected';

const PUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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

  // Every 5 minutes: push pending — restarts when adapter becomes available
  useEffect(() => {
    if (!adapter) return;
    const interval = setInterval(() => performSync('push'), PUSH_INTERVAL_MS);
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
