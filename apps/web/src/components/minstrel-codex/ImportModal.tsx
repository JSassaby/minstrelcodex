import { useState, useRef, useCallback, useEffect } from 'react';
import { DESIGN_TOKENS as DT } from '@minstrelcodex/core';
import { importFiles } from '@minstrelcodex/core';
import type { ImportedFile } from '@minstrelcodex/core';

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (files: ImportedFile[]) => void;
}

type Stage = 'select' | 'importing' | 'done';

interface PendingFile {
  file: File;
  ext: 'txt' | 'md' | 'html' | 'docx' | 'pdf';
  relativePath: string;
}

const SUPPORTED_EXTS = ['.txt', '.md', '.html', '.docx', '.pdf'] as const;

function detectExt(name: string): 'txt' | 'md' | 'html' | 'docx' | 'pdf' | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.txt'))  return 'txt';
  if (lower.endsWith('.md'))   return 'md';
  if (lower.endsWith('.html')) return 'html';
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.pdf'))  return 'pdf';
  return null;
}

function BadgeExt({ ext }: { ext: 'txt' | 'md' | 'html' | 'docx' | 'pdf' }) {
  const styles: Record<typeof ext, React.CSSProperties> = {
    txt:  { border: `1px solid ${DT.COLORS.text.muted}`,   color: DT.COLORS.text.muted },
    md:   { border: DT.BORDERS.active,                      color: DT.COLORS.text.teal },
    html: { border: DT.BORDERS.default,                     color: DT.COLORS.text.muted },
    docx: { border: DT.BORDERS.gold,                        color: DT.COLORS.text.gold },
    pdf:  { border: `1px solid ${DT.COLORS.text.danger}`,   color: DT.COLORS.text.danger },
  };
  return (
    <span style={{
      ...styles[ext],
      fontSize: '9px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      padding: '1px 5px',
      fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
      flexShrink: 0,
    }}>
      .{ext}
    </span>
  );
}

// Overlay + modal shared styles (mirrors NovelWizard/ChronicleLedger pattern)
const OVERLAY: React.CSSProperties = {
  position:        'fixed',
  inset:           0,
  background:      'rgba(0, 0, 0, 0.85)',
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  zIndex:          DT.Z_INDEX.modal,
  fontFamily:      DT.TYPOGRAPHY.ui.fontFamily,
};

const MODAL: React.CSSProperties = {
  width:           '520px',
  maxHeight:       '80vh',
  display:         'flex',
  flexDirection:   'column',
  background:      DT.COLORS.background.panel,
  border:          DT.BORDERS.default,
  borderRadius:    DT.BORDER_RADIUS.modal,
  boxShadow:       DT.SHADOWS.modal,
  overflow:        'hidden',
};

