import { useState, useEffect, useCallback } from 'react';
import { t } from '@/lib/languages';
import { ModalButton } from './ModalShell';
import { supabase } from '@/integrations/supabase/client';
import { ThemeMode, THEMES } from '@/lib/themes';
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
  themeMode: ThemeMode;
  onClose: () => void;
  onAction: (action: string) => void;
  onUpdateColors: (colors: AppColors) => void;
  onResetColors: () => void;
  onSetLanguage: (lang: Language) => void;
  onOpenPinSetup: () => void;
  onOpenTypingChallenge: () => void;
  onConnectGoogle: () => void;
  onConnectApple: () => void;
  onSwitchTheme: (mode: ThemeMode) => void;
}

type StorageProvider = 'google' | 'apple';

interface ConnectedProviders {
  google: boolean;
  apple: boolean;
}

type SettingsTab = 'appearance' | 'colors' | 'language' | 'security' | 'storage' | 'system';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'appearance', label: '🖥 Theme' },
  { id: 'colors', label: '🎨 Colours' },
  { id: 'language', label: '🌐 Language' },
  { id: 'security', label: '🔒 Security' },
  { id: 'storage', label: '💾 Storage' },
  { id: 'system', label: '⚙ System' },
];

export default function SettingsPanel({
  visible, language, colors, wifiOn, bluetoothOn, pinConfig, themeMode,
  onClose, onAction, onUpdateColors, onResetColors, onSetLanguage,
  onOpenPinSetup, onOpenTypingChallenge, onConnectGoogle, onConnectApple,
  onSwitchTheme,
}: SettingsPanelProps) {
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [focusedItemIdx, setFocusedItemIdx] = useState(0);
  const [textColorInput, setTextColorInput] = useState(colors.text.toUpperCase());
  const [bgColorInput, setBgColorInput] = useState(colors.background.toUpperCase());
  const [selectedTextIdx, setSelectedTextIdx] = useState(-1);
  const [selectedBgIdx, setSelectedBgIdx] = useState(-1);
  const [selectedComboIdx, setSelectedComboIdx] = useState(-1);

  const activeTab = TABS[activeTabIdx].id;

  // Track connected providers
  const [connectedProviders, setConnectedProviders] = useState<ConnectedProviders>({ google: false, apple: false });

  useEffect(() => {
    if (!visible) return;
    const checkProviders = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const provider = session.user?.app_metadata?.provider;
        setConnectedProviders(prev => ({
          ...prev,
          google: provider === 'google' || prev.google,
          apple: provider === 'apple' || prev.apple,
        }));
        // Also check provider_token for Google Drive access
        if (session.provider_token) {
          setConnectedProviders(prev => ({ ...prev, google: true }));
        }
      }
    };
    checkProviders();
  }, [visible]);

  // Reset focused item when tab changes
  useEffect(() => { setFocusedItemIdx(0); }, [activeTabIdx]);

  // Get the number of focusable items in the current tab
  const getItemCount = useCallback((): number => {
    switch (activeTab) {
      case 'appearance': return 3;
      case 'colors': return TEXT_PRESETS.length + BG_PRESETS.length + COLOR_COMBOS.length + 2;
      case 'language': return 3;
      case 'security': return 1;
      case 'storage': return 5;
      case 'system': return 3;
      default: return 0;
    }
  }, [activeTab]);

  // Keyboard handler
  useEffect(() => {
    if (!visible) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        e.preventDefault();
        return;
      }

      // Tab/Shift+Tab to switch tabs
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          setActiveTabIdx(prev => (prev - 1 + TABS.length) % TABS.length);
        } else {
          setActiveTabIdx(prev => (prev + 1) % TABS.length);
        }
        return;
      }

      const itemCount = getItemCount();

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedItemIdx(prev => (prev + 1) % itemCount);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedItemIdx(prev => (prev - 1 + itemCount) % itemCount);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleEnter();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [visible, activeTab, activeTabIdx, focusedItemIdx, textColorInput, bgColorInput, getItemCount]);

  const handleEnter = () => {
    switch (activeTab) {
      case 'appearance': {
        const modes: ThemeMode[] = ['terminal', 'modern', 'typewriter'];
        if (focusedItemIdx < modes.length) onSwitchTheme(modes[focusedItemIdx]);
        break;
      }
      case 'colors': {
        const textEnd = TEXT_PRESETS.length;
        const bgEnd = textEnd + BG_PRESETS.length;
        const comboEnd = bgEnd + COLOR_COMBOS.length;
        if (focusedItemIdx < textEnd) {
          const color = TEXT_PRESETS[focusedItemIdx];
          setTextColorInput(color.toUpperCase());
          setSelectedTextIdx(focusedItemIdx);
          setSelectedComboIdx(-1);
        } else if (focusedItemIdx < bgEnd) {
          const i = focusedItemIdx - textEnd;
          const color = BG_PRESETS[i];
          setBgColorInput(color.toUpperCase());
          setSelectedBgIdx(i);
          setSelectedComboIdx(-1);
        } else if (focusedItemIdx < comboEnd) {
          const i = focusedItemIdx - bgEnd;
          const combo = COLOR_COMBOS[i];
          setTextColorInput(combo.text.toUpperCase());
          setBgColorInput(combo.bg.toUpperCase());
          setSelectedComboIdx(i);
          setSelectedTextIdx(-1);
          setSelectedBgIdx(-1);
        } else if (focusedItemIdx === comboEnd) {
          handleApplyColors();
        } else {
          onResetColors();
          setTextColorInput('#33FF33');
          setBgColorInput('#000000');
          setSelectedTextIdx(-1);
          setSelectedBgIdx(-1);
          setSelectedComboIdx(-1);
        }
        break;
      }
      case 'language': {
        const langs: Language[] = ['en-GB', 'en-US', 'af'];
        if (focusedItemIdx < langs.length) onSetLanguage(langs[focusedItemIdx]);
        break;
      }
      case 'security':
        onOpenPinSetup();
        break;
      case 'storage': {
        const actions = ['local', 'usb', 'dropbox', 'gdrive', 'icloud'];
        if (focusedItemIdx < actions.length) onAction(actions[focusedItemIdx]);
        break;
      }
      case 'system': {
        if (focusedItemIdx === 0) onOpenTypingChallenge();
        else if (focusedItemIdx === 1) onAction('update');
        else if (focusedItemIdx === 2) onAction('shutdown');
        break;
      }
    }
  };

  const handleApplyColors = () => {
    if (/^#[0-9A-F]{6}$/i.test(textColorInput) && /^#[0-9A-F]{6}$/i.test(bgColorInput)) {
      onUpdateColors({ text: textColorInput, background: bgColorInput });
    }
  };

  if (!visible) return null;

  const itemStyle = (focused: boolean, selected?: boolean): React.CSSProperties => ({
    padding: '12px 16px',
    margin: '4px 0',
    border: selected ? '2px solid var(--terminal-text)' : '1px solid var(--terminal-text)',
    cursor: 'pointer',
    background: focused ? 'var(--terminal-text)' : 'transparent',
    color: focused ? 'var(--terminal-bg)' : 'var(--terminal-text)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background 0.05s, color 0.05s',
    fontWeight: selected ? 'bold' : 'normal',
  });

  const sectionStyle: React.CSSProperties = { padding: '16px', marginBottom: '12px' };

  // Helper: is a color swatch focused?
  const isTextSwatchFocused = (i: number) => activeTab === 'colors' && focusedItemIdx === i;
  const isBgSwatchFocused = (i: number) => activeTab === 'colors' && focusedItemIdx === TEXT_PRESETS.length + i;
  const isComboFocused = (i: number) => activeTab === 'colors' && focusedItemIdx === TEXT_PRESETS.length + BG_PRESETS.length + i;
  const applyFocused = activeTab === 'colors' && focusedItemIdx === TEXT_PRESETS.length + BG_PRESETS.length + COLOR_COMBOS.length;
  const resetFocused = activeTab === 'colors' && focusedItemIdx === TEXT_PRESETS.length + BG_PRESETS.length + COLOR_COMBOS.length + 1;

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
        {TABS.map((tab, i) => (
          <div
            key={tab.id}
            onClick={() => setActiveTabIdx(i)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              background: i === activeTabIdx ? 'var(--terminal-text)' : 'transparent',
              color: i === activeTabIdx ? 'var(--terminal-bg)' : 'var(--terminal-text)',
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

        {/* APPEARANCE TAB */}
        {activeTab === 'appearance' && (
          <div>
            <div style={{ fontSize: '16px', marginBottom: '20px', fontWeight: 'bold' }}>🖥 Visual Theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {(['terminal', 'modern', 'typewriter'] as ThemeMode[]).map((mode, i) => {
                const themeDef = THEMES[mode];
                const isActive = themeMode === mode;
                const isFocused = focusedItemIdx === i;
                return (
                  <div
                    key={mode}
                    onClick={() => { onSwitchTheme(mode); setFocusedItemIdx(i); }}
                    style={{
                      cursor: 'pointer',
                      border: isActive ? '3px solid var(--terminal-accent)' : isFocused ? '2px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? '0 4px 16px var(--terminal-glow)' : 'none',
                    }}
                  >
                    <div style={{
                      background: themeDef.preview.bg,
                      color: themeDef.preview.fg,
                      padding: '20px 16px',
                      fontFamily: themeDef.fonts.body,
                      fontSize: '15px',
                      lineHeight: 1.55,
                      minHeight: '80px',
                      textShadow: themeDef.effects.textGlow ? `0 0 8px ${themeDef.colors.glow}` : 'none',
                    }}>
                      <div style={{ fontWeight: 'bold' }}>{themeDef.preview.sampleText}</div>
                      <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>jumps over the lazy dog.</div>
                    </div>
                    <div style={{
                      padding: '10px 16px',
                      background: isActive ? 'var(--terminal-accent)' : 'transparent',
                      color: isActive ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: '13px', fontWeight: '600',
                      fontFamily: 'var(--font-ui)',
                    }}>
                      <span>{themeDef.label}</span>
                      {isActive && <span>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '16px', fontSize: '12px', opacity: 0.5, lineHeight: 1.6, fontFamily: 'var(--font-ui)' }}>
              Theme changes take effect immediately. Fine-tune colours in the Colours tab.
            </div>
          </div>
        )}

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
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>{t(language, 'modals.textColor')} (↑↓ Navigate • Enter Select)</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '32px', height: '32px', border: '2px solid var(--terminal-text)', background: textColorInput, flexShrink: 0 }} />
                <input
                  value={textColorInput}
                  onChange={e => { setTextColorInput(e.target.value.toUpperCase()); setSelectedTextIdx(-1); setSelectedComboIdx(-1); }}
                  maxLength={7}
                  placeholder="#33FF33"
                  tabIndex={-1}
                  style={{
                    flex: 1, maxWidth: '200px', background: 'var(--terminal-bg)', border: '1px solid var(--terminal-text)',
                    color: 'var(--terminal-text)', padding: '8px',
                    fontFamily: "'Courier Prime', monospace", fontSize: '14px', textTransform: 'uppercase', outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {TEXT_PRESETS.map((color, i) => {
                  const focused = isTextSwatchFocused(i);
                  return (
                    <div
                      key={color}
                      onClick={() => { setTextColorInput(color.toUpperCase()); setSelectedTextIdx(i); setSelectedComboIdx(-1); setFocusedItemIdx(i); }}
                      style={{
                        width: '32px', height: '32px', background: color,
                        border: (focused || selectedTextIdx === i) ? '3px solid var(--terminal-text)' : '2px solid var(--terminal-text)',
                        cursor: 'pointer', opacity: (focused || selectedTextIdx === i) ? 1 : 0.6, position: 'relative',
                        outline: focused ? '2px solid var(--terminal-glow)' : 'none',
                        outlineOffset: '2px',
                      }}
                    >
                      {selectedTextIdx === i && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: color === '#ffffff' || color === '#ffff00' || color === '#e6e6e6' ? '#000' : '#fff' }}>✓</div>
                      )}
                    </div>
                  );
                })}
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
                  tabIndex={-1}
                  style={{
                    flex: 1, maxWidth: '200px', background: 'var(--terminal-bg)', border: '1px solid var(--terminal-text)',
                    color: 'var(--terminal-text)', padding: '8px',
                    fontFamily: "'Courier Prime', monospace", fontSize: '14px', textTransform: 'uppercase', outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {BG_PRESETS.map((color, i) => {
                  const focused = isBgSwatchFocused(i);
                  return (
                    <div
                      key={color}
                      onClick={() => { setBgColorInput(color.toUpperCase()); setSelectedBgIdx(i); setSelectedComboIdx(-1); setFocusedItemIdx(TEXT_PRESETS.length + i); }}
                      style={{
                        width: '32px', height: '32px', background: color,
                        border: (focused || selectedBgIdx === i) ? '3px solid var(--terminal-text)' : `2px solid ${color === '#ffffff' || color === '#f5f5f5' ? '#666' : 'var(--terminal-text)'}`,
                        cursor: 'pointer', opacity: (focused || selectedBgIdx === i) ? 1 : 0.6, position: 'relative',
                        outline: focused ? '2px solid var(--terminal-glow)' : 'none',
                        outlineOffset: '2px',
                      }}
                    >
                      {selectedBgIdx === i && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: color === '#000000' || color === '#0a0a0a' || color === '#1a1a1a' ? '#fff' : '#000' }}>✓</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Combos */}
            <div style={{ ...sectionStyle, borderTop: '1px solid var(--terminal-text)', paddingTop: '16px' }}>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '12px' }}>COLOUR COMBINATIONS (WCAG Compliant):</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {COLOR_COMBOS.map((combo, i) => {
                  const focused = isComboFocused(i);
                  return (
                    <div
                      key={combo.name}
                      onClick={() => {
                        setTextColorInput(combo.text.toUpperCase());
                        setBgColorInput(combo.bg.toUpperCase());
                        setSelectedComboIdx(i);
                        setSelectedTextIdx(-1);
                        setSelectedBgIdx(-1);
                        setFocusedItemIdx(TEXT_PRESETS.length + BG_PRESETS.length + i);
                      }}
                      style={{
                        border: (focused || selectedComboIdx === i) ? '3px solid var(--terminal-text)' : '1px solid var(--terminal-text)',
                        padding: (focused || selectedComboIdx === i) ? '6px' : '8px',
                        cursor: 'pointer', textAlign: 'center',
                        opacity: (focused || selectedComboIdx === i) ? 1 : 0.6, position: 'relative',
                        outline: focused ? '2px solid var(--terminal-glow)' : 'none',
                        outlineOffset: '2px',
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
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', padding: '16px 0' }}>
              <ModalButton label={t(language, 'modals.apply')} focused={applyFocused} onClick={handleApplyColors} />
              <ModalButton label={t(language, 'modals.reset')} focused={resetFocused} onClick={() => {
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
            ]).map((lang, i) => (
              <div
                key={lang.code}
                onClick={() => { onSetLanguage(lang.code); setFocusedItemIdx(i); }}
                style={itemStyle(focusedItemIdx === i, language === lang.code)}
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
            <div style={itemStyle(focusedItemIdx === 0)} onClick={onOpenPinSetup}>
              <span>{pinConfig.enabled ? `Change PIN (${pinConfig.length}-digit enabled)` : 'Set Up PIN'}</span>
              <span style={{ opacity: 0.5 }}>Enter</span>
            </div>
          </div>
        )}

        {/* STORAGE TAB */}
        {activeTab === 'storage' && (
          <div>
            <div style={{ fontSize: '16px', marginBottom: '16px', fontWeight: 'bold' }}>💾 Storage Providers</div>

            {/* Local & USB */}
            <div
              onClick={() => { onAction('local'); setFocusedItemIdx(0); }}
              style={itemStyle(focusedItemIdx === 0)}
            >
              <span>{t(language, 'storage.local')}</span>
              <span style={{ fontSize: '11px', opacity: 0.6 }}>✓ ALWAYS AVAILABLE</span>
            </div>
            <div
              onClick={() => { onAction('usb'); setFocusedItemIdx(1); }}
              style={itemStyle(focusedItemIdx === 1)}
            >
              <span>{t(language, 'storage.usb')}</span>
            </div>

            {/* Cloud Providers with connection status */}
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px', borderTop: '1px solid var(--terminal-text)', paddingTop: '12px' }}>
              ☁ CLOUD PROVIDERS
            </div>

            {/* Google Drive */}
            <div
              onClick={() => {
                if (connectedProviders.google) {
                  onAction('gdrive');
                } else {
                  onConnectGoogle();
                }
                setFocusedItemIdx(2);
              }}
              style={itemStyle(focusedItemIdx === 2)}
            >
              <span>☁ Google Drive</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: connectedProviders.google ? (focusedItemIdx === 2 ? 'var(--terminal-bg)' : 'var(--terminal-text)') : (focusedItemIdx === 2 ? 'var(--terminal-bg)' : '#ff5555') }}>
                {connectedProviders.google ? '✓ CONNECTED' : '✕ NOT LINKED — CLICK TO CONNECT'}
              </span>
            </div>

            {/* Apple iCloud */}
            <div
              onClick={() => {
                if (connectedProviders.apple) {
                  onAction('icloud');
                } else {
                  onConnectApple();
                }
                setFocusedItemIdx(3);
              }}
              style={itemStyle(focusedItemIdx === 3)}
            >
              <span>🍎 iCloud (Apple)</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: connectedProviders.apple ? (focusedItemIdx === 3 ? 'var(--terminal-bg)' : 'var(--terminal-text)') : (focusedItemIdx === 3 ? 'var(--terminal-bg)' : '#ff5555') }}>
                {connectedProviders.apple ? '✓ CONNECTED' : '✕ NOT LINKED — CLICK TO CONNECT'}
              </span>
            </div>

            {/* Dropbox */}
            <div
              onClick={() => { onAction('dropbox'); setFocusedItemIdx(4); }}
              style={itemStyle(focusedItemIdx === 4)}
            >
              <span>{t(language, 'storage.dropbox')}</span>
              <span style={{ fontSize: '11px', opacity: 0.5 }}>COMING SOON</span>
            </div>

            <div style={{ marginTop: '16px', padding: '12px', border: '1px solid var(--terminal-text)', fontSize: '12px', opacity: 0.7, lineHeight: 1.6 }}>
              ℹ Connect your cloud accounts to sync files across devices. Each provider opens its own sign-in flow. Your connection status is shown above.
            </div>
          </div>
        )}

        {/* SYSTEM TAB */}
        {activeTab === 'system' && (
          <div>
            <div style={{ fontSize: '16px', marginBottom: '16px', fontWeight: 'bold' }}>⚙ System</div>

            <div onClick={() => { onOpenTypingChallenge(); setFocusedItemIdx(0); }} style={itemStyle(focusedItemIdx === 0)}>
              <span>⌨ Typing Challenge</span>
              <span style={{ opacity: 0.5 }}>Enter</span>
            </div>

            <div onClick={() => { onAction('update'); setFocusedItemIdx(1); }} style={itemStyle(focusedItemIdx === 1)}>
              <span>{t(language, 'power.update')}</span>
            </div>

            <div
              onClick={() => { onAction('shutdown'); setFocusedItemIdx(2); }}
              style={{
                ...itemStyle(focusedItemIdx === 2),
                borderColor: focusedItemIdx === 2 ? 'var(--terminal-text)' : '#ff5555',
                color: focusedItemIdx === 2 ? 'var(--terminal-bg)' : '#ff5555',
              }}
            >
              <span>{t(language, 'power.shutdown')}</span>
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
        [ Tab Switch Section • ↑↓ Navigate • Enter Select • ESC Close ]
      </div>
    </div>
  );
}
