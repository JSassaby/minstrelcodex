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
          fontSize: '14px',
          letterSpacing: '6px',
          textTransform: 'uppercase',
          color: '#888',
          marginBottom: '12px',
          fontFamily: "'Courier Prime', monospace",
        }}
      >
        Choose your style
      </div>
      <div
        style={{
          fontSize: '10px',
          color: '#555',
          marginBottom: '40px',
          fontFamily: "'Courier Prime', monospace",
        }}
      >
        You can change this anytime in Settings
      </div>

      <div
        style={{
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '900px',
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
                width: '240px',
                cursor: 'pointer',
                border: isActive ? `2px solid ${theme.colors.accent}` : '2px solid #333',
                borderRadius: '0',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                boxShadow: isActive
                  ? `0 0 30px ${theme.colors.glow !== 'transparent' ? theme.colors.glow : 'rgba(99, 102, 241, 0.3)'}`
                  : 'none',
              }}
            >
              {/* Preview area */}
              <div
                style={{
                  background: theme.preview.bg,
                  color: theme.preview.fg,
                  padding: '28px 20px',
                  fontFamily: theme.fonts.body,
                  fontSize: '18px',
                  lineHeight: 1.6,
                  minHeight: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  textShadow: theme.effects.textGlow ? `0 0 8px ${theme.colors.glow}` : 'none',
                  position: 'relative',
                }}
              >
                {/* Scanline overlay for terminal */}
                {theme.effects.scanlines && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Paper texture for typewriter */}
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
                <div style={{ fontWeight: 'bold', fontSize: '22px', marginBottom: '8px' }}>
                  {theme.preview.sampleText}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.7 }}>
                  jumps over the lazy dog.
                </div>
              </div>

              {/* Label */}
              <div
                style={{
                  background: isActive ? theme.colors.accent : '#1a1a1a',
                  color: isActive
                    ? (mode === 'terminal' ? '#000' : '#fff')
                    : '#999',
                  padding: '14px 20px',
                  textAlign: 'center',
                  transition: 'all 0.3s',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    fontFamily: "'Courier Prime', monospace",
                    letterSpacing: '2px',
                  }}
                >
                  {theme.icon} {theme.label.toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    marginTop: '4px',
                    opacity: 0.8,
                    fontFamily: "'Courier Prime', monospace",
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
          marginTop: '32px',
          fontSize: '11px',
          color: '#444',
          fontFamily: "'Courier Prime', monospace",
        }}
      >
        ← → Navigate • Enter Select
      </div>
    </div>
  );
}
