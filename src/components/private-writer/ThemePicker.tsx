import { useState, useEffect, useCallback } from 'react';
import { Check, ArrowRight, Palette, Monitor } from 'lucide-react';
import { ThemeMode, THEMES, ThemeDefinition, applyTheme } from '@/lib/themes';
import minstrelLogo from '@/assets/minstrel-logo.svg';

interface ThemePickerProps {
  onSelect: (mode: ThemeMode) => void;
}

// ── Colour presets to offer on the picker ────────────────────────────────────
const COLOR_COMBOS: { name: string; text: string; bg: string; accent: string; mode: ThemeMode }[] = [
  { name: 'Terminal',      text: '#00c896', bg: '#0d1117', accent: '#00c896', mode: 'terminal' },
  { name: 'Phosphor',      text: '#33ff33', bg: '#000000', accent: '#33ff33', mode: 'terminal' },
  { name: 'Warm Amber',    text: '#ffb000', bg: '#0d0c08', accent: '#ffb000', mode: 'terminal' },
  { name: 'Cyberpunk',     text: '#00e5ff', bg: '#050010', accent: '#00e5ff', mode: 'terminal' },
  { name: 'Modern',        text: '#1c2333', bg: '#f8f7f4', accent: '#4a6fa5', mode: 'modern' },
  { name: 'Slate',         text: '#2d3748', bg: '#f0f2f5', accent: '#6b7fa3', mode: 'modern' },
  { name: 'Typewriter',    text: '#2c1f14', bg: '#f2ede3', accent: '#b8860b', mode: 'typewriter' },
  { name: 'Sepia Dark',    text: '#3d2b1a', bg: '#e8dcc8', accent: '#9a6b1a', mode: 'typewriter' },
];

