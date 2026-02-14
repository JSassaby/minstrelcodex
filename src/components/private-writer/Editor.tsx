import { useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import FormattingToolbar from './FormattingToolbar';

export interface EditorHandle {
  focus: () => void;
  getHTML: () => string;
  setContent: (html: string) => void;
}

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  fontSize: number;
  placeholder: string;
  readOnly?: boolean;
}

const Editor = forwardRef<EditorHandle, EditorProps>(({ content, onChange, fontSize, placeholder, readOnly }, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'terminal-editor',
        spellcheck: 'false',
      },
    },
  });

  // Sync readOnly
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Sync content from outside (e.g. loading a document)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content]);

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
    getHTML: () => editor?.getHTML() || '',
    setContent: (html: string) => editor?.commands.setContent(html || '', { emitUpdate: false }),
  }), [editor]);

  // Focus on mount
  useEffect(() => {
    if (editor) {
      setTimeout(() => editor.commands.focus(), 100);
    }
  }, [editor]);

  if (!editor) return null;

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
      <FormattingToolbar editor={editor} readOnly={readOnly} />
      <div
        style={{
          flex: 1,
          padding: '20px',
          overflow: 'auto',
        }}
      >
        <style>{`
          .terminal-editor {
            outline: none;
            color: var(--terminal-text);
            font-family: 'Courier Prime', 'Courier New', monospace;
            font-size: ${fontSize}px;
            line-height: 1.6;
            text-shadow: 0 0 5px var(--terminal-glow);
            caret-color: var(--terminal-text);
            min-height: 100%;
          }
          .terminal-editor p {
            margin: 0 0 0.5em 0;
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
            text-shadow: 0 0 8px var(--terminal-glow);
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
            border-top: 1px solid var(--terminal-text);
            margin: 1em 0;
          }
        `}</style>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;
