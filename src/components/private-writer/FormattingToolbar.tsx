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

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

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

// Pill button style — rounded, soft border, accent-filled when active
const pillBtn = (active: boolean, danger?: boolean): React.CSSProperties => ({
  padding: '4px 11px',
  borderRadius: '7px',
  border: active
    ? '1.5px solid var(--terminal-accent)'
    : '1px solid var(--terminal-border)',
  background: active ? 'var(--terminal-accent)' : 'var(--terminal-surface)',
  color: active
    ? 'var(--terminal-bg)'
    : danger ? '#e05c5c' : 'var(--terminal-text)',
  cursor: 'pointer',
  fontFamily: uiFont,
  fontSize: '12px',
  fontWeight: active ? '600' : '500',
  transition: 'all 0.12s',
  opacity: active ? 1 : 0.75,
  whiteSpace: 'nowrap' as const,
  lineHeight: '1.4',
});

export default function FormattingToolbar({
  editor, readOnly, fontSize, fontFamily, sidebarOpen, onChangeFontSize, onChangeFontFamily, onToggleSidebar,
}: FormattingToolbarProps) {
  if (readOnly) return null;

  const buttons: ToolbarButton[] = [
    { label: 'H1', shortcut: 'Ctrl+Alt+1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }) },
    { label: 'H2', shortcut: 'Ctrl+Alt+2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }) },
    ...(!sidebarOpen ? [
      { label: 'H3', shortcut: 'Ctrl+Alt+3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive('heading', { level: 3 }) },
      { label: 'H4', shortcut: 'Ctrl+Alt+4', action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(), isActive: editor.isActive('heading', { level: 4 }) },
    ] : []),
    { label: '|', shortcut: '', action: () => {}, isActive: false },
    { label: 'B', shortcut: 'Ctrl+B', action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold') },
    { label: 'I', shortcut: 'Ctrl+I', action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic') },
    { label: 'U', shortcut: 'Ctrl+U', action: () => editor.chain().focus().toggleUnderline().run(), isActive: editor.isActive('underline') },
    { label: '|', shortcut: '', action: () => {}, isActive: false },
    { label: '• List', shortcut: 'Ctrl+Shift+8', action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList') },
    ...(!sidebarOpen ? [{ label: '1. List', shortcut: 'Ctrl+Shift+7', action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive('orderedList') }] : []),
  ];

  const divider = (key: string) => (
    <span
      key={key}
      style={{ width: '1px', height: '18px', background: 'var(--terminal-border)', margin: '0 5px', flexShrink: 0 }}
    />
  );

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        padding: '6px 14px',
        borderBottom: '1px solid var(--terminal-border)',
        backgroundColor: 'var(--terminal-surface)',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {/* Files / sidebar toggle */}
      {onToggleSidebar && (
        <>
          <button
            onClick={onToggleSidebar}
            title="Files (Ctrl+Shift+B)"
            style={pillBtn(!!sidebarOpen)}
            onMouseEnter={e => { if (!sidebarOpen) { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'var(--terminal-border)'; } }}
            onMouseLeave={e => { if (!sidebarOpen) { (e.currentTarget as HTMLElement).style.opacity = '0.75'; (e.currentTarget as HTMLElement).style.background = 'var(--terminal-surface)'; } }}
          >
            📁 Files
          </button>
          {divider('sep-files')}
        </>
      )}

      {/* Font family */}
      <select
        value={fontFamily}
        onChange={e => onChangeFontFamily(e.target.value)}
        style={{
          background: 'var(--terminal-surface)',
          color: 'var(--terminal-text)',
          border: '1px solid var(--terminal-border)',
          borderRadius: '7px',
          padding: '4px 8px',
          fontFamily: uiFont,
          fontSize: '12px',
          cursor: 'pointer',
          outline: 'none',
          maxWidth: '148px',
          fontWeight: '500',
          opacity: 0.85,
        }}
      >
        {AVAILABLE_FONTS.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Font size */}
      <button
        onClick={() => onChangeFontSize(-2)}
        title="Decrease text size (Ctrl+-)"
        style={pillBtn(false)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
      >
        A−
      </button>
      <span style={{
        padding: '4px 6px',
        fontSize: '12px',
        opacity: 0.55,
        color: 'var(--terminal-text)',
        fontFamily: uiFont,
        minWidth: '28px',
        textAlign: 'center',
        fontWeight: '500',
      }}>
        {fontSize}
      </span>
      <button
        onClick={() => onChangeFontSize(2)}
        title="Increase text size (Ctrl++)"
        style={pillBtn(false)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
      >
        A+
      </button>

      {divider('sep-size')}

      {/* Formatting buttons */}
      {buttons.map((btn, idx) => {
        if (btn.label === '|') return divider(`sep-${idx}`);
        const isHeading = btn.label.startsWith('H');
        return (
          <button
            key={btn.label}
            onClick={btn.action}
            title={btn.shortcut ? `${btn.label} (${btn.shortcut})` : btn.label}
            style={{
              ...pillBtn(btn.isActive),
              fontSize: isHeading ? '11px' : '12px',
              fontWeight: (btn.label === 'B' || isHeading) ? '700' : btn.label === 'I' ? '400' : '500',
              fontStyle: btn.label === 'I' ? 'italic' : 'normal',
              textDecoration: btn.label === 'U' ? 'underline' : 'none',
            }}
            onMouseEnter={e => { if (!btn.isActive) { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'var(--terminal-border)'; } }}
            onMouseLeave={e => { if (!btn.isActive) { (e.currentTarget as HTMLElement).style.opacity = '0.75'; (e.currentTarget as HTMLElement).style.background = 'var(--terminal-surface)'; } }}
          >
            {btn.label}
          </button>
        );
      })}
    </div>
  );
}
