import { useState, useEffect, useCallback } from 'react';
import { t } from '@/lib/languages';
// supabase import removed — connection state uses localStorage
import { ThemeMode, THEMES } from '@/lib/themes';
import type { AppColors, Language, PinConfig } from '@/lib/types';
import AccessibilitySection from './AccessibilitySection';
import type { AccessibilitySettings } from '@/hooks/useAccessibility';

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

const CUSTOM_THEMES_KEY = 'pw-custom-themes';

interface CustomTheme {
  name: string;
  text: string;
  bg: string;
}

function loadCustomThemes(): CustomTheme[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY) || '[]');
  } catch { return []; }
}

function saveCustomThemes(themes: CustomTheme[]) {
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
}

interface SettingsPanelProps {
  visible: boolean;
  language: Language;
  colors: AppColors;
  wifiOn: boolean;
  bluetoothOn: boolean;
  pinConfig: PinConfig;
  themeMode: ThemeMode;
  a11ySettings: AccessibilitySettings;
  onA11yUpdate: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void;
  onA11yReset: () => void;
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

type SettingsTab = 'appearance' | 'colors' | 'language' | 'accessibility' | 'security' | 'storage' | 'system';

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'appearance',     label: 'Theme',    icon: '🖥' },
  { id: 'colors',         label: 'Colours',  icon: '🎨' },
  { id: 'accessibility',  label: 'Access',   icon: '♿' },
  { id: 'language',       label: 'Language', icon: '🌐' },
  { id: 'security',       label: 'Security', icon: '🔒' },
  { id: 'storage',        label: 'Storage',  icon: '💾' },
  { id: 'system',         label: 'System',   icon: '⚙' },
];

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