// ── Mini editor mockup inside each card ──────────────────────────────────────
function MiniEditor({ theme }: { theme: ThemeDefinition }) {
  const lines = [
    { text: 'Chapter One', bold: true, size: 15 },
    { text: '', size: 12 },
    { text: 'It was a bright cold day in April,', size: 12 },
    { text: 'and the clocks were striking thirteen.', size: 12 },
    { text: '', size: 12 },
    { text: 'Winston Smith, his chin nuzzled into', size: 12, opacity: 0.6 },
  ];

  return (
    <div
      style={{
        background: theme.colors.background,
        padding: '20px 22px 16px',
        fontFamily: theme.fonts.body,
        position: 'relative',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* Scanlines overlay for terminal */}
      {theme.effects.scanlines && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1), rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)',
        }} />
      )}
      {/* Paper texture for typewriter */}
      {theme.effects.paperTexture && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: "url(\"data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23000000' fill-opacity='0.025'/%3E%3C/svg%3E\")",
        }} />
      )}

      {/* Mini menu bar */}
      <div style={{
        display: 'flex', gap: '6px', marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: `1px solid ${theme.colors.border}`,
        opacity: 0.5,
      }}>
        {['File', 'Edit', 'Storage'].map(m => (
          <span key={m} style={{ fontSize: '9px', color: theme.colors.text, fontFamily: theme.fonts.ui, letterSpacing: '0.02em' }}>{m}</span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: theme.colors.text, opacity: 0.5 }}>chapter-one.txt</span>
      </div>

      {/* Text lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              height: line.text ? `${line.size}px` : '6px',
              width: line.text ? `${60 + (i * 7) % 35}%` : '0',
              background: line.text ? theme.colors.text : 'transparent',
              borderRadius: '2px',
              opacity: line.bold ? 1 : (line.opacity ?? 0.75),
              fontWeight: line.bold ? 700 : 400,
              transform: line.bold ? 'scaleX(0.55)' : 'scaleX(1)',
              transformOrigin: 'left',
              boxShadow: theme.effects.textGlow ? `0 0 6px ${theme.colors.glow}` : 'none',
            }}
          />
        ))}
        {/* Blinking cursor */}
        <div style={{
          width: '8px', height: 13,
          background: theme.colors.accent,
          borderRadius: '1px',
          opacity: 0.85,
          animation: 'picker-cursor-blink 1.1s step-end infinite',
          marginTop: '4px',
        }} />
      </div>

      {/* Mini status bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '4px 10px',
        background: theme.colors.background,
        borderTop: `1px solid ${theme.colors.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        opacity: 0.5,
      }}>
        <span style={{ fontSize: '8px', color: theme.colors.text, fontFamily: theme.fonts.ui }}>chapter-one.txt</span>
        <span style={{ fontSize: '8px', color: theme.colors.text, fontFamily: theme.fonts.ui }}>42 words</span>
      </div>
    </div>
  );
}

export default function ThemePicker({ onSelect }: ThemePickerProps) {
  const modes: ThemeMode[] = ['terminal', 'modern', 'typewriter'];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [customComboIdx, setCustomComboIdx] = useState<number | null>(null);
  const [entering, setEntering] = useState(false);
  const [section, setSection] = useState<'themes' | 'colours'>('themes');

  const activeIdx = hoveredIdx !== null ? hoveredIdx : selectedIdx;
  const activeMode = modes[activeIdx];
  const activeTheme = THEMES[activeMode];

  // Apply theme preview live
  useEffect(() => {
    if (customComboIdx !== null) {
      const combo = COLOR_COMBOS[customComboIdx];
      const base = THEMES[combo.mode];
      applyTheme({
        ...base,
        colors: { ...base.colors, text: combo.text, background: combo.bg, accent: combo.accent },
      });
    } else {
      applyTheme(THEMES[modes[activeIdx]]);
    }
  }, [activeIdx, customComboIdx]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (section === 'themes') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          setSelectedIdx(p => (p - 1 + 3) % 3);
          setHoveredIdx(null);
          setCustomComboIdx(null);
          e.preventDefault();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          setSelectedIdx(p => (p + 1) % 3);
          setHoveredIdx(null);
          setCustomComboIdx(null);
          e.preventDefault();
        } else if (e.key === 'Tab') {
          setSection('colours');
          e.preventDefault();
        } else if (e.key === 'Enter' || e.key === ' ') {
          handleSelect();
          e.preventDefault();
        }
      } else {
        if (e.key === 'Tab' || e.key === 'Escape') {
          setSection('themes');
          e.preventDefault();
        } else if (e.key === 'Enter') {
          handleSelect();
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [section, selectedIdx, customComboIdx]);

  const handleSelect = useCallback(() => {
    setEntering(true);
    // brief exit animation then call onSelect
    setTimeout(() => onSelect(modes[selectedIdx]), 380);
  }, [selectedIdx, onSelect]);

  const uiFont = "'Space Grotesk', sans-serif";

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', flexDirection: 'column',
        background: '#080b0f',
        opacity: entering ? 0 : 1,
        transition: 'opacity 0.38s ease',
        fontFamily: uiFont,
      }}
    >
      <style>{`
        @keyframes picker-cursor-blink {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 0; }
        }
        @keyframes picker-card-in {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes picker-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .picker-card { animation: picker-card-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .picker-card:nth-child(1) { animation-delay: 0.05s; }
        .picker-card:nth-child(2) { animation-delay: 0.12s; }
        .picker-card:nth-child(3) { animation-delay: 0.19s; }
        .picker-fade { animation: picker-fade-in 0.5s ease both; }
        @keyframes picker-logo-glow {
          from { filter: drop-shadow(0 0 32px rgba(255,255,255,0.12)) drop-shadow(0 0 80px rgba(255,255,255,0.06)); }
          to   { filter: drop-shadow(0 0 40px rgba(255,255,255,0.18)) drop-shadow(0 0 100px rgba(255,255,255,0.1)); }
        }
        .colour-swatch { transition: transform 0.15s, box-shadow 0.15s; }
        .colour-swatch:hover { transform: scale(1.06); }
      `}</style>

      {/* ── Header ── */}
      <div
        className="picker-fade"
        style={{ textAlign: 'center', padding: '52px 20px 32px', flexShrink: 0 }}
      >
        <img
          src={minstrelLogo}
          alt="Minstrel Codex"
          style={{
            display: 'block',
            margin: '0 auto 20px',
            width: '140px',
            height: '140px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 32px rgba(255,255,255,0.12)) drop-shadow(0 0 80px rgba(255,255,255,0.06))',
            animation: 'picker-logo-glow 3s ease-in-out infinite alternate',
          }}
        />
        <div style={{ fontSize: '28px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '8px', textTransform: 'uppercase', marginBottom: '8px' }}>
          Minstrel Codex
        </div>
        <div style={{ fontSize: '13px', fontWeight: 400, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>
          Choose your writing environment
        </div>
        <div style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
          You can change this any time in Settings
        </div>
      </div>

      {/* ── Section tabs ── */}
      <div className="picker-fade" style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '24px', flexShrink: 0 }}>
        {[{ id: 'themes', icon: <Monitor size={12} strokeWidth={1.8} />, label: 'Environments' }, { id: 'colours', icon: <Palette size={12} strokeWidth={1.8} />, label: 'Colour Presets' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', borderRadius: '20px',
              background: section === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: section === tab.id ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
              color: section === tab.id ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer', fontSize: '11px', fontFamily: uiFont, fontWeight: 500,
              letterSpacing: '0.03em', transition: 'all 0.2s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── THEMES section ── */}
      {section === 'themes' && (
        <div
          style={{
            flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'center',
            gap: '16px', padding: '0 32px', minHeight: 0, overflowY: 'auto',
          }}
        >
          {modes.map((mode, i) => {
            const theme = THEMES[mode];
            const isActive = activeIdx === i;
            const isSelected = selectedIdx === i;

            return (
              <div
                key={mode}
                className="picker-card"
                onMouseEnter={() => { setHoveredIdx(i); setCustomComboIdx(null); }}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => { setSelectedIdx(i); setCustomComboIdx(null); setHoveredIdx(null); }}
                style={{
                  flex: '1 1 0',
                  maxWidth: '320px',
                  minWidth: '220px',
                  display: 'flex', flexDirection: 'column',
                  borderRadius: '10px', overflow: 'hidden',
                  border: isActive
                    ? `1.5px solid ${theme.colors.accent}`
                    : '1.5px solid rgba(255,255,255,0.07)',
                  cursor: 'pointer',
                  transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
                  transform: isActive ? 'translateY(-6px)' : 'translateY(0)',
                  boxShadow: isActive
                    ? `0 20px 60px ${theme.colors.glow !== 'transparent' ? theme.colors.glow : 'rgba(74,111,165,0.22)'}, 0 0 0 1px ${theme.colors.accent}22`
                    : '0 4px 20px rgba(0,0,0,0.4)',
                  position: 'relative',
                }}
              >
                {/* Selected badge */}
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: theme.colors.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10,
                  }}>
                    <Check size={12} color={theme.colors.background} strokeWidth={2.5} />
                  </div>
                )}

                {/* Mini editor preview */}
                <MiniEditor theme={theme} />

                {/* Label footer */}
                <div style={{
                  padding: '14px 16px 12px',
                  background: isActive ? theme.colors.accent : 'rgba(255,255,255,0.04)',
                  transition: 'background 0.25s',
                  flexShrink: 0,
                }}>
                  <div style={{
                    fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: isActive ? theme.colors.background : 'rgba(255,255,255,0.65)',
                    fontFamily: uiFont,
                  }}>
                    {theme.label}
                  </div>
                  <div style={{
                    fontSize: '11px', marginTop: '2px',
                    color: isActive ? theme.colors.background : 'rgba(255,255,255,0.35)',
                    fontFamily: uiFont, fontWeight: 400,
                  }}>
                    {theme.description}
                  </div>
                  <div style={{
                    fontSize: '10px', marginTop: '6px',
                    color: isActive ? `${theme.colors.background}99` : 'rgba(255,255,255,0.2)',
                    fontFamily: uiFont,
                  }}>
                    {mode === 'terminal' ? 'JetBrains Mono' : mode === 'modern' ? 'Inter' : 'Lora'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── COLOURS section ── */}
      {section === 'colours' && (
        <div
          className="picker-fade"
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '0 40px', gap: '20px', overflowY: 'auto', minHeight: 0,
          }}
        >
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em' }}>
            Pick a colour preset — you can customise further in Settings
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '10px',
            width: '100%',
            maxWidth: '740px',
          }}>
            {COLOR_COMBOS.map((combo, i) => {
              const isActive = customComboIdx === i;
              return (
                <div
                  key={combo.name}
                  className="colour-swatch"
                  onClick={() => {
                    setCustomComboIdx(i);
                    // also select the matching base theme
                    setSelectedIdx(modes.indexOf(combo.mode));
                  }}
                  style={{
                    borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                    border: isActive ? `2px solid ${combo.accent}` : '2px solid rgba(255,255,255,0.08)',
                    boxShadow: isActive ? `0 0 20px ${combo.accent}44` : 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                >
                  {/* Colour preview */}
                  <div style={{
                    background: combo.bg, padding: '16px 14px 14px',
                    display: 'flex', flexDirection: 'column', gap: '5px',
                  }}>
                    {[1, 0.65, 0.4].map((op, li) => (
                      <div key={li} style={{
                        height: '7px',
                        width: `${75 - li * 18}%`,
                        background: combo.text,
                        borderRadius: '3px',
                        opacity: op,
                      }} />
                    ))}
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '2px',
                      background: combo.accent, marginTop: '4px', opacity: 0.9,
                    }} />
                  </div>
                  {/* Label */}
                  <div style={{
                    padding: '8px 10px',
                    background: isActive ? combo.accent : 'rgba(255,255,255,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: isActive ? combo.bg : 'rgba(255,255,255,0.7)', fontFamily: uiFont }}>{combo.name}</div>
                      <div style={{ fontSize: '9px', color: isActive ? `${combo.bg}99` : 'rgba(255,255,255,0.3)', fontFamily: uiFont, textTransform: 'capitalize' }}>{combo.mode}</div>
                    </div>
                    {isActive && <Check size={12} color={combo.bg} strokeWidth={2.5} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CTA footer ── */}
      <div
        className="picker-fade"
        style={{
          flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '20px 20px 32px', gap: '14px',
        }}
      >
        <button
          onClick={handleSelect}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '13px 36px', borderRadius: '8px',
            background: activeTheme.colors.accent,
            color: activeTheme.colors.background,
            border: 'none', cursor: 'pointer', fontFamily: uiFont,
            fontSize: '14px', fontWeight: 600, letterSpacing: '0.02em',
            boxShadow: `0 8px 28px ${activeTheme.colors.glow !== 'transparent' ? activeTheme.colors.glow : 'rgba(74,111,165,0.35)'}`,
            transition: 'background 0.3s, color 0.3s, box-shadow 0.3s',
          }}
        >
          Enter {THEMES[modes[selectedIdx]].label}
          <ArrowRight size={16} strokeWidth={2} />
        </button>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px', fontFamily: uiFont }}>
          ← → Navigate &nbsp;·&nbsp; Enter to select &nbsp;·&nbsp; Tab for colour presets
        </div>
      </div>
    </div>
  );
}