export default function ImportModal({ isOpen, onClose, onComplete }: ImportModalProps) {
  const [stage, setStage]         = useState<Stage>('select');
  const [pending, setPending]     = useState<PendingFile[]>([]);
  const [progress, setProgress]   = useState(0);          // 0–100
  const [statuses, setStatuses]   = useState<Array<'pending' | 'ok' | 'err'>>([]);
  const [imported, setImported]   = useState<ImportedFile[]>([]);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // ── Reset on close ───────────────────────────────────────────────

  const handleClose = useCallback(() => {
    setStage('select');
    setPending([]);
    setProgress(0);
    setStatuses([]);
    setImported([]);
    onClose();
  }, [onClose]);

  // ── Escape key to close ──────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  // ── File selection helpers ───────────────────────────────────────

  const addFiles = useCallback((fileList: FileList) => {
    const next: PendingFile[] = [];
    for (const f of Array.from(fileList)) {
      const ext = detectExt(f.name);
      if (!ext) continue;
      const relativePath =
        (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      next.push({ file: f, ext, relativePath });
    }
    // Merge with existing, de-dupe by relativePath
    setPending(prev => {
      const existing = new Set(prev.map(p => p.relativePath));
      const merged = [...prev];
      for (const p of next) {
        if (!existing.has(p.relativePath)) merged.push(p);
      }
      return merged.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    });
  }, []);

  // ── Import runner ────────────────────────────────────────────────

  const runImport = useCallback(async () => {
    if (pending.length === 0) return;
    setStage('importing');
    setProgress(0);
    setStatuses(pending.map(() => 'pending'));

    const results: ImportedFile[] = [];
    const newStatuses: Array<'pending' | 'ok' | 'err'> = pending.map(() => 'pending');

    for (let i = 0; i < pending.length; i++) {
      try {
        const [result] = await importFiles([pending[i].file]);
        if (result) {
          results.push(result);
          newStatuses[i] = 'ok';
        } else {
          newStatuses[i] = 'err';
        }
      } catch {
        newStatuses[i] = 'err';
      }
      setStatuses([...newStatuses]);
      setProgress(Math.round(((i + 1) / pending.length) * 100));
    }

    setImported(results);
    setStage('done');
  }, [pending]);

  const handleDone = useCallback(() => {
    onComplete(imported);
    handleClose();
  }, [onComplete, imported, handleClose]);

  if (!isOpen) return null;

  // ── Shared button styles ─────────────────────────────────────────

  const primaryBtn: React.CSSProperties = {
    background:    DT.COLORS.background.input,
    border:        DT.BORDERS.active,
    borderRadius:  DT.BORDER_RADIUS.button,
    color:         DT.COLORS.text.teal,
    fontFamily:    DT.TYPOGRAPHY.ui.fontFamily,
    fontSize:      '11px',
    fontWeight:    600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding:       '9px 20px',
    cursor:        'pointer',
  };

  const ghostBtn: React.CSSProperties = {
    background:    'transparent',
    border:        DT.BORDERS.default,
    borderRadius:  DT.BORDER_RADIUS.button,
    color:         DT.COLORS.text.muted,
    fontFamily:    DT.TYPOGRAPHY.ui.fontFamily,
    fontSize:      '11px',
    fontWeight:    500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding:       '9px 20px',
    cursor:        'pointer',
  };

  const disabledBtn: React.CSSProperties = {
    ...primaryBtn,
    border:  DT.BORDERS.subtle,
    color:   DT.COLORS.text.muted,
    cursor:  'not-allowed',
    opacity: 0.5,
  };

  const sectionHeader: React.CSSProperties = {
    ...DT.TYPOGRAPHY.sectionHeader,
    color:         DT.COLORS.text.teal,
    marginBottom:  '20px',
  };

  // ── Stage: select ────────────────────────────────────────────────

  const selectStage = (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_EXTS.join(',')}
        multiple
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
        {...{ webkitdirectory: '' }}
      />

      {/* Pick buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button
          style={{
            flex: 1,
            padding: '18px 12px',
            background: DT.COLORS.background.input,
            border: DT.BORDERS.default,
            borderRadius: DT.BORDER_RADIUS.button,
            color: DT.COLORS.text.primary,
            fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            lineHeight: 1.6,
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: '20px', marginBottom: '6px' }}>📄</div>
          Import Files
        </button>
        <button
          style={{
            flex: 1,
            padding: '18px 12px',
            background: DT.COLORS.background.input,
            border: DT.BORDERS.default,
            borderRadius: DT.BORDER_RADIUS.button,
            color: DT.COLORS.text.primary,
            fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            lineHeight: 1.6,
          }}
          onClick={() => folderInputRef.current?.click()}
        >
          <div style={{ fontSize: '20px', marginBottom: '6px' }}>📁</div>
          Import Folder
        </button>
      </div>

      {/* Format hint */}
      <div style={{
        fontSize: '10px',
        color: DT.COLORS.text.muted,
        fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
        opacity: 0.6,
        marginBottom: '16px',
        letterSpacing: '0.05em',
      }}>
        Supported formats:&nbsp;&nbsp;.txt&nbsp;&nbsp;.md&nbsp;&nbsp;.html&nbsp;&nbsp;.docx&nbsp;&nbsp;.pdf
      </div>

      {/* Preview list */}
      {pending.length > 0 && (
        <div style={{
          border: DT.BORDERS.subtle,
          maxHeight: '220px',
          overflowY: 'auto',
          marginBottom: '20px',
        }}>
          {pending.map((p, i) => (
            <div
              key={p.relativePath}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '10px',
                padding:        '7px 12px',
                borderBottom:   i < pending.length - 1 ? DT.BORDERS.subtle : 'none',
                background:     i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.15)',
              }}
            >
              <BadgeExt ext={p.ext} />
              <span style={{
                flex:       1,
                fontSize:   '11px',
                fontFamily: DT.TYPOGRAPHY.body.fontFamily,
                color:      DT.COLORS.text.primary,
                overflow:   'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {p.relativePath}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={ghostBtn} onClick={handleClose}>Cancel</button>
        <button
          style={pending.length > 0 ? primaryBtn : disabledBtn}
          disabled={pending.length === 0}
          onClick={runImport}
        >
          Import {pending.length > 0 ? `${pending.length} file${pending.length === 1 ? '' : 's'}` : ''} →
        </button>
      </div>
    </>
  );

  // ── Stage: importing / done ──────────────────────────────────────

  const importingStage = (
    <>
      {/* Progress bar */}
      <div style={{
        height:       '4px',
        border:       DT.BORDERS.default,
        background:   DT.COLORS.background.input,
        marginBottom: '20px',
        borderRadius: 0,
      }}>
        <div style={{
          height:     '100%',
          width:      `${progress}%`,
          background: DT.COLORS.ui.teal,
          transition: 'width 0.1s linear',
        }} />
      </div>

      {/* File status list */}
      <div style={{
        maxHeight:  '300px',
        overflowY:  'auto',
        border:     DT.BORDERS.subtle,
        marginBottom: '20px',
      }}>
        {pending.map((p, i) => {
          const status = statuses[i] ?? 'pending';
          return (
            <div
              key={p.relativePath}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '10px',
                padding:      '7px 12px',
                borderBottom: i < pending.length - 1 ? DT.BORDERS.subtle : 'none',
                background:   i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.15)',
              }}
            >
              <span style={{
                fontSize:   '12px',
                width:      '16px',
                flexShrink: 0,
                color:      status === 'ok' ? DT.COLORS.ui.teal
                          : status === 'err' ? DT.COLORS.text.danger
                          : DT.COLORS.text.muted,
              }}>
                {status === 'ok' ? '✓' : status === 'err' ? '✗' : '·'}
              </span>
              <BadgeExt ext={p.ext} />
              <span style={{
                flex:         1,
                fontSize:     '11px',
                fontFamily:   DT.TYPOGRAPHY.body.fontFamily,
                color:        DT.COLORS.text.primary,
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
                opacity:      status === 'pending' ? 0.5 : 1,
              }}>
                {p.relativePath}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary / Done button */}
      {stage === 'done' && (
        <div style={{
          display:     'flex',
          justifyContent: 'space-between',
          alignItems:  'center',
        }}>
          <div style={{
            fontSize:   '11px',
            color:      DT.COLORS.text.muted,
            fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
            opacity:    0.7,
          }}>
            {imported.length} file{imported.length === 1 ? '' : 's'} imported successfully
          </div>
          <button style={primaryBtn} onClick={handleDone}>Done</button>
        </div>
      )}
    </>
  );

  return (
    <div style={OVERLAY}>
      <div style={MODAL}>
        {/* ── Header ─────────────────────────────────────── */}
        <div style={{
          padding:      '24px 28px 0',
          flexShrink:   0,
        }}>
          <div style={sectionHeader}>
            {stage === 'select'    && 'Import Your Works'}
            {stage === 'importing' && 'Importing…'}
            {stage === 'done'      && 'Import Complete'}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        <div style={{
          padding:    '0 28px 28px',
          overflowY:  'auto',
          flex:       1,
        }}>
          {stage === 'select'               ? selectStage   : importingStage}
        </div>
      </div>
    </div>
  );
}
