const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

interface HelpTextProps {
  visible: boolean;
  lines: string[];
}

export default function HelpText({ visible, lines }: HelpTextProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '52px',
        right: '20px',
        fontSize: '11px',
        opacity: 0.45,
        maxWidth: '260px',
        textAlign: 'right',
        lineHeight: 1.6,
        fontFamily: uiFont,
        color: 'var(--terminal-text)',
        letterSpacing: '0.01em',
        pointerEvents: 'none',
      }}
    >
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
