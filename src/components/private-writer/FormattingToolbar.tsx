import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';

interface FormattingToolbarProps {
  editor: Editor;
  readOnly?: boolean;
}

interface ToolbarButton {
  label: string;
  shortcut: string;
  action: () => void;
  isActive: boolean;
}

export default function FormattingToolbar({ editor, readOnly }: FormattingToolbarProps) {
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
              padding: '4px 10px',
              background: btn.isActive ? 'var(--terminal-text)' : 'transparent',
              color: btn.isActive ? 'var(--terminal-bg)' : 'var(--terminal-text)',
              border: '1px solid var(--terminal-text)',
              cursor: 'pointer',
              fontFamily: "'Courier Prime', 'Courier New', monospace",
              fontSize: isHeading ? '12px' : '13px',
              fontWeight: (btn.label === 'B' || isHeading) ? 'bold' : 'normal',
              fontStyle: btn.label === 'I' ? 'italic' : 'normal',
              textDecoration: btn.label === 'U' ? 'underline' : 'none',
              textShadow: btn.isActive ? 'none' : '0 0 5px var(--terminal-glow)',
              opacity: 0.9,
              transition: 'all 0.1s',
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
      <span style={{
        marginLeft: 'auto',
        fontSize: '11px',
        opacity: 0.5,
        color: 'var(--terminal-text)',
        fontFamily: "'Courier Prime', monospace",
      }}>
        Ctrl+Alt+1-4 • Ctrl+B/I/U
      </span>
    </div>
  );
}
