const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

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
        bottom: '52px',
        right: '20px',
        border: '1px solid var(--terminal-border)',
        borderRadius: '12px',
        background: 'var(--terminal-surface)',
        padding: '12px 16px',
        fontSize: '13px',
        zIndex: 500,
        fontFamily: uiFont,
        color: 'var(--terminal-text)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        minWidth: '120px',
      }}
    >
      <div style={{ fontSize: '10px', opacity: 0.45, marginBottom: '8px', fontWeight: '600', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Live Stats</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px' }}>
          <span style={{ opacity: 0.55, fontSize: '11px' }}>WPM</span>
          <span style={{ fontWeight: '600', fontSize: '15px' }}>{wpm}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px' }}>
          <span style={{ opacity: 0.55, fontSize: '11px' }}>Chars</span>
          <span style={{ fontWeight: '600', fontSize: '15px' }}>{chars}</span>
        </div>
      </div>
      <div style={{ fontSize: '10px', opacity: 0.3, marginTop: '8px', borderTop: '1px solid var(--terminal-border)', paddingTop: '6px' }}>Ctrl+Shift+S to hide</div>
    </div>
  );
}
