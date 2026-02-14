import { useState } from 'react';
import { t } from '@/lib/languages';
import { ModalButton } from './ModalShell';
import type { AppColors, Language, PinConfig } from '@/lib/types';

// Color presets
const TEXT_PRESETS = ['#33ff33','#00ff00','#ffffff','#4db8ff','#00e5e5','#ffff00','#ffb000','#ff6b9d','#ff5555','#e6e6e6'];
const BG_PRESETS = ['#000000','#ffffff','#0a0a0a','#1a1a1a','#001a33','#001a1a','#1a0033','#f5f5f5','#2c2c2c','#1a3300'];
const COLOR_COMBOS = [
  { text: '#33ff33', bg: '#000000', name: 'Classic Terminal' },
  { text: '#00ff00', bg: '#000000', name: 'Matrix Green' },
  { text: '#ffb000', bg: '#000000', name: 'Warm Amber' },
  { text: '#4db8ff', bg: '#000000', name: 'Cool Blue' },
  { text: '#00e5e5', bg: '#000000', name: 'Cyberpunk Cyan' },
  { text: '#ffffff', bg: '#000000', name: 'High Contrast' },
  { text: '#000000', bg: '#ffffff', name: 'Light Mode' },
  { text: '#ffffff', bg: '#001a33', name: 'Midnight Blue' },
  { text: '#00ff00', bg: '#001a1a', name: 'Dark Teal' },
  { text: '#ffff00', bg: '#000000', name: 'Yellow Alert' },
  { text: '#e6e6e6', bg: '#1a1a1a', name: 'Soft Grey' },
  { text: '#000000', bg: '#f5f5f5', name: 'Reduced Glare' },
];

interface SettingsPanelProps {
  visible: boolean;
  language: Language;
  colors: AppColors;
  wifiOn: boolean;
  bluetoothOn: boolean;
  pinConfig: PinConfig;
  onClose: () => void;
  onAction: (action: string) => void;
  onUpdateColors: (colors: AppColors) => void;
  onResetColors: () => void;
  onSetLanguage: (lang: Language) => void;
  onOpenPinSetup: () => void;
  onOpenTypingChallenge: () => void;
}

type SettingsTab = 'colors' | 'language' | 'security' | 'storage' | 'system';

