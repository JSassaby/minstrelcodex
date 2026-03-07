import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import FormattingToolbar from './FormattingToolbar';

export interface EditorHandle {
  focus: () => void;
  getHTML: () => string;
  setContent: (html: string) => void;
  insertSceneBreak: () => void;
}

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  fontSize: number;
  fontFamily: string;
  placeholder: string;
  readOnly?: boolean;
  sidebarOpen?: boolean;
  focusMode?: boolean;
  onChangeFontSize: (delta: number) => void;
  onChangeFontFamily: (font: string) => void;
  onToggleSidebar?: () => void;
  onToggleFocusMode?: () => void;
  onH1Blur?: (text: string) => void;
}

// ── Exit hint shown on mouse move during focus mode ────────────────
function ExitHint({ onExit }: { onExit?: () => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 2000);
    };
    window.addEventListener('mousemove', show, { passive: true });
    return () => {
      window.removeEventListener('mousemove', show);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        textAlign: 'center',
        padding: '8px',
        fontSize: '11px',
        fontFamily: "var(--font-ui, 'Space Grotesk', sans-serif)",
        letterSpacing: '0.12em',
        color: 'var(--terminal-muted, var(--terminal-text))',
        opacity: visible ? 0.5 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: visible ? 'auto' : 'none',
        cursor: 'pointer',
        zIndex: 10,
        userSelect: 'none',
      }}
      onClick={onExit}
      title="Exit focus mode"
    >
      EXIT FOCUS MODE · F11
    </div>
  );
}

const Editor = forwardRef<EditorHandle, EditorProps>(({
  content, onChange, fontSize, fontFamily, placeholder, readOnly,
  sidebarOpen, focusMode, onChangeFontSize, onChangeFontFamily,
  onToggleSidebar, onToggleFocusMode, onH1Blur,
}, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onBlur: ({ editor }) => {
      if (!onH1Blur) return;
      const firstNode = editor.getJSON().content?.[0];
      if (firstNode?.type === 'heading' && firstNode?.attrs?.level === 1) {
        const text = (firstNode.content as Array<{ text?: string }> | undefined)
          ?.map(n => n.text || '').join('') || '';
        if (text.trim()) onH1Blur(text.trim());
      }
    },
    editorProps: {
      attributes: {
        class: 'terminal-editor',
        spellcheck: 'false',
      },
    },
  });

  // ── Typewriter scroll: keep cursor at 60% of viewport in focus mode ──
  useEffect(() => {
    if (!focusMode || !editor || !scrollRef.current) return;
    const handler = () => {
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(true);
        const rect = range.getBoundingClientRect();
        if (!rect.top && !rect.bottom) return;
        const container = scrollRef.current!;
        const containerRect = container.getBoundingClientRect();
        const target = containerRect.top + containerRect.height * 0.6;
        container.scrollTop += rect.top - target;
      });
    };
    editor.on('update', handler);
    return () => { editor.off('update', handler); };
  }, [editor, focusMode]);

  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content]);

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
    getHTML: () => editor?.getHTML() || '',
    setContent: (html: string) => editor?.commands.setContent(html || '', { emitUpdate: false }),
    insertSceneBreak: () => { editor?.chain().focus().setHorizontalRule().run(); },
  }), [editor]);

  useEffect(() => {
    if (editor) setTimeout(() => editor.commands.focus(), 100);
  }, [editor]);

  if (!editor) return null;

  const editorArea = (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        padding: focusMode ? '10vh 0 40vh' : '20px',
        overflow: 'auto',
        cursor: 'text',
        display: 'flex',
        flexDirection: 'column',
        alignItems: focusMode ? 'center' : 'stretch',
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.ProseMirror')) return;
        editor?.commands.focus('end');
      }}
    >
      <style>{`
        .terminal-editor {
          outline: none;
          color: var(--terminal-text);
          font-family: ${fontFamily};
          font-size: ${fontSize}px;
          line-height: 1.6;
          text-shadow: 0 0 2px var(--terminal-glow);
          caret-color: var(--terminal-text);
          min-height: 100%;
          ${focusMode ? 'max-width: 680px; width: 100%;' : ''}
        }
        .terminal-editor p {
          margin: 0 0 0.5em 0;
        }
        .terminal-editor h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.5em 0 0.3em;
          text-shadow: 0 0 4px var(--terminal-glow);
          border-bottom: 1px solid var(--terminal-text);
          padding-bottom: 0.2em;
        }
        .terminal-editor h2 {
          font-size: 1.6em;
          font-weight: bold;
          margin: 0.4em 0 0.3em;
          text-shadow: 0 0 3px var(--terminal-glow);
        }
        .terminal-editor h3 {
          font-size: 1.3em;
          font-weight: bold;
          margin: 0.3em 0 0.2em;
          text-shadow: 0 0 2px var(--terminal-glow);
        }
        .terminal-editor h4 {
          font-size: 1.1em;
          font-weight: bold;
          margin: 0.3em 0 0.2em;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .terminal-editor p.is-editor-empty:first-child::before {
          content: '${placeholder.replace(/'/g, "\\'")}';
          color: var(--terminal-text);
          opacity: 0.4;
          pointer-events: none;
          float: left;
          height: 0;
        }
        .terminal-editor strong {
          font-weight: bold;
          text-shadow: 0 0 3px var(--terminal-glow);
        }
        .terminal-editor em {
          font-style: italic;
        }
        .terminal-editor u {
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .terminal-editor ul {
          list-style: disc;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .terminal-editor ol {
          list-style: decimal;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .terminal-editor li {
          margin: 0.25em 0;
        }
        .terminal-editor li p {
          margin: 0;
        }
        .terminal-editor blockquote {
          border-left: 3px solid var(--terminal-text);
          padding-left: 1em;
          margin: 0.5em 0;
          opacity: 0.8;
        }
        .terminal-editor code {
          background: rgba(255,255,255,0.1);
          padding: 2px 4px;
          border: 1px solid var(--terminal-text);
          font-size: 0.9em;
        }
        .terminal-editor pre {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--terminal-text);
          padding: 12px;
          margin: 0.5em 0;
          overflow-x: auto;
        }
        .terminal-editor pre code {
          background: none;
          border: none;
          padding: 0;
        }
        .terminal-editor hr {
          border: none;
          text-align: center;
          margin: 1.5em 0;
          overflow: visible;
          height: 1em;
          line-height: 1em;
          color: var(--terminal-text);
          opacity: 0.7;
        }
        .terminal-editor hr::after {
          content: '* \\00a0 * \\00a0 *';
          display: inline-block;
          font-family: ${fontFamily};
          font-size: 1em;
          letter-spacing: 0.3em;
          text-shadow: 0 0 4px var(--terminal-glow);
        }
      `}</style>
      <EditorContent editor={editor} />
    </div>
  );

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        background: focusMode ? 'var(--terminal-bg)' : undefined,
      }}
    >
      {focusMode && <ExitHint onExit={onToggleFocusMode} />}
      {!focusMode && (
        <FormattingToolbar
          editor={editor}
          readOnly={readOnly}
          fontSize={fontSize}
          fontFamily={fontFamily}
          sidebarOpen={sidebarOpen}
          focusMode={focusMode}
          onChangeFontSize={onChangeFontSize}
          onChangeFontFamily={onChangeFontFamily}
          onToggleSidebar={onToggleSidebar}
          onToggleFocusMode={onToggleFocusMode}
        />
      )}
      {editorArea}
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;
