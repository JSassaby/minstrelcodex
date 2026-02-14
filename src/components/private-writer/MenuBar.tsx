import { useState, useRef, useEffect, useCallback } from 'react';
import { t } from '@/lib/languages';
import type { ModalType } from '@/lib/types';

interface MenuBarProps {
  language: string;
  visible: boolean;
  menuIndex: number;
  submenuOpen: boolean;
  submenuIndex: number;
  wifiOn: boolean;
  bluetoothOn: boolean;
  onAction: (action: string) => void;
  onMenuStateChange?: (open: boolean, menuIdx: number, subOpen: boolean, subIdx: number) => void;
}

const MENUS = ['file', 'edit', 'view', 'network', 'storage', 'power', 'language'] as const;

function getSubmenuItems(menu: string, language: string, wifiOn: boolean, bluetoothOn: boolean) {
  switch (menu) {
    case 'file':
      return [
        { action: 'new', label: t(language, 'file.new'), shortcut: 'Ctrl+N' },
        { action: 'open', label: t(language, 'file.open'), shortcut: 'Ctrl+O' },
        { action: 'recent', label: t(language, 'file.recent') },
        { action: 'save', label: t(language, 'file.save'), shortcut: 'Ctrl+S' },
        { action: 'saveas', label: t(language, 'file.saveas') },
      ];
    case 'edit':
      return [
        { action: 'undo', label: t(language, 'edit.undo'), shortcut: 'Ctrl+Z' },
        { action: 'redo', label: t(language, 'edit.redo'), shortcut: 'Ctrl+R' },
        { action: 'copy', label: t(language, 'edit.copy'), shortcut: 'Ctrl+C' },
        { action: 'paste', label: t(language, 'edit.paste'), shortcut: 'Ctrl+V' },
        { action: 'selectfont', label: t(language, 'edit.selectfont') },
        { action: 'typingchallenge', label: 'Typing Challenge' },
        { action: 'togglelivestats', label: 'Toggle Live Stats', shortcut: 'Ctrl+Shift+S' },
      ];
    case 'view':
      return [
        { action: 'increasetext', label: t(language, 'view.increase'), shortcut: 'Ctrl++' },
        { action: 'decreasetext', label: t(language, 'view.decrease'), shortcut: 'Ctrl+-' },
        { action: 'customizecolors', label: t(language, 'view.customise') },
        { action: 'togglesidebar', label: 'File Browser', shortcut: 'Ctrl+Shift+B' },
        { action: 'fullscreen', label: 'Toggle Fullscreen', shortcut: 'F11' },
      ];
    case 'network':
      return [
        { action: 'wifi', label: `${t(language, 'network.wifi')} ${wifiOn ? t(language, 'network.on') : t(language, 'network.off')}` },
        { action: 'bluetooth', label: `${t(language, 'network.bluetooth')} ${bluetoothOn ? t(language, 'network.on') : t(language, 'network.off')}` },
      ];
    case 'storage':
      return [
        { action: 'local', label: t(language, 'storage.local') },
        { action: 'usb', label: t(language, 'storage.usb') },
        { action: 'dropbox', label: t(language, 'storage.dropbox') },
        { action: 'gdrive', label: t(language, 'storage.gdrive') },
        { action: 'icloud', label: t(language, 'storage.icloud') },
      ];
    case 'power':
      return [
        { action: 'pinsetup', label: '🔒 PIN Lock Setup' },
        { action: 'update', label: t(language, 'power.update') },
        { action: 'shutdown', label: t(language, 'power.shutdown') },
      ];
    case 'language':
      return [
        { action: 'lang-en-GB', label: t(language, 'language.englishGB') },
        { action: 'lang-en-US', label: t(language, 'language.englishUS') },
        { action: 'lang-af', label: t(language, 'language.afrikaans') },
      ];
    default:
      return [];
  }
}

export default function MenuBar({
  language, visible, menuIndex, submenuOpen, submenuIndex,
  wifiOn, bluetoothOn, onAction, onMenuStateChange,
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
      }}
    >
      <div style={{ display: 'flex', gap: '4px' }}>
        {MENUS.map((menu, i) => {
          const isFocused = i === activeMenuIdx;
          const items = getSubmenuItems(menu, language, wifiOn, bluetoothOn);

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
                  // Clicking same menu closes it
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
                          borderBottom: j < items.length - 1 ? '1px solid rgba(var(--terminal-text-rgb, 51,255,51), 0.2)' : 'none',
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
    </div>
  );
}

export { MENUS, getSubmenuItems };