export default function SettingsPanel({
  visible, language, colors, wifiOn, bluetoothOn, pinConfig,
  onClose, onAction, onUpdateColors, onResetColors, onSetLanguage,
  onOpenPinSetup, onOpenTypingChallenge,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('colors');
  const [textColorInput, setTextColorInput] = useState(colors.text.toUpperCase());
  const [bgColorInput, setBgColorInput] = useState(colors.background.toUpperCase());
  const [selectedTextIdx, setSelectedTextIdx] = useState(-1);
  const [selectedBgIdx, setSelectedBgIdx] = useState(-1);
  const [selectedComboIdx, setSelectedComboIdx] = useState(-1);

  if (!visible) return null;

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'colors', label: '🎨 Colours' },
    { id: 'language', label: '🌐 Language' },
    { id: 'security', label: '🔒 Security' },
    { id: 'storage', label: '💾 Storage' },
    { id: 'system', label: '⚙ System' },
  ];

  const sectionStyle: React.CSSProperties = {
    padding: '16px',
    marginBottom: '12px',
  };

  const handleApplyColors = () => {
    if (/^#[0-9A-F]{6}$/i.test(textColorInput) && /^#[0-9A-F]{6}$/i.test(bgColorInput)) {
      onUpdateColors({ text: textColorInput, background: bgColorInput });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'var(--terminal-bg)',
        color: 'var(--terminal-text)',
        fontFamily: "'Courier Prime', 'Courier New', monospace",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '2px solid var(--terminal-text)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', textShadow: '0 0 10px var(--terminal-glow)' }}>
          ⚙ SETTINGS
        </div>
        <div
          onClick={onClose}
          style={{
            cursor: 'pointer',
            padding: '4px 12px',
            border: '1px solid var(--terminal-text)',
            fontSize: '14px',
          }}
        >
          ESC Close
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--terminal-text)',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              background: activeTab === tab.id ? 'var(--terminal-text)' : 'transparent',
              color: activeTab === tab.id ? 'var(--terminal-bg)' : 'var(--terminal-text)',
              borderRight: '1px solid var(--terminal-text)',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              transition: 'background 0.1s',
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {/* COLOURS TAB */}
        {activeTab === 'colors' && (
          <div>
            {/* Live Preview */}
            <div style={{
              border: '2px solid var(--terminal-text)', padding: '16px', marginBottom: '20px',
              background: bgColorInput, color: textColorInput, textAlign: 'center',
              fontFamily: "'Courier Prime', monospace",
            }}>
              <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px', color: 'var(--terminal-text)' }}>LIVE PREVIEW</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>The quick brown fox</div>
              <div style={{ fontSize: '14px', marginTop: '4px' }}>jumps over the lazy dog</div>
            </div>

            {/* Text Color */}
            <div style={sectionStyle}>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>{t(language, 'modals.textColor')}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '32px', height: '32px', border: '2px solid var(--terminal-text)', background: textColorInput, flexShrink: 0 }} />
                <input
                  value={textColorInput}
                  onChange={e => { setTextColorInput(e.target.value.toUpperCase()); setSelectedTextIdx(-1); setSelectedComboIdx(-1); }}
                  maxLength={7}
                  placeholder="#33FF33"
                  style={{
                    flex: 1, maxWidth: '200px', background: 'var(--terminal-bg)', border: '1px solid var(--terminal-text)',
                    color: 'var(--terminal-text)', padding: '8px',
                    fontFamily: "'Courier Prime', monospace", fontSize: '14px', textTransform: 'uppercase', outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {TEXT_PRESETS.map((color, i) => (
                  <div
                    key={color}
                    onClick={() => { setTextColorInput(color.toUpperCase()); setSelectedTextIdx(i); setSelectedComboIdx(-1); }}
                    style={{
                      width: '32px', height: '32px', background: color,
                      border: selectedTextIdx === i ? '3px solid var(--terminal-text)' : '2px solid var(--terminal-text)',
                      cursor: 'pointer', opacity: selectedTextIdx === i ? 1 : 0.6, position: 'relative',
                    }}
                  >
                    {selectedTextIdx === i && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: color === '#ffffff' || color === '#ffff00' || color === '#e6e6e6' ? '#000' : '#fff' }}>✓</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* BG Color */}
            <div style={sectionStyle}>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>{t(language, 'modals.bgColor')}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '32px', height: '32px', border: '2px solid var(--terminal-text)', background: bgColorInput, flexShrink: 0 }} />
                <input
                  value={bgColorInput}
                  onChange={e => { setBgColorInput(e.target.value.toUpperCase()); setSelectedBgIdx(-1); setSelectedComboIdx(-1); }}
                  maxLength={7}
                  placeholder="#000000"
                  style={{
                    flex: 1, maxWidth: '200px', background: 'var(--terminal-bg)', border: '1px solid var(--terminal-text)',
                    color: 'var(--terminal-text)', padding: '8px',
                    fontFamily: "'Courier Prime', monospace", fontSize: '14px', textTransform: 'uppercase', outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {BG_PRESETS.map((color, i) => (
                  <div
                    key={color}
                    onClick={() => { setBgColorInput(color.toUpperCase()); setSelectedBgIdx(i); setSelectedComboIdx(-1); }}
                    style={{
                      width: '32px', height: '32px', background: color,
                      border: selectedBgIdx === i ? '3px solid var(--terminal-text)' : `2px solid ${color === '#ffffff' || color === '#f5f5f5' ? '#666' : 'var(--terminal-text)'}`,
                      cursor: 'pointer', opacity: selectedBgIdx === i ? 1 : 0.6, position: 'relative',
                    }}
                  >
                    {selectedBgIdx === i && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: color === '#000000' || color === '#0a0a0a' || color === '#1a1a1a' ? '#fff' : '#000' }}>✓</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Combos */}
            <div style={{ ...sectionStyle, borderTop: '1px solid var(--terminal-text)', paddingTop: '16px' }}>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '12px' }}>COLOUR COMBINATIONS (WCAG Compliant):</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {COLOR_COMBOS.map((combo, i) => (
                  <div
                    key={combo.name}
                    onClick={() => {
                      setTextColorInput(combo.text.toUpperCase());
                      setBgColorInput(combo.bg.toUpperCase());
                      setSelectedComboIdx(i);
                      setSelectedTextIdx(-1);
                      setSelectedBgIdx(-1);
                    }}
                    style={{
                      border: selectedComboIdx === i ? '3px solid var(--terminal-text)' : '1px solid var(--terminal-text)',
                      padding: selectedComboIdx === i ? '6px' : '8px',
                      cursor: 'pointer', textAlign: 'center',
                      opacity: selectedComboIdx === i ? 1 : 0.6, position: 'relative',
                    }}
                  >
                    {selectedComboIdx === i && (
                      <div style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '14px', color: 'var(--terminal-text)' }}>✓</div>
                    )}
                    <div style={{
                      background: combo.bg, color: combo.text, padding: '8px',
                      fontWeight: 'bold', fontSize: '20px',
                      fontFamily: "'Courier Prime', monospace", marginBottom: '8px',
                    }}>Aa</div>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>{combo.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', padding: '16px 0' }}>
              <ModalButton label={t(language, 'modals.apply')} focused={false} onClick={handleApplyColors} />
              <ModalButton label={t(language, 'modals.reset')} focused={false} onClick={() => {
                onResetColors();
                setTextColorInput('#33FF33');
                setBgColorInput('#000000');
                setSelectedTextIdx(-1);
                setSelectedBgIdx(-1);
                setSelectedComboIdx(-1);
              }} />
            </div>
          </div>
        )}

        {/* LANGUAGE TAB */}
        {activeTab === 'language' && (
          <div>
            <div style={{ fontSize: '16px', marginBottom: '16px', fontWeight: 'bold' }}>
              {t(language, 'modals.languageTitle')}
            </div>
            {([
              { code: 'en-GB' as Language, label: t(language, 'language.englishGB') },
              { code: 'en-US' as Language, label: t(language, 'language.englishUS') },
              { code: 'af' as Language, label: t(language, 'language.afrikaans') },
            ]).map(lang => (
              <div
                key={lang.code}
                onClick={() => onSetLanguage(lang.code)}
                style={{
                  padding: '12px 16px',
                  margin: '4px 0',
                  border: '1px solid var(--terminal-text)',
                  cursor: 'pointer',
                  background: language === lang.code ? 'var(--terminal-text)' : 'transparent',
                  color: language === lang.code ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{lang.label}</span>
                {language === lang.code && <span>✓</span>}
              </div>
            ))}
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div>
            <div style={{ fontSize: '16px', marginBottom: '16px', fontWeight: 'bold' }}>🔒 PIN Lock</div>
            <div style={{
              padding: '16px',
              border: '1px solid var(--terminal-text)',
              marginBottom: '16px',
            }}>
              <div style={{ marginBottom: '12px' }}>
                Status: <strong>{pinConfig.enabled ? `Enabled (${pinConfig.length}-digit)` : 'Disabled'}</strong>
              </div>
              <ModalButton
                label={pinConfig.enabled ? 'Change PIN' : 'Set Up PIN'}
                focused={false}
                onClick={onOpenPinSetup}
              />
            </div>
          </div>
        )}

        {/* STORAGE TAB */}
        {activeTab === 'storage' && (
          <div>
            <div style={{ fontSize: '16px', marginBottom: '16px', fontWeight: 'bold' }}>💾 Storage Providers</div>
            {[
              { action: 'local', label: t(language, 'storage.local') },
              { action: 'usb', label: t(language, 'storage.usb') },
              { action: 'dropbox', label: t(language, 'storage.dropbox') },
              { action: 'gdrive', label: t(language, 'storage.gdrive') },
              { action: 'icloud', label: t(language, 'storage.icloud') },
            ].map(item => (
              <div
                key={item.action}
                onClick={() => { onAction(item.action); }}
                style={{
                  padding: '12px 16px',
                  margin: '4px 0',
                  border: '1px solid var(--terminal-text)',
                  cursor: 'pointer',
                  opacity: 0.9,
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}

        {/* SYSTEM TAB */}
        {activeTab === 'system' && (
          <div>
            <div style={{ fontSize: '16px', marginBottom: '16px', fontWeight: 'bold' }}>⚙ System</div>
            
            <div
              onClick={onOpenTypingChallenge}
              style={{
                padding: '12px 16px',
                margin: '4px 0',
                border: '1px solid var(--terminal-text)',
                cursor: 'pointer',
              }}
            >
              ⌨ Typing Challenge
            </div>

            <div
              onClick={() => onAction('update')}
              style={{
                padding: '12px 16px',
                margin: '4px 0',
                border: '1px solid var(--terminal-text)',
                cursor: 'pointer',
              }}
            >
              {t(language, 'power.update')}
            </div>

            <div
              onClick={() => onAction('shutdown')}
              style={{
                padding: '12px 16px',
                margin: '4px 0',
                border: '1px solid var(--terminal-text)',
                cursor: 'pointer',
                marginTop: '20px',
                borderColor: '#ff5555',
                color: '#ff5555',
              }}
            >
              {t(language, 'power.shutdown')}
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div style={{
        padding: '8px 20px',
        borderTop: '1px solid var(--terminal-text)',
        fontSize: '12px',
        opacity: 0.5,
        textAlign: 'center',
        flexShrink: 0,
      }}>
        Press ESC to close settings
      </div>
    </div>
  );
}
