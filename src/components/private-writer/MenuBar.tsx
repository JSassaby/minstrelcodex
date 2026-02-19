import { useState, useRef, useEffect } from 'react';
import {
  FilePlus, BookOpen, FolderOpen, Clock, Save, FileOutput,
  Printer, PanelLeftOpen, Undo2, Redo2, Copy, ClipboardPaste,
  Wifi, WifiOff, Bluetooth, Cloud, Settings, Camera, FileText
} from 'lucide-react';
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

// Accent colours per icon category — use CSS vars so they adapt per theme
const ICON_ACCENT = {
  green:  'var(--terminal-accent)',
  amber:  '#f5c542',
  blue:   '#5b9cf6',
  red:    '#e05c5c',
  muted:  'var(--terminal-muted)',
};

interface MenuItem {
  action: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
}

function getSubmenuItems(menu: string, language: string, wifiOn: boolean, bluetoothOn: boolean): MenuItem[] {
  switch (menu) {
    case 'file':
      return [
        { action: 'new',           label: t(language, 'file.new'),             shortcut: 'Ctrl+N',       icon: <FilePlus size={13} color={ICON_ACCENT.green} strokeWidth={1.8} /> },
        { action: 'newnovel',      label: 'New Novel Project',                  shortcut: '',             icon: <BookOpen size={13} color={ICON_ACCENT.amber} strokeWidth={1.8} /> },
        { action: 'separator',     label: '' },
        { action: 'open',          label: t(language, 'file.open'),             shortcut: 'Ctrl+O',       icon: <FolderOpen size={13} color={ICON_ACCENT.amber} strokeWidth={1.8} /> },
        { action: 'recent',        label: t(language, 'file.recent'),           shortcut: '',             icon: <Clock size={13} color={ICON_ACCENT.muted} strokeWidth={1.8} /> },
        { action: 'separator',     label: '' },
        { action: 'save',          label: t(language, 'file.save'),             shortcut: 'Ctrl+S',       icon: <Save size={13} color={ICON_ACCENT.green} strokeWidth={1.8} /> },
        { action: 'saveas',        label: t(language, 'file.saveas'),           shortcut: '',             icon: <Save size={13} color={ICON_ACCENT.muted} strokeWidth={1.8} /> },
        { action: 'saveversion',   label: 'Save Version…',                      shortcut: '',             icon: <FileText size={13} color={ICON_ACCENT.blue} strokeWidth={1.8} /> },
        { action: 'savesnapshot',  label: 'Save Snapshot',                      shortcut: 'Ctrl+Shift+V', icon: <Camera size={13} color={ICON_ACCENT.blue} strokeWidth={1.8} /> },
        { action: 'separator',     label: '' },
        { action: 'print',         label: 'Print Current Page',                 shortcut: 'Ctrl+P',       icon: <Printer size={13} color={ICON_ACCENT.muted} strokeWidth={1.8} /> },
        { action: 'export',        label: 'Export / Combine…',                  shortcut: '',             icon: <FileOutput size={13} color={ICON_ACCENT.green} strokeWidth={1.8} /> },
        { action: 'separator',     label: '' },
        { action: 'togglesidebar', label: 'File Browser',                       shortcut: 'Ctrl+Shift+B', icon: <PanelLeftOpen size={13} color={ICON_ACCENT.muted} strokeWidth={1.8} /> },
      ];
    case 'edit':
      return [
        { action: 'undo',  label: t(language, 'edit.undo'),  shortcut: 'Ctrl+Z', icon: <Undo2 size={13} color={ICON_ACCENT.muted} strokeWidth={1.8} /> },
        { action: 'redo',  label: t(language, 'edit.redo'),  shortcut: 'Ctrl+R', icon: <Redo2 size={13} color={ICON_ACCENT.muted} strokeWidth={1.8} /> },
        { action: 'separator', label: '' },
        { action: 'copy',  label: t(language, 'edit.copy'),  shortcut: 'Ctrl+C', icon: <Copy size={13} color={ICON_ACCENT.blue} strokeWidth={1.8} /> },
        { action: 'paste', label: t(language, 'edit.paste'), shortcut: 'Ctrl+V', icon: <ClipboardPaste size={13} color={ICON_ACCENT.blue} strokeWidth={1.8} /> },
      ];
    case 'network':
      return [
        { action: 'wifi',      label: `Wi-Fi — ${wifiOn ? 'On' : 'Off'}`,           icon: wifiOn ? <Wifi size={13} color={ICON_ACCENT.green} strokeWidth={1.8} /> : <WifiOff size={13} color={ICON_ACCENT.red} strokeWidth={1.8} /> },
        { action: 'bluetooth', label: `Bluetooth — ${bluetoothOn ? 'On' : 'Off'}`,  icon: <Bluetooth size={13} color={bluetoothOn ? ICON_ACCENT.blue : ICON_ACCENT.red} strokeWidth={1.8} /> },
      ];
    case 'storage':
      return [
        { action: 'open-storage-menu', label: 'Open Storage Menu…', icon: <Cloud size={13} color={ICON_ACCENT.blue} strokeWidth={1.8} /> },
      ];
    case 'settings':
      return [
        { action: 'opensettings', label: 'Open Settings Panel…', icon: <Settings size={13} color={ICON_ACCENT.muted} strokeWidth={1.8} /> },
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

  const activeMenuIdx = mouseActive ? hoverMenuIdx : (visible ? menuIndex : null);
  const activeSubOpen = mouseActive ? (hoverMenuIdx !== null) : (visible && submenuOpen);
  const activeSubIdx  = mouseActive ? (hoverSubIdx ?? 0) : submenuIndex;

  const shortName = filename ? filename.split('/').pop() || filename : t(language, 'status.untitled');

  const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

  return (
    <div
      ref={barRef}
      style={{
        backgroundColor: 'var(--terminal-bg)',
        borderBottom: '1px solid var(--terminal-border)',
        padding: '4px 14px',
        fontSize: '12px',
        fontFamily: uiFont,
        color: 'var(--terminal-text)',
        position: 'relative',
        zIndex: 200,
        userSelect: 'none',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        letterSpacing: '0.01em',
      }}
    >
      {/* Left — menu items */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {MENUS.map((menu, i) => {
          const isFocused = i === activeMenuIdx;
          const items = getSubmenuItems(menu, language, wifiOn, bluetoothOn);

          return (
            <div
              key={menu}
              style={{
                padding: '4px 9px',
                position: 'relative',
                cursor: 'pointer',
                borderRadius: '4px',
                background: isFocused ? 'var(--terminal-surface)' : 'transparent',
                color: isFocused ? 'var(--terminal-accent)' : 'var(--terminal-text)',
                fontWeight: isFocused ? '500' : '400',
                opacity: isFocused ? 1 : 0.7,
                transition: 'background 0.12s, color 0.12s, opacity 0.12s',
                borderLeft: isFocused ? '2px solid var(--terminal-accent)' : '2px solid transparent',
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
                    top: 'calc(100% + 4px)',
                    left: 0,
                    background: 'var(--terminal-bg)',
                    border: '1px solid var(--terminal-border)',
                    minWidth: '270px',
                    zIndex: 300,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                  }}
                >
                  {items.map((item, j) => {
                    if (item.action === 'separator') {
                      return (
                        <div
                          key={`sep-${j}`}
                          style={{ height: '1px', background: 'var(--terminal-border)', opacity: 0.6, margin: '3px 10px' }}
                        />
                      );
                    }
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
                          padding: '7px 14px',
                          cursor: 'pointer',
                          background: isActive ? 'var(--terminal-surface)' : 'transparent',
                          color: 'var(--terminal-text)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          justifyContent: 'space-between',
                          transition: 'background 0.08s',
                          borderLeft: isActive ? '2px solid var(--terminal-accent)' : '2px solid transparent',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '9px', flex: 1 }}>
                          {item.icon && (
                            <span style={{ display: 'flex', alignItems: 'center', width: '16px', justifyContent: 'center', flexShrink: 0 }}>
                              {item.icon}
                            </span>
                          )}
                          <span style={{ opacity: isActive ? 1 : 0.85, fontSize: '12px', fontFamily: uiFont }}>
                            {item.label}
                          </span>
                        </span>
                        {item.shortcut && (
                          <span style={{
                            opacity: 0.35,
                            fontSize: '10px',
                            fontFamily: uiFont,
                            letterSpacing: '0.03em',
                            flexShrink: 0,
                          }}>
                            {item.shortcut}
                          </span>
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

      {/* Centre — filename */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '12px',
          fontFamily: uiFont,
          fontWeight: '500',
          opacity: 0.55,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '320px',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          letterSpacing: '0.02em',
        }}
        title={shortName}
      >
        <FileText size={11} strokeWidth={1.8} style={{ flexShrink: 0, opacity: 0.7 }} />
        {shortName}
      </div>
    </div>
  );
}

export { MENUS, getSubmenuItems };
