import { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { getAllFonts, addCustomFont, removeCustomFont, preloadBuiltInFonts, type FontOption } from '@/lib/fonts';

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

interface FormattingToolbarProps {
  editor: Editor;
  readOnly?: boolean;
  fontSize: number;
  fontFamily: string;
  sidebarOpen?: boolean;
  focusMode?: boolean;
  onChangeFontSize: (delta: number) => void;
  onChangeFontFamily: (font: string) => void;
  onToggleSidebar?: () => void;
  onToggleFocusMode?: () => void;
}

interface ToolbarButton {
  label: string;
  shortcut: string;
  action: () => void;
  isActive: boolean;
}

// Pill button style
const pillBtn = (active: boolean): React.CSSProperties => ({
  padding: '4px 11px',
  borderRadius: '7px',
  border: active ? '1.5px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
  background: active ? 'var(--terminal-accent)' : 'var(--terminal-surface)',
  color: active ? 'var(--terminal-bg)' : 'var(--terminal-text)',
  cursor: 'pointer',
  fontFamily: uiFont,
  fontSize: '12px',
  fontWeight: active ? '600' : '500',
  transition: 'all 0.12s',
  opacity: active ? 1 : 0.75,
  whiteSpace: 'nowrap' as const,
  lineHeight: '1.4',
});

const CATEGORY_LABELS: Record<string, string> = {
  mono: '🔤 Mono',
  serif: '📖 Serif',
  sans: '✦ Sans',
  display: '✨ Display',
  custom: '🎨 Custom',
};

export default function FormattingToolbar({
  editor, readOnly, fontSize, fontFamily, sidebarOpen, focusMode,
  onChangeFontSize, onChangeFontFamily, onToggleSidebar, onToggleFocusMode,
}: FormattingToolbarProps) {
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [addingFont, setAddingFont] = useState(false);
  const [newFontName, setNewFontName] = useState('');
  const [fonts, setFonts] = useState<FontOption[]>(() => getAllFonts());
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Preload built-in fonts on mount
  useEffect(() => { preloadBuiltInFonts(); }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!fontMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setFontMenuOpen(false);
        setAddingFont(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fontMenuOpen]);

  if (readOnly) return null;

  const currentLabel = fonts.find(f => f.value === fontFamily)?.label || 'Font';

  const grouped: Record<string, FontOption[]> = {};
  const customFonts = fonts.filter(f => !f.builtIn);
  const builtInFonts = fonts.filter(f => f.builtIn);

  for (const f of builtInFonts) {
    (grouped[f.category] ??= []).push(f);
  }

  const handleAddFont = () => {
    if (!newFontName.trim()) return;
    const option = addCustomFont(newFontName);
    onChangeFontFamily(option.value);
    setFonts(getAllFonts());
    setNewFontName('');
    setAddingFont(false);
  };

  const handleRemoveFont = (label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCustomFont(label);
    setFonts(getAllFonts());
  };

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
    { label: '|', shortcut: '', action: () => {}, isActive: false },
    { label: '* * *', shortcut: 'Ctrl+Shift+Enter', action: () => editor.chain().focus().setHorizontalRule().run(), isActive: false },
  ];

  const divider = (key: string) => (
    <span key={key} style={{ width: '1px', height: '18px', background: 'var(--terminal-border)', margin: '0 5px', flexShrink: 0 }} />
  );

  return (
    <div style={{ display: 'flex', gap: '4px', padding: '6px 14px', borderBottom: '1px solid var(--terminal-border)', backgroundColor: 'var(--terminal-surface)', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Files toggle */}
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

      {/* Focus mode toggle */}
      {onToggleFocusMode && (
        <>
          <button
            onClick={onToggleFocusMode}
            title="Focus mode (F11)"
            style={pillBtn(!!focusMode)}
            onMouseEnter={e => { if (!focusMode) { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'var(--terminal-border)'; } }}
            onMouseLeave={e => { if (!focusMode) { (e.currentTarget as HTMLElement).style.opacity = '0.75'; (e.currentTarget as HTMLElement).style.background = 'var(--terminal-surface)'; } }}
          >
            ⛶ Focus
          </button>
          {divider('sep-focus')}
        </>
      )}

      {/* Font family picker */}
      <div style={{ position: 'relative' }}>
        <button
          ref={triggerRef}
          onClick={() => setFontMenuOpen(!fontMenuOpen)}
          style={{
            ...pillBtn(fontMenuOpen),
            maxWidth: '160px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentLabel}</span>
          <span style={{ fontSize: '8px', opacity: 0.6 }}>▼</span>
        </button>

        {fontMenuOpen && (
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              zIndex: 9999,
              top: (triggerRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
              left: triggerRef.current?.getBoundingClientRect().left ?? 0,
              width: '260px',
              maxHeight: '380px',
              overflowY: 'auto',
              background: 'var(--terminal-bg)',
              border: '1px solid var(--terminal-border)',
              borderRadius: '12px',
              padding: '6px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              fontFamily: uiFont,
            }}
          >
            {/* Built-in categories */}
            {Object.entries(grouped).map(([cat, catFonts]) => (
              <div key={cat}>
                <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--terminal-muted)', padding: '6px 8px 3px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {CATEGORY_LABELS[cat] || cat}
                </div>
                {catFonts.map(f => (
                  <button
                    key={f.value}
                    onClick={() => { onChangeFontFamily(f.value); setFontMenuOpen(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: fontFamily === f.value ? 'var(--terminal-accent)' : 'transparent',
                      color: fontFamily === f.value ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                      fontFamily: f.value,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (fontFamily !== f.value) (e.currentTarget.style.background = 'var(--terminal-surface)'); }}
                    onMouseLeave={e => { if (fontFamily !== f.value) (e.currentTarget.style.background = 'transparent'); }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ))}

            {/* Custom fonts */}
            {customFonts.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--terminal-muted)', padding: '6px 8px 3px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {CATEGORY_LABELS.custom}
                </div>
                {customFonts.map(f => (
                  <div key={f.value} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => { onChangeFontFamily(f.value); setFontMenuOpen(false); }}
                      style={{
                        flex: 1,
                        textAlign: 'left',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: fontFamily === f.value ? 'var(--terminal-accent)' : 'transparent',
                        color: fontFamily === f.value ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                        fontFamily: f.value,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (fontFamily !== f.value) (e.currentTarget.style.background = 'var(--terminal-surface)'); }}
                      onMouseLeave={e => { if (fontFamily !== f.value) (e.currentTarget.style.background = 'transparent'); }}
                    >
                      {f.label}
                    </button>
                    <button
                      onClick={(e) => handleRemoveFont(f.label, e)}
                      title="Remove font"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--terminal-muted)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        opacity: 0.6,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Divider + Add custom font */}
            <div style={{ borderTop: '1px solid var(--terminal-border)', margin: '6px 0' }} />
            {addingFont ? (
              <div style={{ padding: '4px 6px', display: 'flex', gap: '4px' }}>
                <input
                  autoFocus
                  value={newFontName}
                  onChange={e => setNewFontName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddFont(); if (e.key === 'Escape') { setAddingFont(false); setNewFontName(''); } }}
                  placeholder="Google Font name…"
                  style={{
                    flex: 1,
                    background: 'var(--terminal-surface)',
                    border: '1px solid var(--terminal-border)',
                    borderRadius: '7px',
                    padding: '5px 8px',
                    fontSize: '12px',
                    fontFamily: uiFont,
                    color: 'var(--terminal-text)',
                    outline: 'none',
                  }}
                />
                <button onClick={handleAddFont} style={{ ...pillBtn(false), fontSize: '11px', padding: '4px 10px' }}>
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingFont(true)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--terminal-accent)',
                  fontSize: '12px',
                  fontFamily: uiFont,
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--terminal-surface)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                + Add Google Font…
              </button>
            )}
          </div>
        )}
      </div>

      {/* Font size */}
      <button onClick={() => onChangeFontSize(-2)} title="Decrease text size (Ctrl+-)" style={pillBtn(false)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
      >A−</button>
      <span style={{ padding: '4px 6px', fontSize: '12px', opacity: 0.55, color: 'var(--terminal-text)', fontFamily: uiFont, minWidth: '28px', textAlign: 'center', fontWeight: '500' }}>
        {fontSize}
      </span>
      <button onClick={() => onChangeFontSize(2)} title="Increase text size (Ctrl++)" style={pillBtn(false)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
      >A+</button>

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
