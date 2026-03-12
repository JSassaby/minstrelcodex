import { useState, useEffect, useRef } from 'react';
import { useGoogleToken } from '@/hooks/useGoogleToken';
import ModalShell, { ModalButton } from './ModalShell';

const DEVICE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-device`;
// All edge function calls require an Authorization header (Supabase gateway enforces this).
// The anon key is sufficient — Drive connection does not require user sign-in.
const EDGE_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
};

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

// localStorage keys
const DEST_ID_KEY   = 'minstrel-drive-dest-id';
const DEST_NAME_KEY = 'minstrel-drive-dest-name';
const AUTOSAVE_KEY  = 'minstrel-drive-autosave';
const LAST_BACKUP_KEY = 'minstrel-drive-last-backup';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  parents?: string[];
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface GoogleDriveModalProps {
  visible: boolean;
  onClose: () => void;
  onLoadContent: (content: string, filename: string) => void;
  currentContent: string;
  currentFilename: string;
  localFolders?: { name: string; path: string[] }[];
  onSyncFolder?: (folderPath: string[], driveFolderId: string, driveFolderName: string) => void;
  onBackupNow?: (driveFolderId: string, driveFolderName: string) => void;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive`;
const FOLDER_MIME = 'application/vnd.google-apps.folder';

function formatBackupTime(iso: string | null): string {
  if (!iso) return 'Never backed up';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Backed up just now';
  if (mins < 60) return `Last backed up ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last backed up ${hrs}h ago`;
  return `Last backed up ${Math.floor(hrs / 24)}d ago`;
}

// ── Shared sub-styles ─────────────────────────────────────────────────────
const sectionLabel: React.CSSProperties = {
  fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: '#888', fontFamily: uiFont,
  marginBottom: '10px',
};

const divider: React.CSSProperties = {
  borderTop: '1px solid #333', marginTop: '16px', paddingTop: '16px',
};

