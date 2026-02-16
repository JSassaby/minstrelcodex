import type { Editor } from '@tiptap/react';

const AVAILABLE_FONTS = [
  { label: 'Courier Prime', value: "'Courier Prime', 'Courier New', monospace" },
  { label: 'Courier New', value: "'Courier New', monospace" },
  { label: 'VT323', value: "'VT323', monospace" },
  { label: 'IBM Plex Mono', value: "'IBM Plex Mono', monospace" },
  { label: 'Fira Code', value: "'Fira Code', monospace" },
  { label: 'Source Code Pro', value: "'Source Code Pro', monospace" },
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { label: 'Roboto Mono', value: "'Roboto Mono', monospace" },
];

interface FormattingToolbarProps {
  editor: Editor;
  readOnly?: boolean;
  fontSize: number;
  fontFamily: string;
  sidebarOpen?: boolean;
  onChangeFontSize: (delta: number) => void;
  onChangeFontFamily: (font: string) => void;
  onToggleSidebar?: () => void;
}

interface ToolbarButton {
  label: string;
  shortcut: string;
  action: () => void;
  isActive: boolean;
}

export default function FormattingToolbar({ editor, readOnly, fontSize, fontFamily, sidebarOpen, onChangeFontSize, onChangeFontFamily, onToggleSidebar }: FormattingToolbarProps) {
  if (readOnly) return null;

  const buttons: ToolbarButton[] = [
    {
      label: 'H1',
      shortcut: 'Ctrl+Alt+1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      label: 'H2',
      shortcut: 'Ctrl+Alt+2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      label: 'H3',
      shortcut: 'Ctrl+Alt+3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    {
      label: 'H4',
      shortcut: 'Ctrl+Alt+4',
      action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
      isActive: editor.isActive('heading', { level: 4 }),
    },
    { label: '|', shortcut: '', action: () => {}, isActive: false },
    {
      label: 'B',
      shortcut: 'Ctrl+B',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      label: 'I',
      shortcut: 'Ctrl+I',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      label: 'U',
      shortcut: 'Ctrl+U',
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive('underline'),
    },
    { label: '|', shortcut: '', action: () => {}, isActive: false },
    {
      label: '• List',
      shortcut: 'Ctrl+Shift+8',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      label: '1. List',
      shortcut: 'Ctrl+Shift+7',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
  ];

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    background: active ? 'var(--terminal-text)' : 'transparent',
    color: active ? 'var(--terminal-bg)' : 'var(--terminal-text)',
    border: '1px solid var(--terminal-text)',
    cursor: 'pointer',
    fontFamily: "'Courier Prime', 'Courier New', monospace",
    fontSize: '13px',
    textShadow: active ? 'none' : '0 0 5px var(--terminal-glow)',
    opacity: 0.9,
    transition: 'all 0.1s',
  });

  return (
    <div
      style={{
        display: 'flex',
        gap: '2px',
        padding: '4px 16px',
        borderBottom: '1px solid var(--terminal-text)',
        backgroundColor: 'var(--terminal-bg)',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {/* Font dropdown */}
      <select
        value={fontFamily}
        onChange={e => onChangeFontFamily(e.target.value)}
        style={{
          background: 'var(--terminal-bg)',
          color: 'var(--terminal-text)',
          border: '1px solid var(--terminal-text)',
          padding: '4px 6px',
          fontFamily: "'Courier Prime', monospace",
          fontSize: '12px',
          cursor: 'pointer',
          outline: 'none',
          maxWidth: '140px',
          marginRight: '4px',
        }}
      >
        {AVAILABLE_FONTS.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Text size controls */}
      <button
        onClick={() => onChangeFontSize(-2)}
        title="Decrease text size (Ctrl+-)"
        style={btnStyle(false)}
      >
        A−
      </button>
      <span style={{
        padding: '4px 6px',
        fontSize: '12px',
        opacity: 0.7,
        color: 'var(--terminal-text)',
        fontFamily: "'Courier Prime', monospace",
        minWidth: '32px',
        textAlign: 'center',
      }}>
        {fontSize}
      </span>
      <button
        onClick={() => onChangeFontSize(2)}
        title="Increase text size (Ctrl++)"
        style={btnStyle(false)}
      >
        A+
      </button>

      <span style={{ width: '1px', height: '20px', background: 'var(--terminal-text)', opacity: 0.3, margin: '0 6px' }} />

      {buttons.map((btn, idx) => {
        if (btn.label === '|') {
          return <span key={`sep-${idx}`} style={{ width: '1px', height: '20px', background: 'var(--terminal-text)', opacity: 0.3, margin: '0 4px' }} />;
        }
        const isHeading = btn.label.startsWith('H');
        return (
          <button
            key={btn.label}
            onClick={btn.action}
            title={btn.shortcut ? `${btn.label} (${btn.shortcut})` : btn.label}
            style={{
              ...btnStyle(btn.isActive),
              fontSize: isHeading ? '12px' : '13px',
              fontWeight: (btn.label === 'B' || isHeading) ? 'bold' : 'normal',
              fontStyle: btn.label === 'I' ? 'italic' : 'normal',
              textDecoration: btn.label === 'U' ? 'underline' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!btn.isActive) {
                (e.target as HTMLElement).style.opacity = '1';
                (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!btn.isActive) {
                (e.target as HTMLElement).style.opacity = '0.9';
                (e.target as HTMLElement).style.background = 'transparent';
              }
            }}
          >
            {btn.label}
          </button>
        );
      })}

      {onToggleSidebar && (
        <>
          <span style={{ width: '1px', height: '20px', background: 'var(--terminal-text)', opacity: 0.3, margin: '0 6px' }} />
          <button
            onClick={onToggleSidebar}
            title="Files (Ctrl+Shift+B)"
            style={{
              ...btnStyle(!!sidebarOpen),
              fontSize: '13px',
            }}
            onMouseEnter={(e) => {
              if (!sidebarOpen) {
                (e.target as HTMLElement).style.opacity = '1';
                (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!sidebarOpen) {
                (e.target as HTMLElement).style.opacity = '0.9';
                (e.target as HTMLElement).style.background = 'transparent';
              }
            }}
          >
            📁 Files
          </button>
        </>
      )}
    </div>
  );
}
