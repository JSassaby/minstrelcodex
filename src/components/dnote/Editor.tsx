import { useRef, useEffect } from 'react';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  fontSize: number;
  placeholder: string;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
}

export default function Editor({ content, onChange, fontSize, placeholder, editorRef }: EditorProps) {
  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  return (
    <div
      style={{
        flex: 1,
        padding: '20px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <textarea
        ref={editorRef}
        value={content}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--terminal-text)',
          fontFamily: "'Courier Prime', 'Courier New', monospace",
          fontSize: `${fontSize}px`,
          lineHeight: 1.6,
          resize: 'none',
          textShadow: '0 0 5px var(--terminal-glow)',
          caretColor: 'var(--terminal-text)',
          caretShape: 'block' as any,
        }}
      />
    </div>
  );
}
