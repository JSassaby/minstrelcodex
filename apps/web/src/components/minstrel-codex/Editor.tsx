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
  documentTitle?: string;
  onTitleBlur?: (text: string) => void;
  onChangeFontSize: (delta: number) => void;
  onChangeFontFamily: (font: string) => void;
  onToggleSidebar?: () => void;
  onToggleFocusMode?: () => void;
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
        color: '#ccc',
        opacity: visible ? 0.6 : 0,
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
  sidebarOpen, focusMode, documentTitle, onTitleBlur,
  onChangeFontSize, onChangeFontFamily, onToggleSidebar, onToggleFocusMode,
}, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [titleValue, setTitleValue] = useState(documentTitle || '');

  // Sync title when document changes
  useEffect(() => {
    setTitleValue(documentTitle || '');
  }, [documentTitle]);

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
    editorProps: {
      attributes: {
        class: 'page-editor',
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

  // Apply font family via CSS custom property — runs when editor mounts or font changes
  useEffect(() => {
    if (pageRef.current) {
      pageRef.current.style.setProperty('--editor-font', fontFamily);
    }
  }, [fontFamily, editor]);

  if (!editor) return null;

  const editorArea = (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflow: 'auto',
        background: '#1c1c1e',
        padding: focusMode ? '8vh 24px 40vh' : '32px 24px 40px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      {/* The page */}
      <div
        ref={pageRef}
        style={{
          width: '100%',
          maxWidth: '740px',
          background: '#faf9f6',
          padding: '64px 56px 80px',
          boxShadow: 'none',
          borderRadius: 0,
          position: 'relative',
          boxSizing: 'border-box',
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.page-editor') || target.closest('.page-title-input')) return;
          editor?.commands.focus('end');
        }}
      >
        <style>{`
          .page-title-input::placeholder {
            color: #c0bdb8;
          }
          .page-editor {
            outline: none;
            color: #2a2a2a;
            font-family: var(--editor-font, Georgia, 'Times New Roman', serif);
            font-size: var(--editor-font-size, 18px);
            line-height: 1.8;
            caret-color: #1a1a1a;
            min-height: 240px;
          }
          .page-editor p {
            margin: 0 0 1em 0;
          }
          .page-editor h1 {
            font-family: var(--editor-font, Georgia, 'Times New Roman', serif);
            font-size: 1.7em;
            font-weight: 600;
            margin: 0.8em 0 0.4em;
            color: #1a1a1a;
          }
          .page-editor h2 {
            font-family: var(--editor-font, Georgia, 'Times New Roman', serif);
            font-size: 1.35em;
            font-weight: 600;
            margin: 0.7em 0 0.35em;
            color: #1a1a1a;
          }
          .page-editor h3 {
            font-size: 1.15em;
            font-weight: 600;
            margin: 0.6em 0 0.3em;
            color: #1a1a1a;
          }
          .page-editor h4 {
            font-size: 1em;
            font-weight: 600;
            margin: 0.5em 0 0.25em;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #1a1a1a;
          }
          .page-editor p.is-editor-empty:first-child::before {
            content: '${placeholder.replace(/'/g, "\\'")}';
            color: #c0bdb8;
            pointer-events: none;
            float: left;
            height: 0;
          }
          .page-editor strong {
            font-weight: 700;
            color: #1a1a1a;
          }
          .page-editor em {
            font-style: italic;
          }
          .page-editor u {
            text-decoration: underline;
            text-underline-offset: 3px;
          }
          .page-editor ul {
            list-style: disc;
            padding-left: 1.6em;
            margin: 0.5em 0 1em;
          }
          .page-editor ol {
            list-style: decimal;
            padding-left: 1.6em;
            margin: 0.5em 0 1em;
          }
          .page-editor li {
            margin: 0.2em 0;
          }
          .page-editor li p {
            margin: 0;
          }
          .page-editor blockquote {
            border-left: 3px solid #d0cdc8;
            padding-left: 1.2em;
            margin: 1em 0;
            color: #555;
            font-style: italic;
          }
          .page-editor code {
            background: rgba(0,0,0,0.06);
            padding: 2px 5px;
            border-radius: 0;
            font-size: 0.88em;
            font-family: 'Courier Prime', 'Courier New', monospace;
            color: #333;
          }
          .page-editor pre {
            background: #f0ede8;
            border: 1px solid #ddd;
            padding: 14px 16px;
            margin: 1em 0;
            overflow-x: auto;
            border-radius: 0;
          }
          .page-editor pre code {
            background: none;
            border: none;
            padding: 0;
            border-radius: 0;
          }
          .page-editor hr {
            border: none;
            text-align: center;
            margin: 2em 0;
            overflow: visible;
            height: 1em;
            line-height: 1em;
            color: #999;
          }
          .page-editor hr::after {
            content: '* \\00a0 * \\00a0 *';
            display: inline-block;
            font-family: Georgia, serif;
            font-size: 1em;
            letter-spacing: 0.4em;
          }
        `}</style>

        {/* Document title */}
        <input
          className="page-title-input"
          value={titleValue}
          onChange={e => setTitleValue(e.target.value)}
          onBlur={() => {
            const text = titleValue.trim();
            if (text && onTitleBlur) onTitleBlur(text);
            else if (!text) setTitleValue(documentTitle || '');
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
              setTimeout(() => editor?.commands.focus(), 50);
            }
          }}
          placeholder="Untitled"
          style={{
            display: 'block',
            width: '100%',
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontFamily: 'var(--editor-font, Georgia, \'Times New Roman\', serif)',
            fontSize: '28px',
            fontWeight: '400',
            color: '#1a1a1a',
            marginBottom: '20px',
            padding: 0,
            boxSizing: 'border-box',
          }}
        />

        {/* Divider */}
        <div style={{ height: '1px', background: '#d4d0ca', marginBottom: '28px', width: '100%' }} />

        {/* TipTap body */}
        <EditorContent editor={editor} />
      </div>
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
