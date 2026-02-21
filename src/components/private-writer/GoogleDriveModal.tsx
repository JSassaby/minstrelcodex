import { useState, useEffect } from 'react';
import { lovable } from '@/integrations/lovable/index';
import { useGoogleToken } from '@/hooks/useGoogleToken';
import ModalShell, { ModalButton } from './ModalShell';

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

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
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive`;
const FOLDER_MIME = 'application/vnd.google-apps.folder';

export default function GoogleDriveModal({
  visible, onClose, onLoadContent, currentContent, currentFilename,
  localFolders, onSyncFolder,
}: GoogleDriveModalProps) {
  const { googleToken, isConnected, clearToken, justConnected, dismissJustConnected, userEmail } = useGoogleToken();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [status, setStatus] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'My Drive' }]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [tab, setTab] = useState<'browse' | 'sync'>('browse');
  const [syncTargetFolder, setSyncTargetFolder] = useState<{ id: string; name: string } | null>(null);

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1]?.id || 'root';

  // When modal opens and we have a token, load root files
  useEffect(() => {
    if (visible && isConnected && googleToken) {
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
      setTab('browse');
      setError('');
      setStatus('');
      loadFiles(googleToken, 'root');
    }
  }, [visible, isConnected]);

  const signIn = async () => {
    setLoading(true); setError('');
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: { scope: 'https://www.googleapis.com/auth/drive.file', access_type: 'offline', prompt: 'consent' },
      });
      if (error) { setError(error.message || 'Sign-in failed'); setLoading(false); return; }
      // If we're still here after 5s, the redirect likely didn't work (e.g. iframe)
      setTimeout(() => {
        setLoading(false);
        setError('Redirect did not occur. Try opening the app in a new tab.');
      }, 5000);
    } catch (e: any) {
      setError(e.message || 'Sign-in failed');
      setLoading(false);
    }
  };

  const loadFiles = async (token: string, folderId: string) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', googleToken: token, folderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        // If 401, token is expired — clear it
        if (res.status === 401) {
          clearToken();
          setError('Google session expired. Please sign in again.');
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
    if (googleToken) loadFiles(googleToken, folder.id);
  };

  const navigateToBreadcrumb = (idx: number) => {
    const target = breadcrumbs[idx];
    setBreadcrumbs(prev => prev.slice(0, idx + 1));
    if (googleToken) loadFiles(googleToken, target.id);
  };

  const downloadFile = async (file: DriveFile) => {
    if (!googleToken) return;
    setLoading(true); setStatus(`Downloading ${file.name}…`);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download', googleToken, fileId: file.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Download failed');
      onLoadContent(data.content, data.name); setStatus(''); onClose();
    } catch (e: any) { setError(e.message); setStatus(''); }
    setLoading(false);
  };

  const uploadFile = async () => {
    if (!googleToken || !currentContent) return;
    setLoading(true);
    const name = currentFilename || 'Untitled.html';
    setStatus(`Uploading ${name} to ${breadcrumbs[breadcrumbs.length - 1].name}…`);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload', googleToken, fileName: name, content: currentContent,
          mimeType: 'text/html', parentId: currentFolderId === 'root' ? undefined : currentFolderId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setStatus(`✓ Uploaded ${name}`);
      setTimeout(() => setStatus(''), 3000);
      await loadFiles(googleToken, currentFolderId);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const createFolder = async () => {
    if (!googleToken || !newFolderName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-folder', googleToken, folderName: newFolderName.trim(),
          parentId: currentFolderId === 'root' ? undefined : currentFolderId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create folder');
      setNewFolderName('');
      setShowNewFolder(false);
      await loadFiles(googleToken, currentFolderId);
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

  const selectSyncTarget = () => {
    const current = breadcrumbs[breadcrumbs.length - 1];
    setSyncTargetFolder({ id: current.id, name: breadcrumbs.map(b => b.name).join(' / ') });
  };

  const handleDisconnect = () => {
    clearToken();
    setFiles([]);
    setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
    setStatus('');
    setError('');
  };

  useEffect(() => {
    if (!visible || !isConnected) return;
    const handler = (e: KeyboardEvent) => {
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
  }, [visible, isConnected, files, selectedIdx, googleToken, breadcrumbs, showNewFolder]);

  if (!visible) return null;

  return (
    <ModalShell visible={visible} title="☁ Google Drive" onClose={onClose} width="520px">
      <div style={{ minHeight: '200px' }}>
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '9px', border: '1px solid rgba(224,92,92,0.4)', background: 'rgba(224,92,92,0.08)', fontSize: '13px', fontFamily: uiFont, color: '#e05c5c' }}>
            ⚠ {error}
            <span onClick={() => setError('')} style={{ float: 'right', cursor: 'pointer', opacity: 0.7 }}>✕</span>
          </div>
        )}
        {status && (
          <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '9px', border: '1px solid var(--terminal-border)', background: 'var(--terminal-surface)', fontSize: '13px', fontFamily: uiFont, opacity: 0.8 }}>
            {status}
          </div>
        )}

        {!isConnected ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>☁️</div>
            <p style={{ marginBottom: '6px', fontSize: '14px', fontFamily: uiFont, fontWeight: '500' }}>Connect to Google Drive</p>
            <p style={{ marginBottom: '24px', fontSize: '12px', opacity: 0.5, fontFamily: uiFont }}>Browse folders, upload files, and sync your work</p>
            <ModalButton label={loading ? 'Connecting…' : '🔑 Sign in with Google'} focused onClick={signIn} />
          </div>
        ) : justConnected ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '42px', marginBottom: '16px' }}>✅</div>
            <p style={{ marginBottom: '6px', fontSize: '16px', fontFamily: uiFont, fontWeight: '600' }}>
              Connected to Google Drive
            </p>
            {userEmail && (
              <p style={{ marginBottom: '8px', fontSize: '13px', fontFamily: uiFont, opacity: 0.7 }}>
                Signed in as <strong>{userEmail}</strong>
              </p>
            )}
            <p style={{ marginBottom: '24px', fontSize: '12px', opacity: 0.5, fontFamily: uiFont, maxWidth: '320px', margin: '0 auto 24px' }}>
              You can now browse folders, upload files, and sync local folders to your Drive.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <ModalButton label="📂 Browse My Drive" focused onClick={() => {
                dismissJustConnected();
                setTab('browse');
              }} />
              <ModalButton label="🔄 Set Up Sync" focused={false} onClick={() => {
                dismissJustConnected();
                setTab('sync');
              }} />
            </div>
          </div>
        ) : (
          <>
            {/* Connection status bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', marginBottom: '10px', borderRadius: '9px',
              background: 'var(--terminal-surface)', fontSize: '11px', fontFamily: uiFont,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--terminal-accent)', fontWeight: '500' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--terminal-accent)', display: 'inline-block' }} />
                Connected to Google Drive
              </span>
              <span onClick={handleDisconnect} style={{ cursor: 'pointer', opacity: 0.5, fontSize: '11px' }}>
                Disconnect
              </span>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '2px', marginBottom: '12px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--terminal-border)' }}>
              {(['browse', 'sync'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                    background: tab === t ? 'var(--terminal-accent)' : 'var(--terminal-surface)',
                    color: tab === t ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                    fontSize: '12px', fontWeight: '600', fontFamily: uiFont,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}
                >
                  {t === 'browse' ? '📂 Browse' : '🔄 Sync Folders'}
                </button>
              ))}
            </div>

            {tab === 'browse' && (
              <>
                {/* Breadcrumb navigation */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px',
                  marginBottom: '10px', borderRadius: '9px', background: 'var(--terminal-surface)',
                  fontSize: '12px', fontFamily: uiFont, overflowX: 'auto', whiteSpace: 'nowrap',
                }}>
                  {breadcrumbs.map((crumb, i) => (
                    <span key={crumb.id + i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {i > 0 && <span style={{ opacity: 0.35 }}>›</span>}
                      <span
                        onClick={() => navigateToBreadcrumb(i)}
                        style={{
                          cursor: 'pointer', padding: '2px 6px', borderRadius: '5px',
                          fontWeight: i === breadcrumbs.length - 1 ? '600' : '400',
                          opacity: i === breadcrumbs.length - 1 ? 1 : 0.65,
                          background: i === breadcrumbs.length - 1 ? 'rgba(255,255,255,0.08)' : 'transparent',
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
                  <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5, fontFamily: uiFont, fontSize: '13px' }}>Loading…</div>
                ) : (
                  <>
                    <div style={{
                      maxHeight: '260px', overflowY: 'auto', border: '1px solid var(--terminal-border)',
                      borderRadius: '10px', marginBottom: '12px', overflow: 'hidden',
                    }}>
                      {files.length === 0 && !loading ? (
                        <div style={{ textAlign: 'center', padding: '24px', opacity: 0.45, fontFamily: uiFont, fontSize: '13px' }}>
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
                              padding: '10px 16px', cursor: 'pointer',
                              borderBottom: i < files.length - 1 ? '1px solid var(--terminal-border)' : 'none',
                              background: i === selectedIdx ? 'var(--terminal-accent)' : 'transparent',
                              color: i === selectedIdx ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              fontSize: '13px', fontFamily: uiFont, transition: 'background 0.1s',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '15px' }}>{isFolder ? '📁' : '📄'}</span>
                              <span style={{ fontWeight: isFolder ? '500' : '400' }}>{file.name}</span>
                            </span>
                            <span style={{ fontSize: '11px', opacity: 0.55, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ''}
                              {isFolder && <span style={{ opacity: 0.6 }}>›</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {showNewFolder && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input
                          value={newFolderName}
                          onChange={e => setNewFolderName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                          placeholder="Folder name…"
                          autoFocus
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: '8px',
                            border: '1px solid var(--terminal-border)', background: 'var(--terminal-surface)',
                            color: 'var(--terminal-text)', fontSize: '13px', fontFamily: uiFont, outline: 'none',
                          }}
                        />
                        <button onClick={createFolder} style={{
                          padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          background: 'var(--terminal-accent)', color: 'var(--terminal-bg)',
                          fontSize: '12px', fontWeight: '600', fontFamily: uiFont,
                        }}>Create</button>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <ModalButton label="📤 Upload here" focused={false} onClick={uploadFile} />
                      <ModalButton label="📁 New folder" focused={false} onClick={() => { setShowNewFolder(!showNewFolder); setNewFolderName(''); }} />
                      <ModalButton label="🔄 Refresh" focused={false} onClick={() => googleToken && loadFiles(googleToken, currentFolderId)} />
                    </div>
                  </>
                )}
              </>
            )}

            {tab === 'sync' && (
              <div style={{ fontFamily: uiFont }}>
                <div style={{
                  padding: '14px 16px', marginBottom: '14px', borderRadius: '10px',
                  border: '1px solid var(--terminal-border)', background: 'var(--terminal-surface)',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', opacity: 0.45, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Sync Target on Drive
                  </div>
                  {syncTargetFolder ? (
                    <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📁</span>
                      <span style={{ fontWeight: '500' }}>{syncTargetFolder.name}</span>
                      <span onClick={() => setSyncTargetFolder(null)} style={{ cursor: 'pointer', fontSize: '11px', opacity: 0.5, marginLeft: 'auto' }}>✕ Clear</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', opacity: 0.5 }}>
                      No target set — navigate to a folder in Browse tab, then set it here
                    </div>
                  )}
                  <button
                    onClick={selectSyncTarget}
                    style={{
                      marginTop: '10px', padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--terminal-border)',
                      background: 'transparent', color: 'var(--terminal-text)', cursor: 'pointer',
                      fontSize: '12px', fontFamily: uiFont, fontWeight: '500',
                    }}
                  >
                    📌 Set current folder as target ({breadcrumbs[breadcrumbs.length - 1]?.name || 'root'})
                  </button>
                </div>

                <div style={{ fontSize: '10px', fontWeight: '600', opacity: 0.45, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Local Folders
                </div>
                <div style={{
                  maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--terminal-border)',
                  borderRadius: '10px', marginBottom: '14px', overflow: 'hidden',
                }}>
                  {(!localFolders || localFolders.length === 0) ? (
                    <div style={{ padding: '20px', textAlign: 'center', opacity: 0.45, fontSize: '13px' }}>
                      No local folders found. Create folders in the File Browser first.
                    </div>
                  ) : localFolders.map((folder, i) => (
                    <div
                      key={folder.name}
                      style={{
                        padding: '10px 16px', cursor: syncTargetFolder ? 'pointer' : 'default',
                        borderBottom: i < localFolders.length - 1 ? '1px solid var(--terminal-border)' : 'none',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontSize: '13px', opacity: syncTargetFolder ? 1 : 0.6,
                        transition: 'background 0.1s',
                      }}
                      onClick={() => {
                        if (syncTargetFolder && onSyncFolder) {
                          onSyncFolder(folder.path, syncTargetFolder.id, syncTargetFolder.name);
                        }
                      }}
                      onMouseOver={e => { if (syncTargetFolder) e.currentTarget.style.background = 'var(--terminal-surface)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📂</span>
                        <span>{folder.name}</span>
                      </span>
                      {syncTargetFolder && (
                        <span style={{ fontSize: '11px', opacity: 0.6 }}>
                          → Sync to Drive
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {!syncTargetFolder && (
                  <div style={{ fontSize: '12px', opacity: 0.5, textAlign: 'center', padding: '8px' }}>
                    Set a Drive target folder first, then click a local folder to sync it.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
}
