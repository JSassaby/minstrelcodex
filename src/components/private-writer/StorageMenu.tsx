import { useState, useEffect, useRef } from 'react';

interface StorageMenuProps {
  visible: boolean;
  googleConnected: boolean;
  appleConnected: boolean;
  lastSyncTime: string | null;
  onSyncGoogleDrive: () => void;
  onSyncICloud: () => void;
  onConnectGoogle: () => void;
  onConnectApple: () => void;
  onDisconnectGoogle: () => void;
  onOpenDriveFiles: () => void;
  onClose: () => void;
}

export default function StorageMenu({
  visible, googleConnected, appleConnected, lastSyncTime,
  onSyncGoogleDrive, onSyncICloud, onConnectGoogle, onConnectApple,
  onDisconnectGoogle, onOpenDriveFiles, onClose,
}: StorageMenuProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Build menu items dynamically
  const items: { label: string; action: () => void; shortcut?: string; disabled?: boolean; separator?: boolean }[] = [];

  // Google Drive section
  if (googleConnected) {
    items.push({ label: '☁ Sync to Google Drive', action: onSyncGoogleDrive, shortcut: '' });
    items.push({ label: '📂 Browse Drive Files', action: onOpenDriveFiles });
    items.push({ label: '🔌 Disconnect Google', action: onDisconnectGoogle });
  } else {
    items.push({ label: '🔑 Connect Google Drive', action: onConnectGoogle });
  }

  items.push({ label: '', action: () => {}, separator: true });

  // iCloud section
  if (appleConnected) {
    items.push({ label: '🍎 Sync to iCloud', action: onSyncICloud });
  } else {
    items.push({ label: '🍎 Connect iCloud', action: onConnectApple });
  }

  items.push({ label: '', action: () => {}, separator: true });

  // Info row
  if (lastSyncTime) {
    items.push({ label: `Last sync: ${lastSyncTime}`, action: () => {}, disabled: true });
  }

  const actionItems = items.filter(i => !i.separator && !i.disabled);

  useEffect(() => {
    if (!visible) return;
    setSelectedIdx(0);

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); e.preventDefault(); return; }
      if (e.key === 'ArrowDown') {
        setSelectedIdx(prev => (prev + 1) % actionItems.length);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setSelectedIdx(prev => (prev - 1 + actionItems.length) % actionItems.length);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        actionItems[selectedIdx]?.action();
        onClose();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [visible, selectedIdx, actionItems.length]);

  // Click outside to close
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible]);

  if (!visible) return null;

  let actionIdx = 0;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--terminal-bg)',
        border: '2px solid var(--terminal-text)',
        minWidth: '320px',
        zIndex: 600,
        boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
        fontFamily: "'Courier Prime', 'Courier New', monospace",
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--terminal-text)',
        fontSize: '11px',
        opacity: 0.6,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>STORAGE</span>
        <span>
          {googleConnected ? '☁ Google ✓' : '☁ Google ✕'}
          {'  '}
          {appleConnected ? '🍎 iCloud ✓' : '🍎 iCloud ✕'}
        </span>
      </div>

      {items.map((item, j) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${j}`}
              style={{ height: '1px', background: 'var(--terminal-text)', opacity: 0.2, margin: '4px 8px' }}
            />
          );
        }
        if (item.disabled) {
          return (
            <div key={`info-${j}`} style={{ padding: '6px 16px', fontSize: '11px', opacity: 0.5 }}>
              {item.label}
            </div>
          );
        }
        const thisIdx = actionIdx++;
        const isActive = thisIdx === selectedIdx;
        return (
          <div
            key={item.label}
            onMouseEnter={() => setSelectedIdx(thisIdx)}
            onClick={(e) => { e.stopPropagation(); item.action(); onClose(); }}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              background: isActive ? 'var(--terminal-text)' : 'transparent',
              color: isActive ? 'var(--terminal-bg)' : 'var(--terminal-text)',
              display: 'flex',
              justifyContent: 'space-between',
              transition: 'background 0.05s, color 0.05s',
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span style={{ opacity: 0.5, fontSize: '13px' }}>{item.shortcut}</span>}
          </div>
        );
      })}
    </div>
  );
}
