import { useState, useEffect } from 'react';
import { ThemeMode, THEMES, applyTheme } from '@/lib/themes';

interface ThemePickerProps {
  onSelect: (mode: ThemeMode) => void;
}

export default function ThemePicker({ onSelect }: ThemePickerProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const modes: ThemeMode[] = ['terminal', 'modern', 'typewriter'];

  // Preview theme on hover
  useEffect(() => {
    const mode = hoveredIdx !== null ? modes[hoveredIdx] : modes[selectedIdx];
    applyTheme(THEMES[mode]);
    return () => {
      // Reset to terminal on unmount if nothing selected
      applyTheme(THEMES['terminal']);
    };
  }, [hoveredIdx, selectedIdx]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setSelectedIdx(prev => (prev - 1 + 3) % 3);
        setHoveredIdx(null);
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setSelectedIdx(prev => (prev + 1) % 3);
        setHoveredIdx(null);
        e.preventDefault();
      } else if (e.key === 'Enter' || e.key === ' ') {
        onSelect(modes[selectedIdx]);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIdx, onSelect]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        transition: 'background 0.5s',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          letterSpacing: '5px',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
          marginBottom: '10px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500,
        }}
      >
        Choose your writing environment
      </div>
      <div
        style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.18)',
          marginBottom: '48px',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        You can change this anytime in Settings
      </div>

      <div
        style={{
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '960px',
          padding: '0 20px',
        }}
      >
        {modes.map((mode, i) => {
          const theme = THEMES[mode];
          const isActive = (hoveredIdx !== null ? hoveredIdx : selectedIdx) === i;

          return (
            <div
              key={mode}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSelect(mode)}
              style={{
                width: '260px',
                cursor: 'pointer',
                border: isActive ? `1.5px solid ${theme.colors.accent}` : '1.5px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.25s ease',
                transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isActive
                  ? `0 16px 48px ${theme.colors.glow !== 'transparent' ? theme.colors.glow : 'rgba(74, 111, 165, 0.25)'}`
                  : '0 2px 12px rgba(0,0,0,0.3)',
              }}
            >
              {/* Preview area */}
              <div
                style={{
                  background: theme.preview.bg,
                  color: theme.preview.fg,
                  padding: '32px 24px',
                  fontFamily: theme.fonts.body,
                  fontSize: '17px',
                  lineHeight: 1.65,
                  minHeight: '150px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  textShadow: theme.effects.textGlow ? `0 0 12px ${theme.colors.glow}` : 'none',
                  position: 'relative',
                }}
              >
                {theme.effects.scanlines && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12), rgba(0,0,0,0.12) 1px, transparent 1px, transparent 2px)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {theme.effects.paperTexture && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 3h1v1H1V3zm2-2h1v1H3V1z\' fill=\'%23000000\' fill-opacity=\'0.03\'/%3E%3C/svg%3E")',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <div style={{ fontWeight: 600, fontSize: '20px', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                  {theme.preview.sampleText}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.55, fontStyle: mode === 'typewriter' ? 'italic' : 'normal' }}>
                  jumps over the lazy dog.
                </div>
              </div>

              {/* Label */}
              <div
                style={{
                  background: isActive ? theme.colors.accent : 'rgba(255,255,255,0.04)',
                  color: isActive
                    ? (mode === 'terminal' ? '#0d1117' : '#fff')
                    : 'rgba(255,255,255,0.5)',
                  padding: '16px 20px',
                  textAlign: 'left',
                  transition: 'all 0.25s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    fontFamily: "'Space Grotesk', sans-serif",
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {theme.label}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    opacity: 0.75,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 400,
                  }}
                >
                  {theme.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: '40px',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.18)',
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: '1px',
        }}
      >
        ← → Navigate &nbsp;·&nbsp; Enter to select
      </div>
    </div>
  );
}
