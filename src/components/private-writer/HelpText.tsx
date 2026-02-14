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
        bottom: '60px',
        right: '20px',
        fontSize: '12px',
        opacity: 0.5,
        maxWidth: '300px',
        textAlign: 'right',
        lineHeight: 1.4,
        fontFamily: "'VT323', monospace",
        color: 'var(--terminal-text)',
      }}
    >
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
