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
  wifiOn, bluetoothOn, onAction,
}: MenuBarProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        backgroundColor: 'var(--terminal-bg)',
        borderBottom: '1px solid var(--terminal-text)',
        padding: '8px 16px',
        fontSize: '16px',
        color: 'var(--terminal-text)',
      }}
    >
      <div style={{ display: 'flex', gap: '24px' }}>
        {MENUS.map((menu, i) => {
          const isFocused = i === menuIndex;
          const items = getSubmenuItems(menu, language, wifiOn, bluetoothOn);

          return (
            <div
              key={menu}
              style={{
                padding: '2px 8px',
                position: 'relative',
                cursor: 'pointer',
                background: isFocused ? 'var(--terminal-text)' : 'transparent',
                color: isFocused ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                textShadow: isFocused ? 'none' : '0 0 5px var(--terminal-glow)',
              }}
            >
              {t(language, `menu.${menu}`)}
              {isFocused && submenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    background: 'var(--terminal-bg)',
                    border: '1px solid var(--terminal-text)',
                    minWidth: '250px',
                    zIndex: 100,
                    marginTop: '4px',
                  }}
                >
                  {items.map((item, j) => (
                    <div
                      key={item.action}
                      onClick={() => onAction(item.action)}
                      style={{
                        padding: '8px 16px',
                        cursor: 'pointer',
                        borderBottom: j < items.length - 1 ? '1px solid var(--terminal-text)' : 'none',
                        opacity: j === submenuIndex ? 1 : 0.85,
                        background: j === submenuIndex ? 'var(--terminal-text)' : 'transparent',
                        color: j === submenuIndex ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span style={{ opacity: 0.6, marginLeft: '20px' }}>{item.shortcut}</span>
                      )}
                    </div>
                  ))}
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