export default function GoogleDriveModal({
  visible, onClose, onLoadContent, currentContent, currentFilename,
  localFolders, onSyncFolder, onBackupNow,
}: GoogleDriveModalProps) {
  const { googleToken, isConnected, clearToken, setToken, refreshToken } = useGoogleToken();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [status, setStatus] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'My Drive' }]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);

  // Device Authorization Flow state
  const [deviceFlowActive, setDeviceFlowActive] = useState(false);
  const [deviceCode, setDeviceCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [justConnectedLocal, setJustConnectedLocal] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // New single-panel state
  const [backupDestFolder, setBackupDestFolder] = useState<{ id: string; name: string } | null>(() => {
    const id = localStorage.getItem(DEST_ID_KEY);
    const name = localStorage.getItem(DEST_NAME_KEY);
    return id && name ? { id, name } : null;
  });
  const [autoSave, setAutoSave] = useState(() =>
    localStorage.getItem(AUTOSAVE_KEY) !== 'false'
  );
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() =>
    localStorage.getItem(LAST_BACKUP_KEY)
  );
  const [whatExpanded, setWhatExpanded] = useState(false);
  const [browseExpanded, setBrowseExpanded] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1]?.id || 'root';

  const getToken = (): string | null => googleToken;

  const cancelDeviceFlow = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setDeviceFlowActive(false);
    setDeviceCode(''); setUserCode(''); setVerificationUrl('');
  };

  const startDeviceFlow = async () => {
    setLoading(true); setError(''); setNeedsReauth(false);
    try {
      const res = await fetch(DEVICE_URL, {
        method: 'POST',
        headers: EDGE_HEADERS,
        body: JSON.stringify({ action: 'request-code' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start device auth. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set as Supabase secrets.');
        setLoading(false);
        return;
      }

      setDeviceCode(data.device_code);
      setUserCode(data.user_code);
      setVerificationUrl(data.verification_url || 'https://www.google.com/device');
      setDeviceFlowActive(true);

      const intervalMs = (data.interval || 5) * 1000;
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(DEVICE_URL, {
            method: 'POST',
            headers: EDGE_HEADERS,
            body: JSON.stringify({ action: 'poll-token', deviceCode: data.device_code }),
          });
          const pollData = await pollRes.json();

          if (pollData.access_token) {
            clearInterval(pollRef.current!); pollRef.current = null;
            setToken(pollData.access_token, pollData.refresh_token);
            setDeviceFlowActive(false);
            setJustConnectedLocal(true);
          } else if (pollData.error === 'access_denied' || pollData.error === 'expired_token') {
            clearInterval(pollRef.current!); pollRef.current = null;
            setDeviceFlowActive(false);
            setError(pollData.error === 'access_denied' ? 'Access denied. Please try again.' : 'Code expired. Please try again.');
          }
        } catch { /* network hiccup — keep polling */ }
      }, intervalMs);
    } catch (e: any) {
      setError(e.message || 'Device auth failed');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!visible || !googleToken || justConnectedLocal) return;
    setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
    setError(''); setStatus(''); setNeedsReauth(false);
  }, [visible, googleToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible) cancelDeviceFlow();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load files when browse section is expanded
  useEffect(() => {
    if (browseExpanded && googleToken && files.length === 0) {
      loadFiles(googleToken, currentFolderId);
    }
  }, [browseExpanded]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFiles = async (token: string, folderId: string) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST', headers: EDGE_HEADERS,
        body: JSON.stringify({ action: 'list', googleToken: token, folderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          clearToken();
          setNeedsReauth(true);
          setFiles([]);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to list files');
      }
      const sorted = (data.files || []).sort((a: DriveFile, b: DriveFile) => {
        const aIsFolder = a.mimeType === FOLDER_MIME ? 0 : 1;
        const bIsFolder = b.mimeType === FOLDER_MIME ? 0 : 1;
        if (aIsFolder !== bIsFolder) return aIsFolder - bIsFolder;
        return a.name.localeCompare(b.name);
      });
      setFiles(sorted);
      setSelectedIdx(0);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const navigateToFolder = (folder: DriveFile) => {
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    const token = getToken();
    if (token) loadFiles(token, folder.id);
  };

  const navigateToBreadcrumb = (idx: number) => {
    const target = breadcrumbs[idx];
    setBreadcrumbs(prev => prev.slice(0, idx + 1));
    const token = getToken();
    if (token) loadFiles(token, target.id);
  };

  const downloadFile = async (file: DriveFile) => {
    const token = getToken();
    if (!token) return;
    setLoading(true); setStatus(`Downloading ${file.name}…`);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST', headers: EDGE_HEADERS,
        body: JSON.stringify({ action: 'download', googleToken: token, fileId: file.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Download failed');
      onLoadContent(data.content, data.name); setStatus(''); onClose();
    } catch (e: any) { setError(e.message); setStatus(''); }
    setLoading(false);
  };

  const uploadFile = async () => {
    const token = getToken();
    if (!token || !currentContent) return;
    setLoading(true);
    const name = currentFilename || 'Untitled.html';
    setStatus(`Uploading ${name} to ${breadcrumbs[breadcrumbs.length - 1].name}…`);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST', headers: EDGE_HEADERS,
        body: JSON.stringify({
          action: 'upload', googleToken: token, fileName: name, content: currentContent,
          mimeType: 'text/html', parentId: currentFolderId === 'root' ? undefined : currentFolderId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setStatus(`✓ Uploaded ${name}`);
      setTimeout(() => setStatus(''), 3000);
      await loadFiles(token, currentFolderId);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const createFolder = async () => {
    const token = getToken();
    if (!token || !newFolderName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST', headers: EDGE_HEADERS,
        body: JSON.stringify({
          action: 'create-folder', googleToken: token, folderName: newFolderName.trim(),
          parentId: currentFolderId === 'root' ? undefined : currentFolderId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create folder');
      setNewFolderName('');
      setShowNewFolder(false);
      await loadFiles(token, currentFolderId);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleItemClick = (file: DriveFile, idx: number) => {
    setSelectedIdx(idx);
    if (file.mimeType === FOLDER_MIME) {
      navigateToFolder(file);
    } else {
      downloadFile(file);
    }
  };

  const setAsBackupDest = () => {
    const current = breadcrumbs[breadcrumbs.length - 1];
    const name = breadcrumbs.map(b => b.name).join(' / ');
    localStorage.setItem(DEST_ID_KEY, current.id);
    localStorage.setItem(DEST_NAME_KEY, name);
    setBackupDestFolder({ id: current.id, name });
    setBrowseExpanded(false);
  };

  const handleBackupNow = async () => {
    if (!backupDestFolder) return;
    setBackingUp(true);
    const now = new Date().toISOString();
    localStorage.setItem(LAST_BACKUP_KEY, now);
    setLastBackupTime(now);

    if (onBackupNow) {
      onBackupNow(backupDestFolder.id, backupDestFolder.name);
    } else if (localFolders && localFolders.length > 0 && onSyncFolder) {
      for (const folder of localFolders) {
        onSyncFolder(folder.path, backupDestFolder.id, backupDestFolder.name);
      }
    }
    setTimeout(() => setBackingUp(false), 1500);
  };

  const handleDisconnect = () => {
    clearToken();
    setFiles([]);
    setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
    setStatus('');
    setError('');
  };

  const toggleAutoSave = () => {
    const next = !autoSave;
    localStorage.setItem(AUTOSAVE_KEY, String(next));
    setAutoSave(next);
  };

  useEffect(() => {
    if (!visible || !isConnected) return;
    const handler = (e: KeyboardEvent) => {
      if (!browseExpanded) return;
      if (e.key === 'ArrowDown') { setSelectedIdx(prev => Math.min(prev + 1, files.length - 1)); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { setSelectedIdx(prev => Math.max(prev - 1, 0)); e.preventDefault(); }
      else if (e.key === 'Enter' && files[selectedIdx]) {
        handleItemClick(files[selectedIdx], selectedIdx);
        e.preventDefault();
      }
      else if (e.key === 'Backspace' && breadcrumbs.length > 1 && !showNewFolder) {
        navigateToBreadcrumb(breadcrumbs.length - 2);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, isConnected, browseExpanded, files, selectedIdx, breadcrumbs, showNewFolder]);

  if (!visible) return null;

  return (
    <ModalShell visible={visible} title="☁ Google Drive" onClose={onClose} width="540px">
      <div style={{ minHeight: '200px' }}>
        {error && (
          <div style={{
            padding: '10px 14px', marginBottom: '14px',
            border: '1px solid rgba(224,92,92,0.4)', background: 'rgba(224,92,92,0.08)',
            fontSize: '13px', fontFamily: uiFont, color: '#e05c5c',
          }}>
            ⚠ {error}
            <span onClick={() => setError('')} style={{ float: 'right', cursor: 'pointer', opacity: 0.7 }}>✕</span>
          </div>
        )}
        {status && (
          <div style={{
            padding: '10px 14px', marginBottom: '14px',
            border: '1px solid var(--terminal-border)', background: 'var(--terminal-surface)',
            fontSize: '13px', fontFamily: uiFont, opacity: 0.8,
          }}>
            {status}
          </div>
        )}

        {/* ── NOT CONNECTED ──────────────────────────────────────── */}
        {(!isConnected || justConnectedLocal) ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            {justConnectedLocal ? (
              <>
                <div style={{ fontSize: '42px', marginBottom: '16px' }}>✅</div>
                <p style={{ marginBottom: '20px', fontSize: '16px', fontFamily: uiFont, fontWeight: '600' }}>
                  Connected to Google Drive
                </p>
                <ModalButton label="Continue" focused onClick={() => {
                  setJustConnectedLocal(false);
                  const token = getToken();
                  if (token) { setBrowseExpanded(false); }
                }} />
              </>
            ) : deviceFlowActive ? (
              <>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📱</div>
                <p style={{ marginBottom: '8px', fontSize: '14px', fontFamily: uiFont, fontWeight: '500' }}>
                  Authorize on your phone or another device
                </p>
                <p style={{ marginBottom: '12px', fontSize: '12px', opacity: 0.6, fontFamily: uiFont }}>
                  Open this URL:
                </p>
                <div style={{
                  padding: '10px 16px', marginBottom: '12px',
                  background: 'var(--terminal-surface)', border: '1px solid var(--terminal-border)',
                  fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all',
                }}>
                  {verificationUrl}
                </div>
                <p style={{ marginBottom: '8px', fontSize: '12px', opacity: 0.6, fontFamily: uiFont }}>
                  Then enter this code:
                </p>
                <div style={{
                  fontSize: '30px', fontFamily: 'monospace', fontWeight: '700',
                  letterSpacing: '0.2em', color: 'var(--terminal-accent)', marginBottom: '20px',
                }}>
                  {userCode}
                </div>
                <p style={{ marginBottom: '16px', fontSize: '12px', opacity: 0.45, fontFamily: uiFont }}>
                  Waiting for authorization…
                </p>
                <ModalButton label="✕ Cancel" focused={false} onClick={cancelDeviceFlow} />
              </>
            ) : (
              <>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>☁️</div>
                <p style={{ marginBottom: '6px', fontSize: '14px', fontFamily: uiFont, fontWeight: '500' }}>
                  Connect to Google Drive
                </p>
                <p style={{ marginBottom: '24px', fontSize: '12px', opacity: 0.5, fontFamily: uiFont }}>
                  No browser redirect — authorize from your phone
                </p>
                <ModalButton label={loading ? 'Starting…' : '🔑 Connect Google Drive'} focused onClick={startDeviceFlow} />
              </>
            )}
          </div>

        /* ── NEEDS REAUTH ─────────────────────────────────────── */
        ) : needsReauth ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔄</div>
            <p style={{ marginBottom: '6px', fontSize: '14px', fontFamily: uiFont, fontWeight: '500' }}>Drive access expired</p>
            <p style={{ marginBottom: '24px', fontSize: '12px', opacity: 0.5, fontFamily: uiFont }}>Reconnect to restore access</p>
            <ModalButton label={loading ? 'Starting…' : '🔑 Reconnect Google Drive'} focused onClick={startDeviceFlow} />
          </div>

        /* ── CONNECTED — SINGLE PANEL ─────────────────────────── */
        ) : (
          <>
            {/* Connection status */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0', marginBottom: '16px',
              borderBottom: '1px solid #333',
              fontSize: '11px', fontFamily: uiFont,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--terminal-accent)', fontWeight: '500' }}>
                <span style={{ width: '6px', height: '6px', background: 'var(--terminal-accent)', display: 'inline-block' }} />
                Connected to Google Drive
              </span>
              <span
                onClick={handleDisconnect}
                style={{ cursor: 'pointer', opacity: 0.4, fontSize: '11px', fontFamily: uiFont }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
              >
                Disconnect
              </span>
            </div>

            {/* ── 1. BACKUP DESTINATION ──────────────────────────── */}
            <div style={sectionLabel}>Backup Destination</div>
            {backupDestFolder ? (
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontFamily: uiFont, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📁</span>
                  <span style={{ flex: 1, color: 'var(--terminal-text)' }}>{backupDestFolder.name}</span>
                  <span
                    onClick={() => { setBrowseExpanded(true); }}
                    style={{ fontSize: '11px', color: 'var(--terminal-accent)', cursor: 'pointer', opacity: 0.8, flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
                  >
                    Change
                  </span>
                </span>
                <div style={{ fontSize: '11px', color: '#888', fontFamily: uiFont, marginTop: '4px', paddingLeft: '22px' }}>
                  {formatBackupTime(lastBackupTime)}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', color: '#888', fontFamily: uiFont, marginBottom: '8px' }}>
                  No folder selected — choose where your backup lives on Drive.
                </div>
                <button
                  onClick={() => setBrowseExpanded(true)}
                  style={{
                    padding: '7px 14px', border: '1px solid var(--terminal-border)',
                    background: 'transparent', color: 'var(--terminal-text)',
                    fontFamily: uiFont, fontSize: '12px', cursor: 'pointer',
                    fontWeight: 500, letterSpacing: '0.02em',
                  }}
                >
                  Browse &amp; select folder
                </button>
              </div>
            )}

            {/* Back Up Now button */}
            <button
              onClick={handleBackupNow}
              disabled={!backupDestFolder || backingUp}
              style={{
                width: '100%', padding: '10px', marginTop: '10px',
                border: `1px solid ${backupDestFolder ? 'var(--terminal-accent)' : '#333'}`,
                background: 'transparent',
                color: backupDestFolder ? 'var(--terminal-accent)' : '#555',
                fontFamily: uiFont, fontSize: '13px', fontWeight: 600,
                cursor: backupDestFolder ? 'pointer' : 'default',
                letterSpacing: '0.05em', transition: 'opacity 0.15s',
                opacity: backingUp ? 0.6 : 1,
              }}
            >
              {backingUp ? 'Backing up…' : '↑ Back Up Now'}
            </button>

            {/* ── 2. AUTO-SAVE ─────────────────────────────────────── */}
            <div style={divider}>
              <div style={sectionLabel}>Auto-Save</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ flex: 1, fontSize: '13px', fontFamily: uiFont, color: 'var(--terminal-text)' }}>
                  Automatically back up changes
                </span>
                <button
                  onClick={toggleAutoSave}
                  style={{
                    width: '36px', height: '20px',
                    background: autoSave ? 'var(--terminal-accent)' : '#1a2540',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px',
                    left: autoSave ? '18px' : '3px',
                    width: '14px', height: '14px',
                    background: '#fff', transition: 'left 0.2s', display: 'block',
                  }} />
                </button>
              </div>
              <div style={{ fontSize: '11px', color: '#888', fontFamily: uiFont, lineHeight: 1.55 }}>
                Saves to Google Drive every few minutes while you write.
              </div>
            </div>

            {/* ── 3. WHAT GETS BACKED UP (collapsible) ─────────────── */}
            <div style={divider}>
              <button
                onClick={() => setWhatExpanded(p => !p)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                }}
              >
                <span style={{ ...sectionLabel, marginBottom: 0, flex: 1, textAlign: 'left' as const }}>
                  What Gets Backed Up
                </span>
                <span style={{ fontSize: '10px', color: '#888', fontFamily: uiFont, transition: 'transform 0.15s', display: 'inline-block', transform: whatExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▸</span>
              </button>
              {whatExpanded && (
                <div style={{ marginTop: '10px' }}>
                  {(!localFolders || localFolders.length === 0) ? (
                    <div style={{ fontSize: '12px', color: '#888', fontFamily: uiFont, padding: '8px 0' }}>
                      No local folders found. Create folders in the File Browser first.
                    </div>
                  ) : localFolders.map((folder, i) => (
                    <div
                      key={folder.name + i}
                      style={{
                        padding: '8px 0',
                        borderBottom: i < localFolders.length - 1 ? '1px solid #222' : 'none',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '12px', fontFamily: uiFont, color: 'var(--terminal-text)',
                      }}
                    >
                      <span style={{ opacity: 0.6 }}>📂</span>
                      <span style={{ opacity: 0.8 }}>/{folder.path.join('/')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── 4. BROWSE DRIVE (collapsible) ────────────────────── */}
            <div style={divider}>
              <button
                onClick={() => setBrowseExpanded(p => !p)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                }}
              >
                <span style={{ ...sectionLabel, marginBottom: 0, flex: 1, textAlign: 'left' as const }}>
                  Browse Drive
                </span>
                <span style={{ fontSize: '10px', color: '#888', fontFamily: uiFont, transition: 'transform 0.15s', display: 'inline-block', transform: browseExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▸</span>
              </button>

              {browseExpanded && (
                <div style={{ marginTop: '12px' }}>
                  {/* Set as backup destination */}
                  <button
                    onClick={setAsBackupDest}
                    style={{
                      width: '100%', padding: '8px 12px', marginBottom: '12px',
                      border: '1px solid var(--terminal-accent)', background: 'rgba(0,212,200,0.06)',
                      color: 'var(--terminal-accent)', fontFamily: uiFont, fontSize: '12px',
                      fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em', textAlign: 'left' as const,
                    }}
                  >
                    📌 Use "{breadcrumbs[breadcrumbs.length - 1]?.name || 'root'}" as backup destination
                  </button>

                  {/* Breadcrumb navigation */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 10px',
                    marginBottom: '8px', background: 'var(--terminal-surface)',
                    border: '1px solid var(--terminal-border)',
                    fontSize: '12px', fontFamily: uiFont, overflowX: 'auto', whiteSpace: 'nowrap',
                  }}>
                    {breadcrumbs.map((crumb, i) => (
                      <span key={crumb.id + i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {i > 0 && <span style={{ opacity: 0.35 }}>›</span>}
                        <span
                          onClick={() => navigateToBreadcrumb(i)}
                          style={{
                            cursor: 'pointer', padding: '2px 4px',
                            fontWeight: i === breadcrumbs.length - 1 ? '600' : '400',
                            opacity: i === breadcrumbs.length - 1 ? 1 : 0.65,
                          }}
                          onMouseOver={e => (e.currentTarget.style.opacity = '1')}
                          onMouseOut={e => (e.currentTarget.style.opacity = i === breadcrumbs.length - 1 ? '1' : '0.65')}
                        >
                          {i === 0 ? '🏠' : '📁'} {crumb.name}
                        </span>
                      </span>
                    ))}
                  </div>

                  {loading && files.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', opacity: 0.5, fontFamily: uiFont, fontSize: '13px' }}>Loading…</div>
                  ) : (
                    <>
                      <div style={{
                        maxHeight: '220px', overflowY: 'auto',
                        border: '1px solid var(--terminal-border)',
                        marginBottom: '10px',
                      }}>
                        {files.length === 0 && !loading ? (
                          <div style={{ textAlign: 'center', padding: '20px', opacity: 0.45, fontFamily: uiFont, fontSize: '13px' }}>
                            Empty folder
                          </div>
                        ) : files.map((file, i) => {
                          const isFolder = file.mimeType === FOLDER_MIME;
                          return (
                            <div
                              key={file.id}
                              onClick={() => handleItemClick(file, i)}
                              onMouseEnter={() => setSelectedIdx(i)}
                              style={{
                                padding: '9px 14px', cursor: 'pointer',
                                borderBottom: i < files.length - 1 ? '1px solid var(--terminal-border)' : 'none',
                                background: i === selectedIdx ? 'var(--terminal-accent)' : 'transparent',
                                color: i === selectedIdx ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                fontSize: '13px', fontFamily: uiFont, transition: 'background 0.1s',
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px' }}>{isFolder ? '📁' : '📄'}</span>
                                <span style={{ fontWeight: isFolder ? '500' : '400' }}>{file.name}</span>
                              </span>
                              <span style={{ fontSize: '11px', opacity: 0.55, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ''}
                                {isFolder && <span style={{ opacity: 0.6 }}>›</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {showNewFolder && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                          <input
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                            placeholder="Folder name…"
                            autoFocus
                            style={{
                              flex: 1, padding: '8px 12px',
                              border: '1px solid var(--terminal-border)', background: 'var(--terminal-surface)',
                              color: 'var(--terminal-text)', fontSize: '13px', fontFamily: uiFont, outline: 'none',
                            }}
                          />
                          <button onClick={createFolder} style={{
                            padding: '8px 14px', border: 'none', cursor: 'pointer',
                            background: 'var(--terminal-accent)', color: 'var(--terminal-bg)',
                            fontSize: '12px', fontWeight: '600', fontFamily: uiFont,
                          }}>Create</button>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <ModalButton label="📤 Upload here" focused={false} onClick={uploadFile} />
                        <ModalButton label="📁 New folder" focused={false} onClick={() => { setShowNewFolder(!showNewFolder); setNewFolderName(''); }} />
                        <ModalButton label="↺ Refresh" focused={false} onClick={() => { const t = getToken(); if (t) loadFiles(t, currentFolderId); }} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
