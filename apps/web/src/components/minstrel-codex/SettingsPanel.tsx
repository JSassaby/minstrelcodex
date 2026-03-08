import { useState, useEffect, useCallback } from 'react';
import { t, LANGUAGES_LIST } from '@/lib/languages';
import { ThemeMode, THEMES } from '@/lib/themes';
import type { AppColors, Language, PinConfig } from '@minstrelcodex/core';
import AccessibilitySection from './AccessibilitySection';
import type { AccessibilitySettings } from '@/hooks/useAccessibility';
import { X, ChevronDown, Check, Palette, Globe, Shield, HardDrive, Cpu, Eye, Keyboard } from 'lucide-react';

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
  onOpenFirstBootWizard?: () => void;
}

type SettingsTab = 'appearance' | 'colors' | 'language' | 'accessibility' | 'security' | 'storage' | 'system';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance',     label: 'Theme',    icon: <Eye size={14} strokeWidth={1.6} /> },
  { id: 'colors',         label: 'Colours',  icon: <Palette size={14} strokeWidth={1.6} /> },
  { id: 'accessibility',  label: 'Access',   icon: <Keyboard size={14} strokeWidth={1.6} /> },
  { id: 'language',       label: 'Language',  icon: <Globe size={14} strokeWidth={1.6} /> },
  { id: 'security',       label: 'Security',  icon: <Shield size={14} strokeWidth={1.6} /> },
  { id: 'storage',        label: 'Storage',   icon: <HardDrive size={14} strokeWidth={1.6} /> },
  { id: 'system',         label: 'System',    icon: <Cpu size={14} strokeWidth={1.6} /> },
];

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

