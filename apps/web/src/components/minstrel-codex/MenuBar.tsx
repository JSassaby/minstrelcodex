import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FilePlus, BookOpen, FolderOpen, Clock, Save, FileOutput,
  Printer, PanelLeftOpen, Undo2, Redo2, Copy, ClipboardPaste,
  Wifi, Cloud, Settings, Camera, FileText, Music,
  HelpCircle, ChevronDown, LayoutDashboard, User, Upload
} from 'lucide-react';
import minstrelLogo from '@/assets/minstrel-logo.svg';
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

const MENUS = ['file', 'edit', 'network', 'music', 'settings'] as const;

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

function getSubmenuItems(menu: string, language: string): MenuItem[] {
  switch (menu) {
    case 'file':
      return [
        { action: 'new',           label: t(language, 'file.new'),             shortcut: 'Ctrl+N',       icon: <FilePlus size={14} color={ICON_ACCENT.green} strokeWidth={1.6} /> },
        { action: 'newnovel',      label: 'New Novel Project',                  shortcut: '',             icon: <BookOpen size={14} color={ICON_ACCENT.amber} strokeWidth={1.6} /> },
        { action: 'separator',     label: '' },
        { action: 'open',          label: t(language, 'file.open'),             shortcut: 'Ctrl+O',       icon: <FolderOpen size={14} color={ICON_ACCENT.amber} strokeWidth={1.6} /> },
        { action: 'recent',        label: t(language, 'file.recent'),           shortcut: '',             icon: <Clock size={14} color={ICON_ACCENT.muted} strokeWidth={1.6} /> },
        { action: 'import',        label: 'Import…',                            shortcut: '',             icon: <Upload size={14} color={ICON_ACCENT.green} strokeWidth={1.6} /> },
        { action: 'separator',     label: '' },
        { action: 'save',          label: t(language, 'file.save'),             shortcut: 'Ctrl+S',       icon: <Save size={14} color={ICON_ACCENT.green} strokeWidth={1.6} /> },
        { action: 'saveas',        label: t(language, 'file.saveas'),           shortcut: '',             icon: <Save size={14} color={ICON_ACCENT.muted} strokeWidth={1.6} /> },
        { action: 'saveversion',   label: 'Save Version Checkpoint',            shortcut: '',             icon: <FileText size={14} color={ICON_ACCENT.blue} strokeWidth={1.6} /> },
        { action: 'savesnapshot',  label: 'Quick Snapshot',                     shortcut: 'Ctrl+Shift+V', icon: <Camera size={14} color={ICON_ACCENT.blue} strokeWidth={1.6} /> },
        { action: 'separator',     label: '' },
        { action: 'print',         label: 'Print Current Page',                 shortcut: 'Ctrl+P',       icon: <Printer size={14} color={ICON_ACCENT.muted} strokeWidth={1.6} /> },
        { action: 'export',        label: 'Export / Combine…',                  shortcut: '',             icon: <FileOutput size={14} color={ICON_ACCENT.green} strokeWidth={1.6} /> },
        { action: 'togglesidebar', label: 'File Browser',                       shortcut: 'Ctrl+Shift+B', icon: <PanelLeftOpen size={14} color={ICON_ACCENT.muted} strokeWidth={1.6} /> },
      ];
    case 'edit':
      return [
        { action: 'undo',  label: t(language, 'edit.undo'),  shortcut: 'Ctrl+Z', icon: <Undo2 size={14} color={ICON_ACCENT.muted} strokeWidth={1.6} /> },
        { action: 'redo',  label: t(language, 'edit.redo'),  shortcut: 'Ctrl+R', icon: <Redo2 size={14} color={ICON_ACCENT.muted} strokeWidth={1.6} /> },
        { action: 'separator', label: '' },
        { action: 'copy',  label: t(language, 'edit.copy'),  shortcut: 'Ctrl+C', icon: <Copy size={14} color={ICON_ACCENT.blue} strokeWidth={1.6} /> },
        { action: 'paste', label: t(language, 'edit.paste'), shortcut: 'Ctrl+V', icon: <ClipboardPaste size={14} color={ICON_ACCENT.blue} strokeWidth={1.6} /> },
      ];
    case 'network':
      return [
        { action: 'networksettings', label: 'Network Settings', shortcut: 'Ctrl+Shift+W', icon: <Wifi size={14} color={ICON_ACCENT.blue} strokeWidth={1.6} /> },
      ];
    case 'music':
      return [
        { action: 'openmusic', label: 'Open Music Player…', icon: <Music size={14} color={ICON_ACCENT.blue} strokeWidth={1.6} /> },
      ];
    case 'settings':
      return [
        { action: 'opensettings', label: 'Open Settings Panel…', icon: <Settings size={14} color={ICON_ACCENT.muted} strokeWidth={1.6} /> },
      ];
    default:
      return [];
  }
}

