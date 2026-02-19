import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import ModalShell, { ModalButton } from './ModalShell';

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

interface GoogleDriveModalProps {
  visible: boolean;
  onClose: () => void;
  onLoadContent: (content: string, filename: string) => void;
  currentContent: string;
  currentFilename: string;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive`;

export default function GoogleDriveModal({
  visible, onClose, onLoadContent, currentContent, currentFilename,
}: GoogleDriveModalProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [status, setStatus] = useState('');
  const [view, setView] = useState<'list' | 'uploading'>('list');

  useEffect(() => { if (visible) checkAuth(); }, [visible]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.provider_token) {
      setGoogleToken(session.provider_token);
      setAuthenticated(true);
      loadFiles(session.provider_token);
    } else {
      setAuthenticated(false);
      setGoogleToken(null);
    }
  };

  const signIn = async () => {
    setLoading(true); setError('');
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
      extraParams: { scope: 'https://www.googleapis.com/auth/drive.file', access_type: 'offline', prompt: 'consent' },
    });
    if (error) { setError(error.message || 'Sign-in failed'); setLoading(false); }
  };

  const loadFiles = async (token: string) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', googleToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to list files');
      setFiles(data.files || []); setSelectedIdx(0);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
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
    setView('uploading'); setLoading(true);
    const name = currentFilename || 'Untitled.html';
    setStatus(`Uploading ${name}…`);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload', googleToken, fileName: name, content: currentContent, mimeType: 'text/html' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setStatus(`✓ Uploaded ${name}`);
      await loadFiles(googleToken); setView('list');
    } catch (e: any) { setError(e.message); setView('list'); }
    setLoading(false);
  };

  useEffect(() => {
    if (!visible || !authenticated) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { setSelectedIdx(prev => Math.min(prev + 1, files.length - 1)); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { setSelectedIdx(prev => Math.max(prev - 1, 0)); e.preventDefault(); }
      else if (e.key === 'Enter') { if (files[selectedIdx]) downloadFile(files[selectedIdx]); e.preventDefault(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, authenticated, files, selectedIdx, googleToken]);

  if (!visible) return null;

  return (
    <ModalShell visible={visible} title="☁ Google Drive" onClose={onClose}>
      <div style={{ minHeight: '180px' }}>
        {error && (
          <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '9px', border: '1px solid rgba(224,92,92,0.4)', background: 'rgba(224,92,92,0.08)', fontSize: '13px', fontFamily: uiFont, color: '#e05c5c' }}>
            ⚠ {error}
          </div>
        )}
        {status && (
          <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '9px', border: '1px solid var(--terminal-border)', background: 'var(--terminal-surface)', fontSize: '13px', fontFamily: uiFont, opacity: 0.8 }}>
            {status}
          </div>
        )}

        {!authenticated ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ marginBottom: '6px', fontSize: '14px', fontFamily: uiFont }}>Sign in with Google to access your Drive</p>
            <p style={{ marginBottom: '24px', fontSize: '12px', opacity: 0.5, fontFamily: uiFont }}>Connect to sync files across devices</p>
            <ModalButton label={loading ? 'Signing in…' : '🔑 Sign in with Google'} focused onClick={signIn} />
          </div>
        ) : (
          <>
            {loading && files.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5, fontFamily: uiFont, fontSize: '13px' }}>Loading files…</div>
            ) : (
              <>
                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--terminal-border)', borderRadius: '10px', marginBottom: '16px', overflow: 'hidden' }}>
                  {files.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', opacity: 0.45, fontFamily: uiFont, fontSize: '13px' }}>No text files in Google Drive</div>
                  ) : files.map((file, i) => (
                    <div
                      key={file.id}
                      onClick={() => { setSelectedIdx(i); downloadFile(file); }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        borderBottom: i < files.length - 1 ? '1px solid var(--terminal-border)' : 'none',
                        background: i === selectedIdx ? 'var(--terminal-accent)' : 'transparent',
                        color: i === selectedIdx ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontSize: '13px', fontFamily: uiFont,
                        transition: 'background 0.1s',
                      }}
                    >
                      <span>📄 {file.name}</span>
                      <span style={{ fontSize: '11px', opacity: 0.55 }}>
                        {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <ModalButton label="📤 Upload current" focused={false} onClick={uploadFile} />
                  <ModalButton label="🔄 Refresh" focused={false} onClick={() => googleToken && loadFiles(googleToken)} />
                  <ModalButton label="Close" focused={false} onClick={onClose} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
}