// ── Reusable dropdown select ──────────────────────────────────────
function DropdownSelect<T extends string>({
  value,
  options,
  onChange,
  renderOption,
}: {
  value: T;
  options: { value: T; label: string; sublabel?: string }[];
  onChange: (val: T) => void;
  renderOption?: (opt: { value: T; label: string; sublabel?: string }, active: boolean) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '10px',
          border: open ? '1px solid var(--terminal-accent)' : '1px solid rgba(0, 212, 200, 0.12)',
          background: 'rgba(0, 212, 200, 0.04)',
          color: 'var(--terminal-text)',
          fontFamily: uiFont,
          fontSize: '13px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s',
        }}
      >
        <span>{selected?.label || 'Select...'}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.8}
          style={{
            opacity: 0.5,
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          zIndex: 100,
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#080e1e',
          border: '1px solid rgba(0, 212, 200, 0.12)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
          padding: '4px',
          maxHeight: '240px',
          overflowY: 'auto',
        }}>
          {options.map(opt => {
            const active = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  background: active ? 'rgba(0, 212, 200, 0.12)' : 'transparent',
                  color: active ? 'var(--terminal-accent)' : 'var(--terminal-text)',
                  transition: 'all 0.15s',
                  fontSize: '13px',
                  fontFamily: uiFont,
                  fontWeight: active ? '600' : '400',
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.background = 'rgba(0, 212, 200, 0.06)';
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                {renderOption ? renderOption(opt, active) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>{opt.label}</span>
                    {opt.sublabel && <span style={{ fontSize: '11px', opacity: 0.45 }}>{opt.sublabel}</span>}
                  </div>
                )}
                {active && <Check size={14} strokeWidth={2} style={{ opacity: 0.8, flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Need useRef for DropdownSelect
import { useRef } from 'react';

export default function SettingsPanel({
  visible, language, colors, wifiOn, bluetoothOn, pinConfig, themeMode,
  a11ySettings, onA11yUpdate, onA11yReset,
  onClose, onAction, onUpdateColors, onResetColors, onSetLanguage,
  onOpenPinSetup, onOpenTypingChallenge, onConnectGoogle, onConnectApple,
  onSwitchTheme, onOpenFirstBootWizard,
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

  const [connectedProviders, setConnectedProviders] = useState(() => ({
    google: !!localStorage.getItem('pw-google-token'),
    apple: false,
  }));

  useEffect(() => {
    if (!visible) return;
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
      case 'system': return 4;
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

  // ── Section label ─────────────────────────────────────────────
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      fontSize: '10px',
      fontWeight: '700',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      opacity: 0.35,
      marginBottom: '12px',
      fontFamily: uiFont,
    }}>
      {children}
    </div>
  );

  // ── Glass card item ──────────────────────────────────────────
  const GlassCard = ({
    focused, selected, danger, onClick, children, style: extraStyle,
  }: {
    focused?: boolean; selected?: boolean; danger?: boolean;
    onClick?: () => void; children: React.ReactNode; style?: React.CSSProperties;
  }) => (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        marginBottom: '6px',
        borderRadius: '12px',
        border: selected
          ? '1px solid var(--terminal-accent)'
          : '1px solid rgba(0, 212, 200, 0.08)',
        cursor: 'pointer',
        background: focused
          ? 'linear-gradient(135deg, rgba(0, 212, 200, 0.15), rgba(0, 212, 200, 0.06))'
          : selected
            ? 'rgba(0, 212, 200, 0.06)'
            : 'rgba(0, 212, 200, 0.02)',
        color: focused ? 'var(--terminal-accent)' : danger ? '#e05c5c' : 'var(--terminal-text)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.2s ease',
        fontFamily: uiFont,
        fontSize: '13px',
        fontWeight: selected ? '600' : '400',
        backdropFilter: 'blur(8px)',
        ...extraStyle,
      }}
    >
      {children}
    </div>
  );

  // ── Glass button ──────────────────────────────────────────────
  const GlassButton = ({
    primary, onClick, children,
  }: {
    primary?: boolean; onClick?: () => void; children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      style={{
        padding: '9px 20px',
        borderRadius: '10px',
        border: primary ? '1px solid var(--terminal-accent)' : '1px solid rgba(0, 212, 200, 0.12)',
        background: primary
          ? 'linear-gradient(135deg, rgba(0, 212, 200, 0.2), rgba(0, 212, 200, 0.08))'
          : 'rgba(0, 212, 200, 0.04)',
        color: primary ? 'var(--terminal-accent)' : 'var(--terminal-text)',
        fontFamily: uiFont,
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </button>
  );

  const isTextSwatchFocused = (i: number) => activeTab === 'colors' && focusedItemIdx === i;
  const isBgSwatchFocused = (i: number) => activeTab === 'colors' && focusedItemIdx === TEXT_PRESETS.length + i;
  const isComboFocused = (i: number) => activeTab === 'colors' && focusedItemIdx === TEXT_PRESETS.length + BG_PRESETS.length + i;

  return (
    <div
      style={{
        width: '360px',
        minWidth: '360px',
        height: '100%',
        background: 'rgba(6, 11, 24, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(0, 212, 200, 0.08)',
        color: 'var(--terminal-text)',
        fontFamily: uiFont,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(0, 212, 200, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: '700',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontFamily: uiFont,
          opacity: 0.7,
        }}>
          Settings
        </span>
        <button
          onClick={onClose}
          title="Esc to close"
          style={{
            background: 'rgba(0, 212, 200, 0.06)',
            border: '1px solid rgba(0, 212, 200, 0.1)',
            borderRadius: '8px',
            color: 'var(--terminal-text)',
            opacity: 0.5,
            cursor: 'pointer',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.borderColor = 'var(--terminal-accent)';
            e.currentTarget.style.background = 'rgba(0, 212, 200, 0.12)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = '0.5';
            e.currentTarget.style.borderColor = 'rgba(0, 212, 200, 0.1)';
            e.currentTarget.style.background = 'rgba(0, 212, 200, 0.06)';
          }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: '2px',
        padding: '8px 10px',
        borderBottom: '1px solid rgba(0, 212, 200, 0.06)',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {TABS.map((tab, i) => {
          const active = i === activeTabIdx;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabIdx(i)}
              style={{
                padding: '7px 8px',
                borderRadius: '8px',
                border: 'none',
                background: active ? 'rgba(0, 212, 200, 0.12)' : 'transparent',
                color: active ? 'var(--terminal-accent)' : 'var(--terminal-text)',
                fontSize: '10px',
                fontFamily: uiFont,
                fontWeight: active ? '700' : '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                opacity: active ? 1 : 0.45,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                minWidth: '42px',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.opacity = '0.45'; }}
            >
              {tab.icon}
              <span style={{ letterSpacing: '0.04em' }}>{tab.label}</span>
              {active && (
                <div style={{
                  position: 'absolute',
                  bottom: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '16px',
                  height: '2px',
                  borderRadius: '1px',
                  background: 'var(--terminal-accent)',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 18px', width: '100%', boxSizing: 'border-box' }}>

        {/* APPEARANCE */}
        {activeTab === 'appearance' && (
          <div>
            <SectionLabel>Visual Environment</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                        ? '1px solid var(--terminal-accent)'
                        : '1px solid rgba(0, 212, 200, 0.06)',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      transition: 'all 0.25s',
                      background: isActive
                        ? 'rgba(0, 212, 200, 0.06)'
                        : 'rgba(0, 212, 200, 0.02)',
                    }}
                  >
                    {/* Preview strip */}
                    <div style={{
                      background: themeDef.preview.bg,
                      color: themeDef.preview.fg,
                      padding: '16px',
                      fontFamily: themeDef.fonts.body,
                      fontSize: '13px',
                      lineHeight: 1.5,
                      textShadow: themeDef.effects.textGlow ? `0 0 8px ${themeDef.colors.glow}` : 'none',
                    }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{themeDef.preview.sampleText}</div>
                      <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '3px' }}>jumps over the lazy dog.</div>
                    </div>
                    {/* Label */}
                    <div style={{
                      padding: '10px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: '12px',
                      fontFamily: uiFont,
                      fontWeight: '600',
                      color: isActive ? 'var(--terminal-accent)' : 'var(--terminal-text)',
                      opacity: isActive ? 1 : 0.7,
                    }}>
                      <div>
                        <div>{themeDef.label}</div>
                        <div style={{ fontSize: '10px', fontWeight: '400', opacity: 0.5, marginTop: '2px' }}>
                          {themeDef.description}
                        </div>
                      </div>
                      {isActive && <Check size={14} strokeWidth={2.5} style={{ color: 'var(--terminal-accent)' }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COLOURS */}
        {activeTab === 'colors' && (
          <div>
            {/* Save as custom theme */}
            <div style={{ marginBottom: '20px' }}>
              {!showSaveInput ? (
                <GlassButton primary onClick={() => { setShowSaveInput(true); setSaveThemeName(''); setSaveStatus(''); }}>
                  💾 Save as Custom Theme
                </GlassButton>
              ) : (
                <div style={{
                  padding: '14px', borderRadius: '12px',
                  border: '1px solid rgba(0, 212, 200, 0.15)',
                  background: 'rgba(0, 212, 200, 0.04)',
                  display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: bgColorInput, border: '1px solid rgba(0, 212, 200, 0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 'bold', color: textColorInput,
                      fontFamily: "'JetBrains Mono', monospace", flexShrink: 0,
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
                        } else if (e.key === 'Escape') setShowSaveInput(false);
                        e.stopPropagation();
                      }}
                      style={{
                        flex: 1, background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 212, 200, 0.12)', borderRadius: '8px',
                        color: 'var(--terminal-text)', padding: '8px 12px',
                        fontFamily: uiFont, fontSize: '13px', outline: 'none',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--terminal-accent)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0, 212, 200, 0.12)'; }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <GlassButton primary onClick={() => {
                      if (!saveThemeName.trim()) return;
                      const newTheme: CustomTheme = { name: saveThemeName.trim(), text: textColorInput, bg: bgColorInput };
                      const updated = [...customThemes, newTheme];
                      setCustomThemes(updated);
                      saveCustomThemes(updated);
                      setSaveStatus('Saved!');
                      setShowSaveInput(false);
                      setTimeout(() => setSaveStatus(''), 2000);
                    }}>Save</GlassButton>
                    <GlassButton onClick={() => setShowSaveInput(false)}>Cancel</GlassButton>
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
              border: '1px solid rgba(0, 212, 200, 0.1)', padding: '20px', marginBottom: '24px',
              background: bgColorInput, color: textColorInput, textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace", borderRadius: '14px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            }}>
              <div style={{ fontSize: '10px', opacity: 0.4, marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: uiFont }}>Preview</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold' }}>The quick brown fox</div>
              <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.65 }}>jumps over the lazy dog</div>
            </div>

            {/* Text Color */}
            <div style={{ marginBottom: '24px' }}>
              <SectionLabel>Text Colour</SectionLabel>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid rgba(0, 212, 200, 0.12)', background: textColorInput, flexShrink: 0 }} />
                <input
                  value={textColorInput}
                  onChange={e => { setTextColorInput(e.target.value.toUpperCase()); setSelectedTextIdx(-1); setSelectedComboIdx(-1); }}
                  maxLength={7} placeholder="#33FF33" tabIndex={-1}
                  style={{
                    flex: 1, maxWidth: '140px', background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 212, 200, 0.1)', borderRadius: '8px',
                    color: 'var(--terminal-text)', padding: '7px 12px',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '12px',
                    textTransform: 'uppercase', outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {TEXT_PRESETS.map((color, i) => (
                  <div
                    key={color}
                    onClick={() => { setTextColorInput(color.toUpperCase()); setSelectedTextIdx(i); setSelectedComboIdx(-1); setFocusedItemIdx(i); }}
                    style={{
                      width: '28px', height: '28px', borderRadius: '8px', background: color,
                      border: (isTextSwatchFocused(i) || selectedTextIdx === i) ? '2px solid var(--terminal-accent)' : '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      boxShadow: isTextSwatchFocused(i) ? '0 0 12px rgba(0, 212, 200, 0.3)' : 'none',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {selectedTextIdx === i && <Check size={12} strokeWidth={3} color={color === '#ffffff' || color === '#ffff00' || color === '#e6e6e6' ? '#000' : '#fff'} />}
                  </div>
                ))}
              </div>
            </div>

            {/* BG Color */}
            <div style={{ marginBottom: '24px' }}>
              <SectionLabel>Background Colour</SectionLabel>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid rgba(0, 212, 200, 0.12)', background: bgColorInput, flexShrink: 0 }} />
                <input
                  value={bgColorInput}
                  onChange={e => { setBgColorInput(e.target.value.toUpperCase()); setSelectedBgIdx(-1); setSelectedComboIdx(-1); }}
                  maxLength={7} placeholder="#000000" tabIndex={-1}
                  style={{
                    flex: 1, maxWidth: '140px', background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 212, 200, 0.1)', borderRadius: '8px',
                    color: 'var(--terminal-text)', padding: '7px 12px',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '12px',
                    textTransform: 'uppercase', outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {BG_PRESETS.map((color, i) => (
                  <div
                    key={color}
                    onClick={() => { setBgColorInput(color.toUpperCase()); setSelectedBgIdx(i); setSelectedComboIdx(-1); setFocusedItemIdx(TEXT_PRESETS.length + i); }}
                    style={{
                      width: '28px', height: '28px', borderRadius: '8px', background: color,
                      border: (isBgSwatchFocused(i) || selectedBgIdx === i) ? '2px solid var(--terminal-accent)' : `1px solid ${color === '#ffffff' || color === '#f5f5f5' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)'}`,
                      cursor: 'pointer',
                      boxShadow: isBgSwatchFocused(i) ? '0 0 12px rgba(0, 212, 200, 0.3)' : 'none',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {selectedBgIdx === i && <Check size={12} strokeWidth={3} color={color === '#000000' || color === '#0a0a0a' || color === '#1a1a1a' || color === '#2c2c2c' ? '#fff' : '#000'} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Combos */}
            <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(0, 212, 200, 0.06)', marginBottom: '20px' }}>
              <SectionLabel>Colour Combinations</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
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
                        border: (focused || sel) ? '1px solid var(--terminal-accent)' : '1px solid rgba(0, 212, 200, 0.06)',
                        borderRadius: '10px', overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: focused ? '0 0 16px rgba(0, 212, 200, 0.2)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        background: combo.bg, color: combo.text, padding: '10px 8px 6px',
                        fontWeight: 'bold', fontSize: '18px', textAlign: 'center',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>Aa</div>
                      <div style={{
                        padding: '5px 8px', fontSize: '9px', fontFamily: uiFont,
                        opacity: 0.6, textAlign: 'center',
                        background: 'rgba(0, 212, 200, 0.03)',
                        letterSpacing: '0.02em',
                      }}>{combo.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', paddingBottom: '8px' }}>
              <GlassButton primary onClick={handleApplyColors}>Apply Colours</GlassButton>
              <GlassButton onClick={() => {
                onResetColors();
                setTextColorInput('#33FF33'); setBgColorInput('#000000');
                setSelectedTextIdx(-1); setSelectedBgIdx(-1); setSelectedComboIdx(-1);
              }}>Reset</GlassButton>
            </div>

            {/* Custom Themes */}
            {customThemes.length > 0 && (
              <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(0, 212, 200, 0.06)', marginBottom: '20px' }}>
                <SectionLabel>Your Custom Themes</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {customThemes.map((ct, i) => {
                    const isSelected = textColorInput === ct.text.toUpperCase() && bgColorInput === ct.bg.toUpperCase();
                    return (
                      <div
                        key={`custom-${i}-${ct.name}`}
                        style={{
                          border: isSelected ? '1px solid var(--terminal-accent)' : '1px solid rgba(0, 212, 200, 0.06)',
                          borderRadius: '10px', overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div
                          onClick={() => {
                            setTextColorInput(ct.text.toUpperCase());
                            setBgColorInput(ct.bg.toUpperCase());
                            setSelectedComboIdx(-1); setSelectedTextIdx(-1); setSelectedBgIdx(-1);
                          }}
                          style={{
                            background: ct.bg, color: ct.text, padding: '10px 8px 6px',
                            fontWeight: 'bold', fontSize: '18px', textAlign: 'center',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >Aa</div>
                        <div style={{
                          padding: '5px 8px', fontSize: '9px', fontFamily: uiFont,
                          background: 'rgba(0, 212, 200, 0.03)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <span
                            onClick={() => {
                              setTextColorInput(ct.text.toUpperCase());
                              setBgColorInput(ct.bg.toUpperCase());
                              setSelectedComboIdx(-1); setSelectedTextIdx(-1); setSelectedBgIdx(-1);
                            }}
                            style={{ opacity: 0.6, flex: 1, cursor: 'pointer' }}
                          >{ct.name}</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = customThemes.filter((_, idx) => idx !== i);
                              setCustomThemes(updated);
                              saveCustomThemes(updated);
                            }}
                            title="Delete"
                            style={{ cursor: 'pointer', opacity: 0.3, fontSize: '11px', transition: 'opacity 0.15s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.3'; }}
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
            <SectionLabel>Interface Language</SectionLabel>
            <DropdownSelect
              value={language}
              options={LANGUAGES_LIST.map(lang => ({
                value: lang.code as Language,
                label: lang.name,
              }))}
              onChange={(val) => onSetLanguage(val)}
            />
            <div style={{
              marginTop: '20px', padding: '14px 16px',
              border: '1px solid rgba(0, 212, 200, 0.06)',
              borderRadius: '12px', fontSize: '12px', opacity: 0.4,
              lineHeight: 1.7, fontFamily: uiFont,
              background: 'rgba(0, 212, 200, 0.02)',
            }}>
              Language affects spell check and UI labels. Additional dictionaries can be installed via Settings &gt; Access.
            </div>
          </div>
        )}

        {/* SECURITY */}
        {activeTab === 'security' && (
          <div>
            <SectionLabel>PIN Lock</SectionLabel>
            <GlassCard focused={focusedItemIdx === 0} onClick={onOpenPinSetup}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={14} strokeWidth={1.6} style={{ opacity: 0.6 }} />
                {pinConfig.enabled ? `Change PIN (${pinConfig.length}-digit)` : 'Set Up PIN'}
              </span>
              <ChevronDown size={14} style={{ opacity: 0.3, transform: 'rotate(-90deg)' }} />
            </GlassCard>
          </div>
        )}

        {/* STORAGE */}
        {activeTab === 'storage' && (
          <div>
            <SectionLabel>Storage Providers</SectionLabel>

            <GlassCard selected onClick={() => { onAction('local'); setFocusedItemIdx(0); }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HardDrive size={14} strokeWidth={1.6} style={{ opacity: 0.6 }} />
                {t(language, 'storage.local')}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--terminal-accent)', fontWeight: '600' }}>✓ Active</span>
            </GlassCard>

            <div style={{ height: '16px' }} />
            <SectionLabel>Cloud Providers</SectionLabel>

            <GlassCard focused={focusedItemIdx === 1} onClick={() => { onAction('gdrive'); setFocusedItemIdx(1); }}>
              <span>☁ Google Drive</span>
              <span style={{
                fontSize: '10px', fontWeight: '700',
                color: connectedProviders.google ? 'var(--terminal-accent)' : '#e05c5c',
              }}>
                {connectedProviders.google ? '✓ Connected' : '✕ Not linked'}
              </span>
            </GlassCard>
          </div>
        )}

        {/* SYSTEM */}
        {activeTab === 'system' && (
          <div>
            <SectionLabel>Tools & Actions</SectionLabel>
            <GlassCard focused={focusedItemIdx === 0} onClick={() => { onOpenTypingChallenge(); setFocusedItemIdx(0); }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Keyboard size={14} strokeWidth={1.6} style={{ opacity: 0.6 }} />
                Typing Challenge
              </span>
              <ChevronDown size={14} style={{ opacity: 0.3, transform: 'rotate(-90deg)' }} />
            </GlassCard>
            {onOpenFirstBootWizard && (
              <GlassCard focused={focusedItemIdx === 1} onClick={() => { onOpenFirstBootWizard!(); setFocusedItemIdx(1); }}>
                <span>📖 New Novel Project…</span>
                <ChevronDown size={14} style={{ opacity: 0.3, transform: 'rotate(-90deg)' }} />
              </GlassCard>
            )}

            <div style={{ height: '16px' }} />
            <SectionLabel>Maintenance</SectionLabel>
            <GlassCard focused={focusedItemIdx === 2} onClick={() => { onAction('update'); setFocusedItemIdx(2); }}>
              <span>{t(language, 'power.update')}</span>
            </GlassCard>
            <GlassCard focused={focusedItemIdx === 3} danger onClick={() => { onAction('shutdown'); setFocusedItemIdx(3); }}>
              <span>{t(language, 'power.shutdown')}</span>
            </GlassCard>
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div style={{
        padding: '8px 18px',
        borderTop: '1px solid rgba(0, 212, 200, 0.06)',
        fontSize: '9px',
        opacity: 0.25,
        textAlign: 'center',
        flexShrink: 0,
        fontFamily: uiFont,
        letterSpacing: '0.06em',
      }}>
        Tab — switch · ↑↓ navigate · Enter select · Esc close
      </div>
    </div>
  );
}
