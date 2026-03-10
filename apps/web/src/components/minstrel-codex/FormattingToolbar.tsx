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
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [formatMenuIdx, setFormatMenuIdx] = useState(0);
  const [addingFont, setAddingFont] = useState(false);
  const [newFontName, setNewFontName] = useState('');
  const [fonts, setFonts] = useState<FontOption[]>(() => getAllFonts());
  const [sizeEditing, setSizeEditing] = useState(false);
  const [sizeInputVal, setSizeInputVal] = useState(String(fontSize));
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const formatTriggerRef = useRef<HTMLButtonElement>(null);

  // Sync size display when prop changes externally (keyboard shortcut etc.)
  useEffect(() => {
    if (!sizeEditing) setSizeInputVal(String(fontSize));
  }, [fontSize, sizeEditing]);

  // Preload built-in fonts on mount
  useEffect(() => { preloadBuiltInFonts(); }, []);

  // Close font menu on outside click
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

  // Close format menu on outside click
  useEffect(() => {
    if (!formatMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as Node) &&
          formatTriggerRef.current && !formatTriggerRef.current.contains(e.target as Node)) {
        setFormatMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [formatMenuOpen]);

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

  const inlineButtons: ToolbarButton[] = [
    { label: 'B', shortcut: 'Ctrl+B', action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold') },
    { label: 'I', shortcut: 'Ctrl+I', action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic') },
    { label: 'U', shortcut: 'Ctrl+U', action: () => editor.chain().focus().toggleUnderline().run(), isActive: editor.isActive('underline') },
  ];

  const formatItems = [
    { section: 'HEADINGS' },
    { label: 'Heading 1', shortcut: 'Ctrl+Alt+1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }) },
    { label: 'Heading 2', shortcut: 'Ctrl+Alt+2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }) },
    { label: 'Heading 3', shortcut: 'Ctrl+Alt+3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive('heading', { level: 3 }) },
    { label: 'Heading 4', shortcut: 'Ctrl+Alt+4', action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(), isActive: editor.isActive('heading', { level: 4 }) },
    { section: 'LISTS' },
    { label: '• Bullet List', shortcut: 'Ctrl+Shift+8', action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList') },
    { label: '1. Ordered List', shortcut: 'Ctrl+Shift+7', action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive('orderedList') },
    { section: 'BLOCKS' },
    { label: '* * *  Scene Break', shortcut: 'Ctrl+Shift+Enter', action: () => editor.chain().focus().setHorizontalRule().run(), isActive: false },
  ] as const;

  // Indices of selectable items (non-section)
  const selectableFormatItems = formatItems.filter(item => !('section' in item));
  const isFormatActive = selectableFormatItems.some(item => 'isActive' in item && item.isActive);

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
              padding: '6px',
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
      <button onClick={() => onChangeFontSize(-1)} title="Decrease text size (Ctrl+-)" style={pillBtn(false)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
      >A−</button>
      {sizeEditing ? (
        <input
          value={sizeInputVal}
          onChange={e => setSizeInputVal(e.target.value)}
          onBlur={() => {
            const parsed = parseInt(sizeInputVal, 10);
            if (!isNaN(parsed)) onChangeFontSize(Math.max(12, Math.min(32, parsed)) - fontSize);
            setSizeEditing(false);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const parsed = parseInt(sizeInputVal, 10);
              if (!isNaN(parsed)) onChangeFontSize(Math.max(12, Math.min(32, parsed)) - fontSize);
              setSizeEditing(false);
            }
            if (e.key === 'Escape') { setSizeEditing(false); setSizeInputVal(String(fontSize)); }
          }}
          autoFocus
          style={{ width: '34px', textAlign: 'center', fontSize: '12px', fontFamily: uiFont, background: 'var(--terminal-surface)', border: '1px solid var(--terminal-accent)', color: 'var(--terminal-text)', padding: '3px 4px', outline: 'none' }}
        />
      ) : (
        <span
          onClick={() => { setSizeEditing(true); setSizeInputVal(String(fontSize)); }}
          title="Click to set font size"
          style={{ padding: '4px 6px', fontSize: '12px', opacity: 0.55, color: 'var(--terminal-text)', fontFamily: uiFont, minWidth: '28px', textAlign: 'center', fontWeight: '500', cursor: 'text' }}
        >
          {fontSize}
        </span>
      )}
      <button onClick={() => onChangeFontSize(1)} title="Increase text size (Ctrl++)" style={pillBtn(false)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
      >A+</button>

      {divider('sep-size')}

      {/* Format dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          ref={formatTriggerRef}
          onClick={() => setFormatMenuOpen(!formatMenuOpen)}
          title="Formatting options"
          style={{ ...pillBtn(isFormatActive || formatMenuOpen), display: 'flex', alignItems: 'center', gap: '4px' }}
          onMouseEnter={e => { if (!isFormatActive && !formatMenuOpen) { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'var(--terminal-border)'; } }}
          onMouseLeave={e => { if (!isFormatActive && !formatMenuOpen) { (e.currentTarget as HTMLElement).style.opacity = '0.75'; (e.currentTarget as HTMLElement).style.background = 'var(--terminal-surface)'; } }}
        >
          Format <span style={{ fontSize: '8px', opacity: 0.6 }}>▼</span>
        </button>
        {formatMenuOpen && (
          <div
            ref={formatMenuRef}
            style={{
              position: 'fixed',
              zIndex: 9999,
              top: (formatTriggerRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
              left: formatTriggerRef.current?.getBoundingClientRect().left ?? 0,
              width: '220px',
              background: 'var(--terminal-bg)',
              border: '1px solid var(--terminal-border)',
              padding: '6px',
              fontFamily: uiFont,
            }}
          >
            {formatItems.map((item, idx) => {
              if ('section' in item) {
                return (
                  <div key={`sec-${idx}`} style={{ fontSize: '10px', fontWeight: '600', color: 'var(--terminal-muted)', padding: '6px 8px 3px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {item.section}
                  </div>
                );
              }
              return (
                <button
                  key={item.label}
                  onClick={() => { item.action(); setFormatMenuOpen(false); }}
                  title={item.shortcut}
                  style={{
                    display: 'flex',
                    width: '100%',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'left',
                    padding: '6px 10px',
                    border: 'none',
                    background: item.isActive ? 'var(--terminal-accent)' : 'transparent',
                    color: item.isActive ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                    fontSize: '12px',
                    fontFamily: uiFont,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!item.isActive) (e.currentTarget.style.background = 'var(--terminal-surface)'); }}
                  onMouseLeave={e => { if (!item.isActive) (e.currentTarget.style.background = 'transparent'); }}
                >
                  <span>{item.label}</span>
                  <span style={{ opacity: 0.35, fontSize: '10px', letterSpacing: '0.02em' }}>{item.shortcut}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {divider('sep-fmt')}

      {/* Inline formatting: B / I / U */}
      {inlineButtons.map((btn) => (
        <button
          key={btn.label}
          onClick={btn.action}
          title={btn.shortcut ? `${btn.label} (${btn.shortcut})` : btn.label}
          style={{
            ...pillBtn(btn.isActive),
            fontWeight: btn.label === 'B' ? '700' : '500',
            fontStyle: btn.label === 'I' ? 'italic' : 'normal',
            textDecoration: btn.label === 'U' ? 'underline' : 'none',
          }}
          onMouseEnter={e => { if (!btn.isActive) { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'var(--terminal-border)'; } }}
          onMouseLeave={e => { if (!btn.isActive) { (e.currentTarget as HTMLElement).style.opacity = '0.75'; (e.currentTarget as HTMLElement).style.background = 'var(--terminal-surface)'; } }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