export default function MenuBar({
  language, visible, menuIndex, submenuOpen, submenuIndex,
  filename, onAction, onMenuStateChange,
}: MenuBarProps) {
  const [hoverMenuIdx, setHoverMenuIdx] = useState<number | null>(null);
  const [hoverSubIdx, setHoverSubIdx] = useState<number | null>(null);
  const [mouseActive, setMouseActive] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!mouseActive) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        barRef.current && !barRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
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

  const getDropdownStyle = useCallback((): React.CSSProperties => {
    const idx = mouseActive ? hoverMenuIdx : (visible ? menuIndex : null);
    if (idx === null) return {};
    const el = menuItemRefs.current[idx];
    if (!el) return {};
    const rect = el.getBoundingClientRect();
    return {
      position: 'fixed',
      top: `${rect.bottom + 8}px`,
      left: `${Math.max(8, rect.left - 4)}px`,
      minWidth: '280px',
      zIndex: 9999,
      overflow: 'hidden',
      padding: '6px',
      // Solid opaque background
      background: '#080e1e',
      border: '1px solid rgba(0, 212, 200, 0.12)',
      boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 212, 200, 0.06)',
    };
  }, [mouseActive, hoverMenuIdx, visible, menuIndex]);

  return (
    <div
      ref={barRef}
      style={{
        background: '#080e1e',
        borderBottom: '1px solid rgba(0, 212, 200, 0.08)',
        padding: '0 16px',
        height: '42px',
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
        letterSpacing: '0.02em',
      }}
    >
      {/* Left — menu items */}
      <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
        {MENUS.map((menu, i) => {
          const isFocused = i === activeMenuIdx;

          return (
            <div
              key={menu}
              ref={el => { menuItemRefs.current[i] = el; }}
              style={{
                padding: '6px 12px',
                position: 'relative',
                cursor: 'pointer',
                background: isFocused ? 'rgba(0, 212, 200, 0.12)' : 'transparent',
                color: isFocused ? 'var(--terminal-accent)' : 'var(--terminal-text)',
                fontWeight: '500',
                opacity: isFocused ? 1 : 0.6,
                transition: 'all 0.2s ease',
                fontSize: '12px',
                letterSpacing: '0.03em',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
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
                if (menu === 'music') { onAction('openmusic'); return; }
                if (menu === 'settings') { onAction('opensettings'); return; }
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
              {menu !== 'music' && menu !== 'settings' && (
                <ChevronDown
                  size={10}
                  strokeWidth={2}
                  style={{
                    opacity: isFocused ? 0.8 : 0.4,
                    transition: 'transform 0.2s, opacity 0.2s',
                    transform: isFocused ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
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
          fontSize: '11px',
          fontFamily: uiFont,
          fontWeight: '500',
          opacity: 0.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '280px',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          letterSpacing: '0.04em',
        }}
        title={shortName}
      >
        <FileText size={10} strokeWidth={1.6} style={{ flexShrink: 0, opacity: 0.6 }} />
        {shortName}
      </div>

      {/* Right — dashboard + help + logo + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div
          onClick={(e) => { e.stopPropagation(); onAction('opendashboard'); }}
          aria-label="Writer Dashboard"
          title="Writer Dashboard"
          style={{
            cursor: 'pointer',
            opacity: 0.4,
            padding: '5px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.background = 'rgba(0, 212, 200, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.4';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <User size={15} strokeWidth={1.6} />
        </div>
        <div
          onClick={(e) => { e.stopPropagation(); onAction('openhelp'); }}
          style={{
            cursor: 'pointer',
            opacity: 0.4,
            padding: '5px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.background = 'rgba(0, 212, 200, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.4';
            e.currentTarget.style.background = 'transparent';
          }}
          title="Help & Reference"
        >
          <HelpCircle size={15} strokeWidth={1.6} />
        </div>
        <div style={{
          width: '1px',
          height: '16px',
          background: 'rgba(0, 212, 200, 0.1)',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img
            src={minstrelLogo}
            alt="Minstrel Codex"
            style={{
              width: '20px',
              height: '20px',
              objectFit: 'contain',
              opacity: 0.7,
              filter: 'drop-shadow(0 0 6px rgba(0, 212, 200, 0.2))',
            }}
          />
          <span style={{
            fontSize: '10px',
            fontFamily: uiFont,
            fontWeight: '600',
            opacity: 0.35,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Minstrel
          </span>
        </div>
      </div>

      {/* Portal dropdown */}
      {activeSubOpen && activeMenuIdx !== null && (() => {
        const menu = MENUS[activeMenuIdx];
        if (menu === 'music' || menu === 'settings') return null;
        const items = getSubmenuItems(menu, language);
        const dropStyle = getDropdownStyle();
        return createPortal(
          <div ref={dropdownRef} style={{ ...dropStyle, fontFamily: uiFont }}>
              {items.map((item, j) => {
                if (item.action === 'separator') {
                  return (
                    <div
                      key={`sep-${j}`}
                      style={{
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(0, 212, 200, 0.12), transparent)',
                        margin: '4px 12px',
                      }}
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
                      padding: '8px 12px',
                      cursor: 'pointer',
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(0, 212, 200, 0.18), rgba(0, 212, 200, 0.08))'
                        : 'transparent',
                      color: isActive ? 'var(--terminal-accent)' : 'var(--terminal-text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      borderLeft: isActive ? '2px solid var(--terminal-accent)' : '2px solid transparent',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      {item.icon && (
                        <span style={{
                          display: 'flex', alignItems: 'center', width: '18px', justifyContent: 'center',
                          flexShrink: 0, opacity: isActive ? 1 : 0.7,
                        }}>
                          {item.icon}
                        </span>
                      )}
                      <span style={{
                        opacity: isActive ? 1 : 0.75,
                        fontSize: '13px',
                        fontFamily: uiFont,
                        fontWeight: isActive ? '500' : '400',
                        letterSpacing: '0.01em',
                      }}>
                        {item.label}
                      </span>
                    </span>
                    {item.shortcut && (
                      <span style={{
                        opacity: isActive ? 0.5 : 0.25,
                        fontSize: '10px',
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.02em',
                        flexShrink: 0,
                        padding: '2px 6px',
                        background: isActive ? 'rgba(0, 212, 200, 0.08)' : 'transparent',
                      }}>
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

export { MENUS, getSubmenuItems };
