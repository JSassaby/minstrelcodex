import { useState, useRef, useEffect } from 'react';
import { t } from '@/lib/languages';

interface MenuBarProps {
  language: string;
  visible: boolean;
  menuIndex: number;
  submenuOpen: boolean;
  submenuIndex: number;
  wifiOn: boolean;
  bluetoothOn: boolean;
  filename: string;
  onAction: (action: string) => void;
  onMenuStateChange?: (open: boolean, menuIdx: number, subOpen: boolean, subIdx: number) => void;
}

const MENUS = ['file', 'edit', 'network', 'storage', 'settings'] as const;

function getSubmenuItems(menu: string, language: string, wifiOn: boolean, bluetoothOn: boolean) {
  switch (menu) {
    case 'file':
      return [
        { action: 'new', label: t(language, 'file.new'), shortcut: 'Ctrl+N' },
        { action: 'newnovel', label: '📖 New Novel Project' },
        { action: 'separator', label: '' },
        { action: 'open', label: t(language, 'file.open'), shortcut: 'Ctrl+O' },
        { action: 'recent', label: t(language, 'file.recent') },
        { action: 'separator', label: '' },
        { action: 'save', label: t(language, 'file.save'), shortcut: 'Ctrl+S' },
        { action: 'saveas', label: t(language, 'file.saveas') },
        { action: 'saveversion', label: '📋 Save Version...' },
        { action: 'savesnapshot', label: '📸 Save Snapshot', shortcut: 'Ctrl+Shift+V' },
        { action: 'separator', label: '' },
        { action: 'togglesidebar', label: 'File Browser', shortcut: 'Ctrl+Shift+B' },
      ];
    case 'edit':
      return [
        { action: 'undo', label: t(language, 'edit.undo'), shortcut: 'Ctrl+Z' },
        { action: 'redo', label: t(language, 'edit.redo'), shortcut: 'Ctrl+R' },
        { action: 'separator', label: '' },
        { action: 'copy', label: t(language, 'edit.copy'), shortcut: 'Ctrl+C' },
        { action: 'paste', label: t(language, 'edit.paste'), shortcut: 'Ctrl+V' },
      ];
    case 'network':
      return [
        { action: 'wifi', label: `${t(language, 'network.wifi')} ${wifiOn ? t(language, 'network.on') : t(language, 'network.off')}` },
        { action: 'bluetooth', label: `${t(language, 'network.bluetooth')} ${bluetoothOn ? t(language, 'network.on') : t(language, 'network.off')}` },
      ];
    case 'storage':
      return [
        { action: 'open-storage-menu', label: '☁ Open Storage Menu...', shortcut: '' },
      ];
    case 'settings':
      return [
        { action: 'opensettings', label: '⚙ Open Settings Panel...', shortcut: '' },
      ];
    default:
      return [];
  }
}

export default function MenuBar({
  language, visible, menuIndex, submenuOpen, submenuIndex,
  wifiOn, bluetoothOn, filename, onAction, onMenuStateChange,
}: MenuBarProps) {
  const [hoverMenuIdx, setHoverMenuIdx] = useState<number | null>(null);
  const [hoverSubIdx, setHoverSubIdx] = useState<number | null>(null);
  const [mouseActive, setMouseActive] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!mouseActive) return;
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setHoverMenuIdx(null);
        setHoverSubIdx(null);
        setMouseActive(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mouseActive]);

  // Determine which state to show — mouse takes priority when active
  const activeMenuIdx = mouseActive ? hoverMenuIdx : (visible ? menuIndex : null);
  const activeSubOpen = mouseActive ? (hoverMenuIdx !== null) : (visible && submenuOpen);
  const activeSubIdx = mouseActive ? (hoverSubIdx ?? 0) : submenuIndex;

  const shortName = filename ? filename.split('/').pop() || filename : t(language, 'status.untitled');

  return (
    <div
      ref={barRef}
      style={{
        backgroundColor: 'var(--terminal-bg)',
        borderBottom: '1px solid var(--terminal-text)',
        padding: '6px 16px',
        fontSize: '15px',
        color: 'var(--terminal-text)',
        position: 'relative',
        zIndex: 200,
        userSelect: 'none',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', gap: '4px' }}>
        {MENUS.map((menu, i) => {
          const isFocused = i === activeMenuIdx;
          const items = getSubmenuItems(menu, language, wifiOn, bluetoothOn);
          // Filter out separators for keyboard navigation indexing
          const actionItems = items.filter(item => item.action !== 'separator');

          return (
            <div
              key={menu}
              style={{
                padding: '4px 10px',
                position: 'relative',
                cursor: 'pointer',
                background: isFocused ? 'var(--terminal-text)' : 'transparent',
                color: isFocused ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                textShadow: isFocused ? 'none' : '0 0 5px var(--terminal-glow)',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={() => {
                if (mouseActive || hoverMenuIdx !== null) {
                  setHoverMenuIdx(i);
                  setHoverSubIdx(null);
                  setMouseActive(true);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (mouseActive && hoverMenuIdx === i) {
                  setHoverMenuIdx(null);
                  setMouseActive(false);
                } else {
                  setHoverMenuIdx(i);
                  setHoverSubIdx(null);
                  setMouseActive(true);
                }
              }}
            >
              {t(language, `menu.${menu}`)}

              {/* Dropdown */}
              {isFocused && activeSubOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    background: 'var(--terminal-bg)',
                    border: '1px solid var(--terminal-text)',
                    minWidth: '260px',
                    zIndex: 300,
                    marginTop: '2px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}
                >
                  {items.map((item, j) => {
                    if (item.action === 'separator') {
                      return (
                        <div
                          key={`sep-${j}`}
                          style={{
                            height: '1px',
                            background: 'var(--terminal-text)',
                            opacity: 0.2,
                            margin: '4px 8px',
                          }}
                        />
                      );
                    }
                    // For hover tracking, use the visual index (j)
                    const isActive = j === activeSubIdx;
                    return (
                      <div
                        key={item.action}
                        onMouseEnter={() => setHoverSubIdx(j)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction(item.action);
                          setHoverMenuIdx(null);
                          setMouseActive(false);
                        }}
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
                        {item.shortcut && (
                          <span style={{ opacity: 0.5, marginLeft: '20px', fontSize: '13px' }}>{item.shortcut}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filename display - top right */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '15px',
          fontFamily: "'Courier Prime', 'Courier New', monospace",
          textShadow: '0 0 5px var(--terminal-glow)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '400px',
          pointerEvents: 'none',
        }}
        title={shortName}
      >
        📄 {shortName}
      </div>
    </div>
  );
}

export { MENUS, getSubmenuItems };
