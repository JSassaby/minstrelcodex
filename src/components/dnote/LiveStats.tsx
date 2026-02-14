interface LiveStatsProps {
  visible: boolean;
  wpm: number;
  chars: number;
}

export default function LiveStats({ visible, wpm, chars }: LiveStatsProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '60px',
        right: '20px',
        border: '2px solid var(--terminal-text)',
        background: 'var(--terminal-bg)',
        padding: '12px',
        fontSize: '14px',
        zIndex: 500,
        fontFamily: "'VT323', monospace",
        color: 'var(--terminal-text)',
      }}
    >
      <div style={{ marginBottom: '4px', fontSize: '12px', opacity: 0.7 }}>LIVE STATS</div>
      <div>{wpm} WPM</div>
      <div>{chars} CHARS</div>
      <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>Ctrl+Shift+S to hide</div>
    </div>
  );
}
