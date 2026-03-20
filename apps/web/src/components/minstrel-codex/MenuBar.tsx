import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useLocalStorageBoolean } from '@/hooks/useLocalStorageBoolean';
import { createPortal } from 'react-dom';
import {
  FilePlus, BookOpen, FolderOpen, Clock, Save, FileOutput,
  Printer, PanelLeftOpen, Undo2, Redo2, Copy, ClipboardPaste,
  Wifi, Cloud, Settings, Camera, FileText, Music, Keyboard,
  HelpCircle, ChevronDown, LayoutDashboard, Upload,
  SlidersHorizontal,
} from 'lucide-react';
import minstrelLogo from '@/assets/minstrel-logo.svg';
import minstrelLockup from '@/assets/minstrel-logo-lockup.svg';
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
  // Auth
  user?: { email?: string | null; user_metadata?: Record<string, string> } | null;
  onOpenProfile?: () => void;
  // Editor panel
  onEditorClick?: () => void;
}

export const MENUS = ['file', 'network', 'music', 'settings'] as const;
type MenuKey = typeof MENUS[number];

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
        { action: 'newnovel',        label: 'New Novel Wizard',                   shortcut: '',             icon: <BookOpen          size={14} color={ICON_ACCENT.amber} strokeWidth={1.6} /> },
        { action: 'projectsettings', label: 'Project Settings',                   shortcut: '',             icon: <SlidersHorizontal size={14} color={ICON_ACCENT.muted} strokeWidth={1.6} /> },
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
        { action: 'opendashboard', label: 'Writer Dashboard', shortcut: 'Ctrl+Shift+U', icon: <LayoutDashboard size={14} color={ICON_ACCENT.blue} strokeWidth={1.6} /> },
        { action: 'openmusic', label: 'Open Music Player…', icon: <Music size={14} color={ICON_ACCENT.blue} strokeWidth={1.6} /> },
        { action: 'opentypingchallenge', label: 'Typing Challenge', icon: <Keyboard size={14} color={ICON_ACCENT.muted} strokeWidth={1.6} /> },
      ];
    case 'settings':
      return [
        { action: 'opensettings', label: 'Open Settings Panel…', icon: <Settings size={14} color={ICON_ACCENT.muted} strokeWidth={1.6} /> },
      ];
    default:
      return [];
  }
}

/** Derive a stable background colour from a string (for initials avatar) */
function nameToColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 55%, 38%)`;
}

export interface MenuBarHandle {
  closeMenu: () => void;
}

const MenuBar = forwardRef<MenuBarHandle, MenuBarProps>(function MenuBar({
  language, visible, menuIndex, submenuOpen, submenuIndex,
  filename, onAction, onMenuStateChange,
  user, onOpenProfile, onEditorClick,
}, ref) {
  const [editorEnabled] = useLocalStorageBoolean('minstrel-editor-enabled', false);
  const isRaspberryPi = localStorage.getItem('minstrel-device-type') === 'raspberry-pi';
  const visibleMenus = MENUS.filter((m): m is MenuKey => m !== 'network' || isRaspberryPi);
  const [hoverMenuIdx, setHoverMenuIdx] = useState<number | null>(null);
  const [hoverSubIdx, setHoverSubIdx] = useState<number | null>(null);
  const [mouseActive, setMouseActive] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    closeMenu: () => {
      setHoverMenuIdx(null);
      setHoverSubIdx(null);
      setMouseActive(false);
    },
  }));
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
      boxShadow: 'none',
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
        {visibleMenus.map((menu, i) => {
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
              {menu !== 'settings' && (
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

      {/* Right — auth + help + logo + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* ✦ AI EDITOR indicator — only when Editor Module is enabled */}
        {editorEnabled && (
          <span
            onClick={(e) => { e.stopPropagation(); onEditorClick?.(); }}
            title="Open Editor Panel (Ctrl+Shift+E)"
            style={{
              cursor: 'pointer', color: '#4ecdc4', opacity: 0.7,
              fontSize: '10px', fontFamily: uiFont, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              userSelect: 'none',
              border: '1px solid #4ecdc4',
              padding: '2px 8px',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
          >
            ✦ AI EDITOR
          </span>
        )}
        {/* Auth area — opens ProfilePage */}
        {user ? (
          // Signed-in: initials avatar button
          <button
            onClick={(e) => { e.stopPropagation(); onOpenProfile?.(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              background: 'transparent', border: '1px solid #333', borderRadius: 0,
              cursor: 'pointer', padding: '4px 10px', color: '#c8c8c8',
              fontFamily: uiFont, fontSize: '12px',
            }}
            title="Open Profile"
          >
            {(() => {
              const name = user.user_metadata?.full_name || user.user_metadata?.display_name || user.email || '?';
              const initials = name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
              const label = name.length > 16 ? name.slice(0, 16) + '…' : name;
              return (
                <>
                  <span style={{
                    width: '20px', height: '20px',
                    background: nameToColor(name), display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 600, color: '#fff', flexShrink: 0,
                  }}>{initials}</span>
                  <span style={{ opacity: 0.75 }}>{label}</span>
                </>
              );
            })()}
          </button>
        ) : (
          // Not signed in: subtle "Sign In" button
          <button
            onClick={(e) => { e.stopPropagation(); onOpenProfile?.(); }}
            style={{
              background: 'transparent', border: '1px solid #444', borderRadius: 0,
              color: '#888', fontFamily: uiFont, fontSize: '12px',
              padding: '4px 10px', cursor: 'pointer',
              letterSpacing: '0.03em',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--terminal-accent)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#444'; (e.currentTarget as HTMLElement).style.color = '#888'; }}
          >Sign In</button>
        )}
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={minstrelLockup}
            alt="Minstrel Codex"
            style={{
              height: '28px',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>
      </div>

      {/* Portal dropdown */}
      {activeSubOpen && activeMenuIdx !== null && (() => {
        const menu = visibleMenus[activeMenuIdx];
        if (menu === 'settings') return null;
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
});

export default MenuBar;
export { getSubmenuItems };
