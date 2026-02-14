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
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={btn.action}
          title={`${btn.label} (${btn.shortcut})`}
          style={{
            padding: '4px 10px',
            background: btn.isActive ? 'var(--terminal-text)' : 'transparent',
            color: btn.isActive ? 'var(--terminal-bg)' : 'var(--terminal-text)',
            border: '1px solid var(--terminal-text)',
            cursor: 'pointer',
            fontFamily: "'Courier Prime', 'Courier New', monospace",
            fontSize: '13px',
            fontWeight: btn.label === 'B' ? 'bold' : btn.label === 'I' ? 'normal' : 'normal',
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
      ))}
      <span style={{
        marginLeft: 'auto',
        fontSize: '11px',
        opacity: 0.5,
        color: 'var(--terminal-text)',
        fontFamily: "'Courier Prime', monospace",
      }}>
        Ctrl+B/I/U • Ctrl+Shift+7/8
      </span>
    </div>
  );
}
