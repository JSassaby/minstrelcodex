import { useState, useEffect, useRef, useCallback } from 'react';
import type { AccessibilitySettings } from '@/hooks/useAccessibility';

interface AccessibilitySectionProps {
  settings: AccessibilitySettings;
  onUpdate: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void;
  onReset: () => void;
}

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

// ── Reusable slider ──────────────────────────────────────────────────────
function A11ySlider({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', fontFamily: uiFont, opacity: 0.8 }}>{label}</span>
        <span style={{ fontSize: '11px', fontFamily: uiFont, opacity: 0.5 }}>
          {value}{unit || ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--terminal-accent)', cursor: 'pointer' }}
      />
    </div>
  );
}

// ── Reusable toggle ──────────────────────────────────────────────────────
function A11yToggle({
  label, description, checked, onChange,
}: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        padding: '10px 14px', marginBottom: '8px', borderRadius: '10px',
        border: checked ? '1.5px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
        background: checked ? 'var(--terminal-surface)' : 'transparent',
        cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'all 0.15s',
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontFamily: uiFont, fontWeight: checked ? 600 : 400, color: 'var(--terminal-text)' }}>{label}</div>
        {description && <div style={{ fontSize: '10px', fontFamily: uiFont, opacity: 0.45, marginTop: '2px' }}>{description}</div>}
      </div>
      <div style={{
        width: '34px', height: '18px', borderRadius: '10px',
        background: checked ? 'var(--terminal-accent)' : 'var(--terminal-border)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          width: '14px', height: '14px', borderRadius: '50%',
          background: checked ? 'var(--terminal-bg)' : 'var(--terminal-text)',
          position: 'absolute', top: '2px',
          left: checked ? '18px' : '2px',
          transition: 'left 0.2s',
          opacity: checked ? 1 : 0.5,
        }} />
      </div>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────
type SubSection = 'reading' | 'visual' | 'voice';

const SUB_TABS: { id: SubSection; label: string; icon: string }[] = [
  { id: 'reading', label: 'Reading', icon: '📖' },
  { id: 'visual', label: 'Visual', icon: '👁' },
  { id: 'voice', label: 'Voice', icon: '🎤' },
];

const COLOR_FILTERS: { id: AccessibilitySettings['colorFilter']; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'protanopia', label: 'Protanopia (Red-blind)' },
  { id: 'deuteranopia', label: 'Deuteranopia (Green-blind)' },
  { id: 'tritanopia', label: 'Tritanopia (Blue-blind)' },
  { id: 'grayscale', label: 'Grayscale' },
];