export default function SettingsPanel({
  visible, language, colors, wifiOn, bluetoothOn, pinConfig, themeMode,
  a11ySettings, onA11yUpdate, onA11yReset,
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
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(loadCustomThemes);
  const [saveThemeName, setSaveThemeName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const activeTab = TABS[activeTabIdx].id;

  const [connectedProviders, setConnectedProviders] = useState<ConnectedProviders>(() => ({
    google: !!localStorage.getItem('pw-google-token'),
    apple: false,
  }));

  useEffect(() => {
    if (!visible) return;
    // Check localStorage token as source of truth
    setConnectedProviders({
      google: !!localStorage.getItem('pw-google-token'),
      apple: false,
    });
  }, [visible]);

  useEffect(() => { setFocusedItemIdx(0); }, [activeTabIdx]);

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

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); e.preventDefault(); return; }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) setActiveTabIdx(prev => (prev - 1 + TABS.length) % TABS.length);
        else setActiveTabIdx(prev => (prev + 1) % TABS.length);
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
          setTextColorInput(color.toUpperCase()); setSelectedTextIdx(focusedItemIdx); setSelectedComboIdx(-1);
        } else if (focusedItemIdx < bgEnd) {
          const i = focusedItemIdx - textEnd;
          setBgColorInput(BG_PRESETS[i].toUpperCase()); setSelectedBgIdx(i); setSelectedComboIdx(-1);
        } else if (focusedItemIdx < comboEnd) {
          const i = focusedItemIdx - bgEnd;
          const combo = COLOR_COMBOS[i];
          setTextColorInput(combo.text.toUpperCase()); setBgColorInput(combo.bg.toUpperCase());
          setSelectedComboIdx(i); setSelectedTextIdx(-1); setSelectedBgIdx(-1);
        } else if (focusedItemIdx === comboEnd) {
          handleApplyColors();
        } else {
          onResetColors();
          setTextColorInput('#33FF33'); setBgColorInput('#000000');
          setSelectedTextIdx(-1); setSelectedBgIdx(-1); setSelectedComboIdx(-1);
        }
        break;
      }
      case 'language': {
        const langs: Language[] = ['en-GB', 'en-US', 'af'];
        if (focusedItemIdx < langs.length) onSetLanguage(langs[focusedItemIdx]);
        break;
      }
      case 'security': onOpenPinSetup(); break;
      case 'storage': {
        const actions = ['local', 'usb', 'gdrive'];
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

  // ── Shared card-style item ────────────────────────────────────────────────
  const rowCard = (focused: boolean, selected?: boolean, danger?: boolean): React.CSSProperties => ({
    padding: '12px 16px',
    marginBottom: '8px',
    borderRadius: '10px',
    border: selected
      ? '2px solid var(--terminal-accent)'
      : focused
        ? '2px solid var(--terminal-accent)'
        : '1px solid var(--terminal-border)',
    cursor: 'pointer',
    background: focused
      ? 'var(--terminal-accent)'
      : selected
        ? 'var(--terminal-surface)'
        : 'var(--terminal-surface)',
    color: focused ? 'var(--terminal-bg)' : danger ? '#e05c5c' : 'var(--terminal-text)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.15s',
    fontFamily: uiFont,
    fontSize: '14px',
    fontWeight: selected ? '600' : '400',
    boxShadow: focused ? '0 2px 12px var(--terminal-glow)' : '0 1px 3px rgba(0,0,0,0.06)',
  });

  const isTextSwatchFocused = (i: number) => activeTab === 'colors' && focusedItemIdx === i;
  const isBgSwatchFocused = (i: number) => activeTab === 'colors' && focusedItemIdx === TEXT_PRESETS.length + i;
  const isComboFocused = (i: number) => activeTab === 'colors' && focusedItemIdx === TEXT_PRESETS.length + BG_PRESETS.length + i;
  const applyFocused = activeTab === 'colors' && focusedItemIdx === TEXT_PRESETS.length + BG_PRESETS.length + COLOR_COMBOS.length;
  const resetFocused = activeTab === 'colors' && focusedItemIdx === TEXT_PRESETS.length + BG_PRESETS.length + COLOR_COMBOS.length + 1;

  return (
    <div
      style={{
        width: '340px',
        minWidth: '340px',
        height: '100%',
        background: 'var(--terminal-bg)',
        borderRight: '1px solid var(--terminal-border)',
        color: 'var(--terminal-text)',
        fontFamily: uiFont,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        background: 'var(--terminal-surface)',
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: uiFont, opacity: 0.65, display: 'flex', alignItems: 'center', gap: '7px' }}>
          ⚙ Settings
        </span>
        <button
          onClick={onClose}
          title="Esc to close"
          style={{
            background: 'transparent',
            border: '1px solid var(--terminal-border)',
            borderRadius: '6px',
            color: 'var(--terminal-text)',
            opacity: 0.45,
            cursor: 'pointer',
            width: '22px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            lineHeight: 1,
            fontFamily: uiFont,
            transition: 'opacity 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-accent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.45'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-border)'; }}
        >
          ✕
        </button>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '3px',
        padding: '8px',
        borderBottom: '1px solid var(--terminal-border)',
        flexShrink: 0,
        background: 'var(--terminal-surface)',
      }}>
        {TABS.map((tab, i) => {
          const active = i === activeTabIdx;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabIdx(i)}
              style={{
                padding: '6px 4px',
                borderRadius: '7px',
                border: active ? '1.5px solid var(--terminal-accent)' : '1px solid transparent',
                background: active ? 'var(--terminal-accent)' : 'transparent',
                color: active ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                fontSize: '11px',
                fontFamily: uiFont,
                fontWeight: active ? '600' : '400',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                opacity: active ? 1 : 0.65,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'var(--terminal-border)'; } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.opacity = '0.65'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
            >
              <span style={{ fontSize: '14px' }}>{tab.icon}</span>
              <span style={{ fontSize: '10px' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px', width: '100%', boxSizing: 'border-box' }}>

        {/* APPEARANCE */}
        {activeTab === 'appearance' && (
          <div>
            <div style={{ fontSize: '15px', marginBottom: '20px', fontWeight: '600', fontFamily: uiFont, opacity: 0.8 }}>Visual Theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '16px' }}>
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
                      border: isActive
                        ? '2px solid var(--terminal-accent)'
                        : isFocused
                          ? '2px solid var(--terminal-accent)'
                          : '1px solid var(--terminal-border)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? '0 4px 20px var(--terminal-glow)' : '0 1px 4px rgba(0,0,0,0.08)',
                    }}
                  >
                    <div style={{
                      background: themeDef.preview.bg,
                      color: themeDef.preview.fg,
                      padding: '20px 18px',
                      fontFamily: themeDef.fonts.body,
                      fontSize: '14px',
                      lineHeight: 1.6,
                      minHeight: '80px',
                      textShadow: themeDef.effects.textGlow ? `0 0 8px ${themeDef.colors.glow}` : 'none',
                    }}>
                      <div style={{ fontWeight: '700' }}>{themeDef.preview.sampleText}</div>
                      <div style={{ fontSize: '12px', opacity: 0.55, marginTop: '4px' }}>jumps over the lazy dog.</div>
                    </div>
                    <div style={{
                      padding: '10px 18px',
                      background: isActive ? 'var(--terminal-accent)' : 'var(--terminal-surface)',
                      color: isActive ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: '13px', fontWeight: '600',
                      fontFamily: uiFont,
                      borderTop: `1px solid var(--terminal-border)`,
                    }}>
                      <span>{themeDef.label}</span>
                      {isActive && <span style={{ fontSize: '11px', opacity: 0.85 }}>✓ Active</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '16px', fontSize: '12px', opacity: 0.45, lineHeight: 1.6, fontFamily: uiFont }}>
              Theme changes apply instantly. Fine-tune accent colours in the Colours tab.
            </div>
          </div>
        )}

        {/* COLOURS */}
        {activeTab === 'colors' && (
          <div>
            {/* ── Save Settings as Custom Theme ─────────────────────── */}
            <div style={{ marginBottom: '20px' }}>
              {!showSaveInput ? (
                <button
                  onClick={() => { setShowSaveInput(true); setSaveThemeName(''); setSaveStatus(''); }}
                  style={{
                    padding: '10px 16px', borderRadius: '10px', width: '100%',
                    border: '1px solid var(--terminal-border)',
                    background: 'var(--terminal-surface)',
                    color: 'var(--terminal-text)',
                    fontFamily: uiFont, fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-accent)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-border)'; }}
                >
                  <span style={{ fontSize: '14px' }}>💾</span> Save Settings as Custom Theme
                </button>
              ) : (
                <div style={{
                  padding: '12px', borderRadius: '10px',
                  border: '1px solid var(--terminal-accent)',
                  background: 'var(--terminal-surface)',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '6px',
                      background: bgColorInput, border: '1px solid var(--terminal-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 'bold', color: textColorInput,
                      fontFamily: "'Courier Prime', monospace", flexShrink: 0,
                    }}>Aa</div>
                    <input
                      value={saveThemeName}
                      onChange={e => setSaveThemeName(e.target.value)}
                      placeholder="Theme name…"
                      autoFocus
                      maxLength={30}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && saveThemeName.trim()) {
                          const newTheme: CustomTheme = { name: saveThemeName.trim(), text: textColorInput, bg: bgColorInput };
                          const updated = [...customThemes, newTheme];
                          setCustomThemes(updated);
                          saveCustomThemes(updated);
                          setSaveStatus('Saved!');
                          setShowSaveInput(false);
                          setTimeout(() => setSaveStatus(''), 2000);
                        } else if (e.key === 'Escape') {
                          setShowSaveInput(false);
                        }
                        e.stopPropagation();
                      }}
                      style={{
                        flex: 1, background: 'var(--terminal-bg)',
                        border: '1px solid var(--terminal-border)', borderRadius: '8px',
                        color: 'var(--terminal-text)', padding: '7px 12px',
                        fontFamily: uiFont, fontSize: '13px', outline: 'none',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--terminal-accent)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--terminal-border)'; }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        if (!saveThemeName.trim()) return;
                        const newTheme: CustomTheme = { name: saveThemeName.trim(), text: textColorInput, bg: bgColorInput };
                        const updated = [...customThemes, newTheme];
                        setCustomThemes(updated);
                        saveCustomThemes(updated);
                        setSaveStatus('Saved!');
                        setShowSaveInput(false);
                        setTimeout(() => setSaveStatus(''), 2000);
                      }}
                      disabled={!saveThemeName.trim()}
                      style={{
                        padding: '7px 16px', borderRadius: '8px',
                        border: '1px solid var(--terminal-accent)',
                        background: 'var(--terminal-accent)',
                        color: 'var(--terminal-bg)',
                        fontFamily: uiFont, fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        opacity: saveThemeName.trim() ? 1 : 0.4,
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowSaveInput(false)}
                      style={{
                        padding: '7px 16px', borderRadius: '8px',
                        border: '1px solid var(--terminal-border)',
                        background: 'transparent',
                        color: 'var(--terminal-text)',
                        fontFamily: uiFont, fontSize: '12px', cursor: 'pointer',
                        opacity: 0.7,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {saveStatus && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--terminal-accent)', fontFamily: uiFont }}>
                  ✓ {saveStatus}
                </div>
              )}
            </div>

            {/* Live Preview */}
            <div style={{
              border: '1px solid var(--terminal-border)', padding: '18px', marginBottom: '24px',
              background: bgColorInput, color: textColorInput, textAlign: 'center',
              fontFamily: "'Courier Prime', monospace", borderRadius: '12px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>
              <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: uiFont }}>Live Preview</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold' }}>The quick brown fox</div>
              <div style={{ fontSize: '14px', marginTop: '4px', opacity: 0.75 }}>jumps over the lazy dog</div>
            </div>

            {/* Text Color */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', opacity: 0.55, marginBottom: '10px', fontFamily: uiFont, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Text Colour</div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--terminal-border)', background: textColorInput, flexShrink: 0 }} />
                <input
                  value={textColorInput}
                  onChange={e => { setTextColorInput(e.target.value.toUpperCase()); setSelectedTextIdx(-1); setSelectedComboIdx(-1); }}
                  maxLength={7}
                  placeholder="#33FF33"
                  tabIndex={-1}
                  style={{
                    flex: 1, maxWidth: '160px', background: 'var(--terminal-surface)',
                    border: '1px solid var(--terminal-border)', borderRadius: '8px',
                    color: 'var(--terminal-text)', padding: '7px 12px',
                    fontFamily: "'Courier Prime', monospace", fontSize: '13px',
                    textTransform: 'uppercase', outline: 'none',
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
                        width: '30px', height: '30px', borderRadius: '6px', background: color,
                        border: (focused || selectedTextIdx === i) ? '3px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
                        cursor: 'pointer', position: 'relative',
                        boxShadow: focused ? '0 0 0 2px var(--terminal-glow)' : 'none',
                        transition: 'all 0.1s',
                      }}
                    >
                      {selectedTextIdx === i && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: color === '#ffffff' || color === '#ffff00' || color === '#e6e6e6' ? '#000' : '#fff' }}>✓</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BG Color */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', opacity: 0.55, marginBottom: '10px', fontFamily: uiFont, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Background Colour</div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--terminal-border)', background: bgColorInput, flexShrink: 0 }} />
                <input
                  value={bgColorInput}
                  onChange={e => { setBgColorInput(e.target.value.toUpperCase()); setSelectedBgIdx(-1); setSelectedComboIdx(-1); }}
                  maxLength={7}
                  placeholder="#000000"
                  tabIndex={-1}
                  style={{
                    flex: 1, maxWidth: '160px', background: 'var(--terminal-surface)',
                    border: '1px solid var(--terminal-border)', borderRadius: '8px',
                    color: 'var(--terminal-text)', padding: '7px 12px',
                    fontFamily: "'Courier Prime', monospace", fontSize: '13px',
                    textTransform: 'uppercase', outline: 'none',
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
                        width: '30px', height: '30px', borderRadius: '6px', background: color,
                        border: (focused || selectedBgIdx === i) ? `3px solid var(--terminal-accent)` : `1px solid ${color === '#ffffff' || color === '#f5f5f5' ? '#ccc' : 'var(--terminal-border)'}`,
                        cursor: 'pointer', position: 'relative',
                        boxShadow: focused ? '0 0 0 2px var(--terminal-glow)' : 'none',
                        transition: 'all 0.1s',
                      }}
                    >
                      {selectedBgIdx === i && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: color === '#000000' || color === '#0a0a0a' || color === '#1a1a1a' ? '#fff' : '#000' }}>✓</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Combos */}
            <div style={{ paddingTop: '20px', borderTop: '1px solid var(--terminal-border)', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', opacity: 0.55, marginBottom: '14px', fontFamily: uiFont, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Colour Combinations</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {COLOR_COMBOS.map((combo, i) => {
                  const focused = isComboFocused(i);
                  const sel = selectedComboIdx === i;
                  return (
                    <div
                      key={combo.name}
                      onClick={() => {
                        setTextColorInput(combo.text.toUpperCase()); setBgColorInput(combo.bg.toUpperCase());
                        setSelectedComboIdx(i); setSelectedTextIdx(-1); setSelectedBgIdx(-1);
                        setFocusedItemIdx(TEXT_PRESETS.length + BG_PRESETS.length + i);
                      }}
                      style={{
                        border: (focused || sel) ? '2px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
                        borderRadius: '10px', overflow: 'hidden',
                        cursor: 'pointer', position: 'relative',
                        boxShadow: focused ? '0 0 0 2px var(--terminal-glow)' : '0 1px 3px rgba(0,0,0,0.06)',
                        transition: 'all 0.1s',
                      }}
                    >
                      {sel && <div style={{ position: 'absolute', top: '6px', right: '8px', fontSize: '11px', color: 'var(--terminal-accent)', fontWeight: 'bold' }}>✓</div>}
                      <div style={{
                        background: combo.bg, color: combo.text, padding: '10px 10px 6px',
                        fontWeight: 'bold', fontSize: '20px',
                        fontFamily: "'Courier Prime', monospace",
                      }}>Aa</div>
                      <div style={{ padding: '6px 10px', fontSize: '11px', fontFamily: uiFont, opacity: 0.8, background: 'var(--terminal-surface)', borderTop: '1px solid var(--terminal-border)' }}>{combo.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', paddingBottom: '8px' }}>
              <button
                onClick={handleApplyColors}
                style={{
                  padding: '9px 20px', borderRadius: '8px',
                  border: applyFocused ? '2px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
                  background: applyFocused ? 'var(--terminal-accent)' : 'var(--terminal-surface)',
                  color: applyFocused ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  fontFamily: uiFont, fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Apply Colours
              </button>
              <button
                onClick={() => { onResetColors(); setTextColorInput('#33FF33'); setBgColorInput('#000000'); setSelectedTextIdx(-1); setSelectedBgIdx(-1); setSelectedComboIdx(-1); }}
                style={{
                  padding: '9px 20px', borderRadius: '8px',
                  border: resetFocused ? '2px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
                  background: resetFocused ? 'var(--terminal-accent)' : 'transparent',
                  color: resetFocused ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  fontFamily: uiFont, fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                  opacity: resetFocused ? 1 : 0.7,
                  transition: 'all 0.15s',
                }}
              >
                Reset
              </button>
            </div>


            {/* ── Custom Themes ──────────────────────────────────────────── */}
            {customThemes.length > 0 && (
              <div style={{ paddingTop: '20px', borderTop: '1px solid var(--terminal-border)', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', opacity: 0.55, marginBottom: '14px', fontFamily: uiFont, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Your Custom Themes
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                  {customThemes.map((ct, i) => {
                    const isSelected = textColorInput === ct.text.toUpperCase() && bgColorInput === ct.bg.toUpperCase();
                    return (
                      <div
                        key={`custom-${i}-${ct.name}`}
                        style={{
                          border: isSelected ? '2px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
                          borderRadius: '10px', overflow: 'hidden',
                          cursor: 'pointer', position: 'relative',
                          boxShadow: isSelected ? '0 0 0 2px var(--terminal-glow)' : '0 1px 3px rgba(0,0,0,0.06)',
                          transition: 'all 0.1s',
                        }}
                      >
                        <div
                          onClick={() => {
                            setTextColorInput(ct.text.toUpperCase());
                            setBgColorInput(ct.bg.toUpperCase());
                            setSelectedComboIdx(-1); setSelectedTextIdx(-1); setSelectedBgIdx(-1);
                          }}
                          style={{
                            background: ct.bg, color: ct.text, padding: '10px 10px 6px',
                            fontWeight: 'bold', fontSize: '20px',
                            fontFamily: "'Courier Prime', monospace",
                          }}
                        >Aa</div>
                        <div style={{
                          padding: '6px 10px', fontSize: '11px', fontFamily: uiFont,
                          background: isSelected ? 'var(--terminal-accent)' : 'var(--terminal-surface)',
                          color: isSelected ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                          borderTop: '1px solid var(--terminal-border)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <span
                            onClick={() => {
                              setTextColorInput(ct.text.toUpperCase());
                              setBgColorInput(ct.bg.toUpperCase());
                              setSelectedComboIdx(-1); setSelectedTextIdx(-1); setSelectedBgIdx(-1);
                            }}
                            style={{ opacity: 0.8, flex: 1, cursor: 'pointer' }}
                          >{ct.name}</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = customThemes.filter((_, idx) => idx !== i);
                              setCustomThemes(updated);
                              saveCustomThemes(updated);
                            }}
                            title="Delete theme"
                            style={{
                              cursor: 'pointer', opacity: 0.4, fontSize: '12px',
                              transition: 'opacity 0.15s', padding: '0 2px',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.4'; }}
                          >✕</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACCESSIBILITY */}
        {activeTab === 'accessibility' && (
          <AccessibilitySection
            settings={a11ySettings}
            onUpdate={onA11yUpdate}
            onReset={onA11yReset}
          />
        )}

        {/* LANGUAGE */}
        {activeTab === 'language' && (
          <div>
            <div style={{ fontSize: '15px', marginBottom: '20px', fontWeight: '600', fontFamily: uiFont, opacity: 0.8 }}>
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
                style={rowCard(focusedItemIdx === i, language === lang.code)}
              >
                <span>{lang.label}</span>
                {language === lang.code && <span style={{ fontSize: '12px', opacity: 0.7 }}>✓ Active</span>}
              </div>
            ))}
          </div>
        )}

        {/* SECURITY */}
        {activeTab === 'security' && (
          <div>
            <div style={{ fontSize: '15px', marginBottom: '20px', fontWeight: '600', fontFamily: uiFont, opacity: 0.8 }}>🔒 PIN Lock</div>
            <div style={rowCard(focusedItemIdx === 0)} onClick={onOpenPinSetup}>
              <span>{pinConfig.enabled ? `Change PIN (${pinConfig.length}-digit enabled)` : 'Set Up PIN'}</span>
              <span style={{ fontSize: '12px', opacity: 0.45 }}>Enter →</span>
            </div>
          </div>
        )}

        {/* STORAGE */}
        {activeTab === 'storage' && (
          <div>
            <div style={{ fontSize: '15px', marginBottom: '20px', fontWeight: '600', fontFamily: uiFont, opacity: 0.8 }}>💾 Storage Providers</div>

            <div onClick={() => { onAction('local'); setFocusedItemIdx(0); }} style={rowCard(focusedItemIdx === 0)}>
              <span>{t(language, 'storage.local')}</span>
              <span style={{ fontSize: '11px', opacity: 0.5, fontWeight: '600' }}>✓ Always Available</span>
            </div>
            <div onClick={() => { onAction('usb'); setFocusedItemIdx(1); }} style={rowCard(focusedItemIdx === 1)}>
              <span>{t(language, 'storage.usb')}</span>
            </div>

            <div style={{ fontSize: '12px', opacity: 0.45, marginTop: '24px', marginBottom: '12px', fontFamily: uiFont, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Cloud Providers
            </div>

            <div
              onClick={() => { onAction('gdrive'); setFocusedItemIdx(2); }}
              style={rowCard(focusedItemIdx === 2)}
            >
              <span>☁ Google Drive</span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: connectedProviders.google ? 'var(--terminal-accent)' : '#e05c5c' }}>
                {connectedProviders.google ? '✓ Connected' : '✕ Not linked'}
              </span>
            </div>

            <div style={{ marginTop: '20px', padding: '14px 16px', border: '1px solid var(--terminal-border)', borderRadius: '10px', fontSize: '12px', opacity: 0.6, lineHeight: 1.65, fontFamily: uiFont, background: 'var(--terminal-surface)' }}>
              Connect cloud accounts to sync files across devices. Each provider opens its own sign-in flow.
            </div>
          </div>
        )}

        {/* SYSTEM */}
        {activeTab === 'system' && (
          <div>
            <div style={{ fontSize: '15px', marginBottom: '20px', fontWeight: '600', fontFamily: uiFont, opacity: 0.8 }}>⚙ System</div>
            <div onClick={() => { onOpenTypingChallenge(); setFocusedItemIdx(0); }} style={rowCard(focusedItemIdx === 0)}>
              <span>⌨ Typing Challenge</span>
              <span style={{ fontSize: '12px', opacity: 0.45 }}>Enter →</span>
            </div>
            <div onClick={() => { onAction('update'); setFocusedItemIdx(1); }} style={rowCard(focusedItemIdx === 1)}>
              <span>{t(language, 'power.update')}</span>
            </div>
            <div
              onClick={() => { onAction('shutdown'); setFocusedItemIdx(2); }}
              style={rowCard(focusedItemIdx === 2, false, true)}
            >
              <span>{t(language, 'power.shutdown')}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: '8px 24px',
        borderTop: '1px solid var(--terminal-border)',
        fontSize: '11px',
        opacity: 0.35,
        textAlign: 'center',
        flexShrink: 0,
        fontFamily: uiFont,
        letterSpacing: '0.03em',
        background: 'var(--terminal-surface)',
      }}>
        Tab — switch section · ↑↓ navigate · Enter select · Esc close
      </div>
    </div>
  );
}
