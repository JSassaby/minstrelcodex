import { useState, useEffect, useRef } from 'react';

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

interface StorageMenuProps {
  visible: boolean;
  googleConnected: boolean;
  lastSyncTime: string | null;
  onSyncGoogleDrive: () => void;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
  onOpenDriveFiles: () => void;
  onClose: () => void;
}

export default function StorageMenu({
  visible, googleConnected, lastSyncTime,
  onSyncGoogleDrive, onConnectGoogle,
  onDisconnectGoogle, onOpenDriveFiles, onClose,
}: StorageMenuProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const items: { label: string; sublabel?: string; action: () => void; shortcut?: string; disabled?: boolean; separator?: boolean; icon?: string; danger?: boolean }[] = [];

  if (googleConnected) {
    items.push({ label: 'Sync to Google Drive', icon: '☁', action: onSyncGoogleDrive });
    items.push({ label: 'Browse Drive Files', icon: '📂', action: onOpenDriveFiles });
    items.push({ label: 'Disconnect Google', icon: '🔌', action: onDisconnectGoogle, danger: true });
  } else {
    items.push({ label: 'Connect Google Drive', icon: '🔑', sublabel: 'Not linked', action: onConnectGoogle });
  }


  if (lastSyncTime) {
    items.push({ label: '', action: () => {}, separator: true });
    items.push({ label: `Last sync: ${lastSyncTime}`, action: () => {}, disabled: true });
  }

  const actionItems = items.filter(i => !i.separator && !i.disabled);

  useEffect(() => {
    if (!visible) return;
    setSelectedIdx(0);
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); e.preventDefault(); return; }
      if (e.key === 'ArrowDown') { setSelectedIdx(prev => (prev + 1) % actionItems.length); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { setSelectedIdx(prev => (prev - 1 + actionItems.length) % actionItems.length); e.preventDefault(); }
      else if (e.key === 'Enter') { actionItems[selectedIdx]?.action(); onClose(); e.preventDefault(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [visible, selectedIdx, actionItems.length]);

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
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 595 }}
      />
      <div
        ref={ref}
        style={{
          position: 'fixed',
          top: '46px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--terminal-bg)',
          border: '1px solid var(--terminal-border)',
          minWidth: '300px',
          zIndex: 600,
          fontFamily: uiFont,
          overflow: 'hidden',
          padding: '6px',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '8px 12px 6px',
          fontSize: '10px',
          fontWeight: '600',
          opacity: 0.45,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: uiFont,
        }}>
          <span>Storage</span>
          <span style={{ color: googleConnected ? 'var(--terminal-accent)' : '#e05c5c' }}>
            ☁ {googleConnected ? '✓' : '✕'}
          </span>
        </div>

        {items.map((item, j) => {
          if (item.separator) {
            return <div key={`sep-${j}`} style={{ height: '1px', background: 'var(--terminal-border)', margin: '4px 6px' }} />;
          }
          if (item.disabled) {
            return (
              <div key={`info-${j}`} style={{ padding: '6px 12px', fontSize: '11px', opacity: 0.4, fontFamily: uiFont }}>
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
                padding: '8px 12px',
                cursor: 'pointer',
                background: isActive ? 'var(--terminal-accent)' : 'transparent',
                color: isActive ? 'var(--terminal-bg)' : item.danger ? '#e05c5c' : 'var(--terminal-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'background 0.1s, color 0.1s',
                fontSize: '13px',
                fontWeight: isActive ? '500' : '400',
              }}
            >
              {item.icon && <span style={{ fontSize: '14px', width: '18px', textAlign: 'center' }}>{item.icon}</span>}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.sublabel && !isActive && (
                <span style={{ fontSize: '11px', opacity: 0.45, fontWeight: '400' }}>{item.sublabel}</span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