export default function AccessibilitySection({ settings, onUpdate, onReset }: AccessibilitySectionProps) {
  const [subTab, setSubTab] = useState<SubSection>('reading');
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<any>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
  }, []);

  // Load TTS voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      setTtsVoices(voices);
    };
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const sectionHeader = (text: string) => (
    <div style={{
      fontSize: '11px', opacity: 0.45, marginBottom: '12px', marginTop: '20px',
      fontFamily: uiFont, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
      borderBottom: '1px solid var(--terminal-border)', paddingBottom: '6px',
    }}>
      {text}
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: '15px', marginBottom: '16px', fontWeight: 600, fontFamily: uiFont, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '8px' }}>
        ♿ Accessibility
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            style={{
              flex: 1, padding: '6px 8px', borderRadius: '8px',
              border: subTab === tab.id ? '1.5px solid var(--terminal-accent)' : '1px solid transparent',
              background: subTab === tab.id ? 'var(--terminal-accent)' : 'transparent',
              color: subTab === tab.id ? 'var(--terminal-bg)' : 'var(--terminal-text)',
              fontFamily: uiFont, fontSize: '11px', fontWeight: subTab === tab.id ? 600 : 400,
              cursor: 'pointer', opacity: subTab === tab.id ? 1 : 0.6,
              transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            }}
          >
            <span style={{ fontSize: '13px' }}>{tab.icon}</span>
            <span style={{ fontSize: '10px' }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* READING TAB */}
      {subTab === 'reading' && (
        <div>
          {sectionHeader('Text Size & Spacing')}

          <A11ySlider
            label="Text Scale"
            value={settings.textScale}
            min={0.8} max={2.5} step={0.1}
            unit="×"
            onChange={v => onUpdate('textScale', v)}
          />

          <A11ySlider
            label="Line Spacing"
            value={settings.lineSpacing}
            min={1.2} max={3} step={0.1}
            onChange={v => onUpdate('lineSpacing', v)}
          />

          <A11ySlider
            label="Letter Spacing"
            value={settings.letterSpacing}
            min={0} max={5} step={0.5}
            unit="px"
            onChange={v => onUpdate('letterSpacing', v)}
          />

          <A11ySlider
            label="Word Spacing"
            value={settings.wordSpacing}
            min={0} max={10} step={1}
            unit="px"
            onChange={v => onUpdate('wordSpacing', v)}
          />

          <A11ySlider
            label="Paragraph Spacing"
            value={settings.paragraphSpacing}
            min={0} max={3} step={0.25}
            unit="em"
            onChange={v => onUpdate('paragraphSpacing', v)}
          />

          {sectionHeader('Font')}

          <A11yToggle
            label="Dyslexia-Friendly Font"
            description="Switch to OpenDyslexic typeface"
            checked={settings.dyslexiaFont}
            onChange={v => onUpdate('dyslexiaFont', v)}
          />

          {sectionHeader('Reading Guide')}

          <A11yToggle
            label="Reading Guide Line"
            description="Horizontal line follows your cursor"
            checked={settings.readingGuide}
            onChange={v => onUpdate('readingGuide', v)}
          />

          {settings.readingGuide && (
            <A11ySlider
              label="Guide Opacity"
              value={settings.readingGuideOpacity}
              min={0.1} max={0.6} step={0.05}
              onChange={v => onUpdate('readingGuideOpacity', v)}
            />
          )}
        </div>
      )}

      {/* VISUAL TAB */}
      {subTab === 'visual' && (
        <div>
          {sectionHeader('Contrast & Motion')}

          <A11yToggle
            label="High Contrast"
            description="Increase text contrast and border visibility"
            checked={settings.highContrast}
            onChange={v => onUpdate('highContrast', v)}
          />

          <A11yToggle
            label="Reduce Motion"
            description="Minimise animations and transitions"
            checked={settings.reducedMotion}
            onChange={v => onUpdate('reducedMotion', v)}
          />

          {sectionHeader('Cursor & Focus')}

          <A11yToggle
            label="Larger Cursor"
            description="Increase cursor size for better visibility"
            checked={settings.largerCursor}
            onChange={v => onUpdate('largerCursor', v)}
          />

          <A11yToggle
            label="Enhanced Focus Indicators"
            description="Bold outlines on focused elements"
            checked={settings.focusHighlight}
            onChange={v => onUpdate('focusHighlight', v)}
          />

          {sectionHeader('Colour Vision')}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {COLOR_FILTERS.map(filter => (
              <div
                key={filter.id}
                onClick={() => onUpdate('colorFilter', filter.id)}
                style={{
                  padding: '8px 12px', borderRadius: '8px',
                  border: settings.colorFilter === filter.id ? '1.5px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
                  background: settings.colorFilter === filter.id ? 'var(--terminal-surface)' : 'transparent',
                  cursor: 'pointer', fontSize: '12px', fontFamily: uiFont,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <span>{filter.label}</span>
                {settings.colorFilter === filter.id && (
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>✓</span>
                )}
              </div>
            ))}
          </div>

          {sectionHeader('Screen Reader')}

          <A11yToggle
            label="Enhanced ARIA Hints"
            description="Extra live regions & landmarks for screen readers"
            checked={settings.screenReaderHints}
            onChange={v => onUpdate('screenReaderHints', v)}
          />
        </div>
      )}

      {/* VOICE TAB */}
      {subTab === 'voice' && (
        <div>
          {sectionHeader('Voice Input (Dictation)')}

          <A11yToggle
            label="Enable Voice Input"
            description={voiceSupported ? 'Dictate text using your microphone' : 'Not supported in this browser'}
            checked={settings.voiceInputEnabled}
            onChange={v => onUpdate('voiceInputEnabled', v)}
          />

          {settings.voiceInputEnabled && !voiceSupported && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', marginTop: '8px',
              background: 'rgba(224, 92, 92, 0.1)', border: '1px solid rgba(224, 92, 92, 0.3)',
              fontSize: '11px', fontFamily: uiFont, color: '#e05c5c', lineHeight: 1.5,
            }}>
              Voice input requires Chrome, Edge, or Safari. Please switch browsers to use this feature.
            </div>
          )}

          {settings.voiceInputEnabled && voiceSupported && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', marginTop: '8px',
              background: 'var(--terminal-surface)', border: '1px solid var(--terminal-border)',
              fontSize: '11px', fontFamily: uiFont, opacity: 0.65, lineHeight: 1.5,
            }}>
              🎤 Press <kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--terminal-border)', fontSize: '10px' }}>Ctrl+Shift+D</kbd> in the editor to start/stop dictation. Spoken text will be inserted at your cursor position.
            </div>
          )}

          {sectionHeader('Text-to-Speech (Readback)')}

          <A11yToggle
            label="Enable Text-to-Speech"
            description="Read selected text or entire document aloud"
            checked={settings.ttsEnabled}
            onChange={v => onUpdate('ttsEnabled', v)}
          />

          {settings.ttsEnabled && (
            <>
              <A11ySlider
                label="Speech Rate"
                value={settings.ttsRate}
                min={0.5} max={2} step={0.1}
                unit="×"
                onChange={v => onUpdate('ttsRate', v)}
              />

              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontFamily: uiFont, opacity: 0.8, marginBottom: '6px' }}>Voice</div>
                <select
                  value={settings.ttsVoiceIdx}
                  onChange={e => onUpdate('ttsVoiceIdx', parseInt(e.target.value))}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: '8px',
                    background: 'var(--terminal-surface)', color: 'var(--terminal-text)',
                    border: '1px solid var(--terminal-border)', fontFamily: uiFont,
                    fontSize: '12px', cursor: 'pointer', outline: 'none',
                  }}
                >
                  {ttsVoices.map((voice, i) => (
                    <option key={i} value={i}>{voice.name} ({voice.lang})</option>
                  ))}
                  {ttsVoices.length === 0 && <option value={0}>Default</option>}
                </select>
              </div>

              <div style={{
                padding: '10px 14px', borderRadius: '8px',
                background: 'var(--terminal-surface)', border: '1px solid var(--terminal-border)',
                fontSize: '11px', fontFamily: uiFont, opacity: 0.65, lineHeight: 1.5,
              }}>
                🔊 Select text and press <kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--terminal-border)', fontSize: '10px' }}>Ctrl+Shift+R</kbd> to read aloud. Press again to stop.
              </div>
            </>
          )}
        </div>
      )}

      {/* Reset button */}
      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--terminal-border)' }}>
        <button
          onClick={onReset}
          style={{
            width: '100%', padding: '9px 16px', borderRadius: '8px',
            border: '1px solid var(--terminal-border)', background: 'transparent',
            color: 'var(--terminal-text)', fontFamily: uiFont, fontSize: '12px',
            cursor: 'pointer', opacity: 0.6, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--terminal-accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.borderColor = 'var(--terminal-border)'; }}
        >
          Reset All Accessibility Settings
        </button>
      </div>
    </div>
  );
}
