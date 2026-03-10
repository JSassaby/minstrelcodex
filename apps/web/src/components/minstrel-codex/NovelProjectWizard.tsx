import { useState, useEffect, useMemo, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { DESIGN_TOKENS as DT } from '@minstrelcodex/core';
import { useGoogleToken } from '@/hooks/useGoogleToken';

export type NamingFormat  = 'ch-abr' | 'abr-ch' | 'abr_ch';
export type GenrePreset   = 'novel' | 'screenplay' | 'short-stories' | 'custom';
export type StorageLocation = 'local' | 'google-drive';
export type CloudSyncMode = 'direct' | 'periodic';

export interface NovelProjectConfig {
  title:               string;
  abbreviation:        string;
  chapterLabel:        string;
  chapterCount:        number;
  namingFormat:        NamingFormat;
  genre:               GenrePreset;
  targetWordCount:     number;
  pov:                 string;
  tense:               string;
  styleNotes:          string;
  includeBible:        boolean;
  includeNotes:        boolean;
  includeResearch:     boolean;
  includeWorldbuilding: boolean;
  includeFrontMatter:  boolean;
  storageLocation:     StorageLocation;
  cloudSyncMode:       CloudSyncMode;
}

interface Props {
  visible:          boolean;
  onClose:          () => void;
  onCreate:         (config: NovelProjectConfig) => void;
  onLinkStorage:    (location: StorageLocation) => void;
  mode?:            'create' | 'settings';
  /** In settings mode, the project whose settings to load/save. */
  projectTitle?:    string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateAbbreviation(title: string): string {
  if (!title.trim()) return '';
  const words = title.trim().split(/\s+/).filter(
    w => !['the','a','an','of','and','in','to','for'].includes(w.toLowerCase()),
  );
  if (words.length === 0) return title.trim().substring(0, 3).toUpperCase();
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').toUpperCase().substring(0, 4);
}

function formatChapterName(
  format: NamingFormat,
  abr: string,
  num: number,
  label: string = 'Chapter',
): string {
  const ch = String(num).padStart(2, '0');
  switch (format) {
    case 'ch-abr': return `${label} ${ch} - ${abr}.txt`;
    case 'abr-ch': return `${abr} - ${label} ${ch}.txt`;
    case 'abr_ch': return `${abr}_Ch${ch}.txt`;
  }
}

const GENRE_FOLDERS: Record<GenrePreset, {
  bible: boolean; notes: boolean; research: boolean;
  worldbuilding: boolean; frontMatter: boolean;
}> = {
  novel:          { bible: true,  notes: true,  research: false, worldbuilding: false, frontMatter: false },
  screenplay:     { bible: true,  notes: true,  research: false, worldbuilding: false, frontMatter: false },
  'short-stories':{ bible: false, notes: true,  research: false, worldbuilding: false, frontMatter: false },
  custom:         { bible: true,  notes: true,  research: false, worldbuilding: false, frontMatter: false },
};

// ── Styles ───────────────────────────────────────────────────────────────────

const SECTION_STYLE: React.CSSProperties = {
  marginBottom: '16px',
  padding:      '18px 20px',
  border:       DT.BORDERS.default,
  borderRadius: 0,
  background:   DT.COLORS.background.panel,
};

const SECTION_HEADER: React.CSSProperties = {
  ...DT.TYPOGRAPHY.sectionHeader,
  fontSize:      '11px',
  marginBottom:  '14px',
  borderBottom:  DT.BORDERS.subtle,
  paddingBottom: '10px',
  color:         DT.COLORS.ui.teal,
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize:      '10px',
  marginBottom:  '7px',
  letterSpacing: '0.12em',
  fontWeight:    600,
  textTransform: 'uppercase' as const,
  color:         DT.COLORS.ui.teal,
  fontFamily:    DT.TYPOGRAPHY.ui.fontFamily,
  display:       'block',
};

const HINT_STYLE: React.CSSProperties = {
  fontSize:   '11px',
  marginTop:  '5px',
  color:      DT.COLORS.text.muted,
  fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
  opacity:    0.7,
};

const INPUT_STYLE: React.CSSProperties = {
  width:      '100%',
  background: '#0d1117',
  border:     DT.BORDERS.default,
  borderRadius: 0,
  color:      '#c8c8c8',
  padding:    '10px 14px',
  fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
  fontSize:   '14px',
  outline:    'none',
  boxSizing:  'border-box' as const,
};

const OPTION_BTN = (selected: boolean): React.CSSProperties => ({
  padding:      '9px 16px',
  borderRadius: 0,
  background:   selected ? 'rgba(0, 223, 160, 0.08)' : DT.COLORS.background.input,
  color:        selected ? DT.COLORS.ui.teal : '#c8c8c8',
  border:       selected ? DT.BORDERS.active : DT.BORDERS.default,
  fontWeight:   selected ? 600 : 400,
  cursor:       'pointer',
  fontFamily:   DT.TYPOGRAPHY.ui.fontFamily,
  fontSize:     '13px',
  transition:   'all 0.12s',
  boxShadow:    'none',
});

const NAMING_ROW = (selected: boolean): React.CSSProperties => ({
  padding:      '9px 14px',
  borderRadius: 0,
  background:   selected ? '#0d1a2a' : DT.COLORS.background.input,
  color:        selected ? DT.COLORS.ui.teal : '#c8c8c8',
  border:       DT.BORDERS.default,
  borderLeft:   selected ? `3px solid ${DT.COLORS.ui.teal}` : DT.BORDERS.default,
  fontWeight:   selected ? 600 : 400,
  cursor:       'pointer',
  fontFamily:   DT.TYPOGRAPHY.ui.fontFamily,
  fontSize:     '13px',
  textAlign:    'left' as const,
  display:      'flex',
  alignItems:   'center',
  gap:          '10px',
  boxShadow:    'none',
  transition:   'all 0.12s',
});

const TOGGLE_STYLE = (on: boolean): React.CSSProperties => ({
  padding:      '7px 14px',
  borderRadius: 0,
  background:   on ? 'rgba(0, 223, 160, 0.08)' : DT.COLORS.background.input,
  color:        on ? DT.COLORS.ui.teal : '#c8c8c8',
  border:       on ? DT.BORDERS.active : DT.BORDERS.default,
  cursor:       'pointer',
  fontFamily:   DT.TYPOGRAPHY.ui.fontFamily,
  fontSize:     '12px',
  fontWeight:   on ? 600 : 400,
  display:      'flex',
  alignItems:   'center',
  gap:          '6px',
  transition:   'all 0.12s',
  boxShadow:    'none',
});

// ── Tree preview types ────────────────────────────────────────────────────────

type TreeNode = {
  kind:   'folder' | 'file' | 'bin';
  name:   string;
  depth:  number;
  muted?: boolean;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NovelProjectWizard({
  visible, onClose, onCreate, onLinkStorage, mode = 'create', projectTitle,
}: Props) {
  const [title,              setTitle]              = useState('');
  const [abbreviation,       setAbbreviation]       = useState('');
  const [abrManual,          setAbrManual]          = useState(false);
  const [chapterCount,       setChapterCount]       = useState(10);
  const [namingFormat,       setNamingFormat]       = useState<NamingFormat>('ch-abr');
  const [useCustomLabel,     setUseCustomLabel]     = useState(false);
  const [chapterLabel,       setChapterLabel]       = useState('Chapter');
  const [genre,              setGenre]              = useState<GenrePreset>('novel');
  const [targetWordCount,    setTargetWordCount]    = useState(80000);
  const [pov,                setPov]                = useState('');
  const [tense,              setTense]              = useState('');
  const [styleNotes,         setStyleNotes]         = useState('');
  const [includeBible,       setIncludeBible]       = useState(true);
  const [includeNotes,       setIncludeNotes]       = useState(true);
  const [includeResearch,    setIncludeResearch]    = useState(false);
  const [includeWorldbuilding, setIncludeWorldbuilding] = useState(false);
  const [includeFrontMatter, setIncludeFrontMatter] = useState(false);
  const [storageLocation,    setStorageLocation]    = useState<StorageLocation>('local');
  const [cloudSyncMode,      setCloudSyncMode]      = useState<CloudSyncMode>('direct');

  const customLabelRef = useRef<HTMLInputElement>(null);

  // Auto-generate abbreviation from title
  useEffect(() => {
    if (!abrManual) setAbbreviation(generateAbbreviation(title));
  }, [title, abrManual]);

  // Apply genre preset
  useEffect(() => {
    if (genre !== 'custom') {
      const p = GENRE_FOLDERS[genre];
      setIncludeBible(p.bible);
      setIncludeNotes(p.notes);
      setIncludeResearch(p.research);
      setIncludeWorldbuilding(p.worldbuilding);
      setIncludeFrontMatter(p.frontMatter);
    }
  }, [genre]);

  // Autofocus custom label input when revealed
  useEffect(() => {
    if (useCustomLabel) customLabelRef.current?.focus();
  }, [useCustomLabel]);

  // Reset / pre-populate on open
  useEffect(() => {
    if (!visible) return;
    if (mode === 'settings') {
      const key = `minstrel-project-settings:${projectTitle || ''}`;
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      // Pre-fill title from projectTitle prop; fall back to saved value
      setTitle(projectTitle || saved.title || '');
      setAbbreviation(saved.abbreviation || '');
      setAbrManual(!!saved.abbreviation);
      setChapterCount(saved.chapterCount || 10);
      setNamingFormat((saved.fileNamingFormat as NamingFormat) || 'ch-abr');
      const savedLabel = saved.chapterLabel || 'Chapter';
      setChapterLabel(savedLabel);
      setUseCustomLabel(savedLabel !== 'Chapter');
      setGenre((saved.projectType as GenrePreset) || 'novel');
      setTargetWordCount(saved.wordTarget || 80000);
      setPov(saved.pov || '');
      setTense(saved.tense || '');
      setStyleNotes(saved.styleNotes || '');
      setStorageLocation((saved.syncTarget as StorageLocation) || 'local');
      setCloudSyncMode(saved.cloudSyncMode || 'direct');
      setIncludeBible(saved.includeBible ?? true);
      setIncludeNotes(saved.includeNotes ?? true);
      setIncludeResearch(saved.includeResearch ?? false);
      setIncludeWorldbuilding(saved.includeWorldbuilding ?? false);
      setIncludeFrontMatter(saved.includeFrontMatter ?? false);
    } else {
      setTitle(''); setAbbreviation(''); setAbrManual(false);
      setChapterCount(10); setNamingFormat('ch-abr'); setGenre('novel');
      setChapterLabel('Chapter'); setUseCustomLabel(false);
      setTargetWordCount(80000); setPov(''); setTense(''); setStyleNotes('');
      setIncludeBible(true); setIncludeNotes(true); setIncludeResearch(false);
      setIncludeWorldbuilding(false); setIncludeFrontMatter(false);
      setStorageLocation('local'); setCloudSyncMode('direct');
    }
  }, [visible, mode, projectTitle]);

  const { googleToken } = useGoogleToken();
  const isGoogleConnected = !!googleToken;

  const abr = abbreviation || 'ABR';

  const canCreate = title.trim().length > 0 && abbreviation.trim().length > 0;

  // Build config object
  const buildConfig = (): NovelProjectConfig => ({
    title:               title.trim(),
    abbreviation:        abbreviation.trim(),
    chapterLabel:        chapterLabel || 'Chapter',
    chapterCount,
    namingFormat,
    genre,
    targetWordCount,
    pov:                 pov.trim(),
    tense:               tense.trim(),
    styleNotes:          styleNotes.trim(),
    includeBible,
    includeNotes,
    includeResearch,
    includeWorldbuilding,
    includeFrontMatter,
    storageLocation,
    cloudSyncMode,
  });

  const handleCreate = () => {
    if (!canCreate) return;
    const config = buildConfig();
    // Namespaced key: per-project settings
    const storageKey = mode === 'settings'
      ? `minstrel-project-settings:${projectTitle || config.title}`
      : `minstrel-project-settings:${config.title}`;
    const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
    localStorage.setItem(storageKey, JSON.stringify({
      ...config,
      fileNamingFormat: config.namingFormat,
      wordTarget:       config.targetWordCount,
      projectType:      config.genre,
      syncTarget:       config.storageLocation,
      pov:              config.pov,
      tense:            config.tense,
      styleNotes:       config.styleNotes,
      includeBible:     config.includeBible,
      includeNotes:     config.includeNotes,
      includeResearch:  config.includeResearch,
      includeWorldbuilding: config.includeWorldbuilding,
      includeFrontMatter: config.includeFrontMatter,
      cloudSyncMode:    config.cloudSyncMode,
      createdAt:        mode === 'settings'
        ? (existing.createdAt || new Date().toISOString())
        : new Date().toISOString(),
    }));
    if (mode === 'settings') {
      onClose();
    } else {
      onCreate(config);
    }
  };

  // ── Tree preview ───────────────────────────────────────────────────────────

  const treeNodes = useMemo((): TreeNode[] => {
    const nodes: TreeNode[] = [];
    const t = title || '[Title]';
    nodes.push({ kind: 'folder', name: t, depth: 0 });
    nodes.push({ kind: 'folder', name: 'Active', depth: 1 });
    nodes.push({ kind: 'folder', name: 'Chapters', depth: 2 });
    const maxShow = Math.min(chapterCount, 3);
    for (let i = 1; i <= maxShow; i++) {
      nodes.push({ kind: 'file', name: formatChapterName(namingFormat, abr, i, chapterLabel || 'Chapter'), depth: 3 });
    }
    if (chapterCount > 3) {
      nodes.push({ kind: 'file', name: `… (${chapterCount} total)`, depth: 3, muted: true });
    }
    if (includeBible) {
      nodes.push({ kind: 'folder', name: 'Bible', depth: 2 });
      nodes.push({ kind: 'file', name: `Characters - ${abr}.txt`, depth: 3 });
      nodes.push({ kind: 'file', name: `Outline - ${abr}.txt`, depth: 3 });
      nodes.push({ kind: 'file', name: `Setting - ${abr}.txt`, depth: 3 });
    }
    if (includeNotes) {
      nodes.push({ kind: 'folder', name: 'Notes', depth: 2 });
      nodes.push({ kind: 'file', name: `Ideas - ${abr}.txt`, depth: 3 });
    }
    if (includeResearch) {
      nodes.push({ kind: 'folder', name: 'Research', depth: 2 });
      nodes.push({ kind: 'file', name: `Research Notes - ${abr}.txt`, depth: 3 });
    }
    if (includeWorldbuilding) {
      nodes.push({ kind: 'folder', name: 'Worldbuilding', depth: 2 });
      nodes.push({ kind: 'file', name: `World Notes - ${abr}.txt`, depth: 3 });
    }
    if (includeFrontMatter) {
      nodes.push({ kind: 'folder', name: 'Front Matter', depth: 1 });
      nodes.push({ kind: 'file', name: `Dedication - ${abr}.txt`, depth: 2 });
      nodes.push({ kind: 'file', name: `Epigraph - ${abr}.txt`, depth: 2 });
      nodes.push({ kind: 'file', name: `Prologue - ${abr}.txt`, depth: 2 });
    }
    nodes.push({ kind: 'folder', name: 'Versions',  depth: 1 });
    nodes.push({ kind: 'folder', name: 'Snapshots', depth: 1 });
    nodes.push({ kind: 'file',   name: `Version History - ${abr}.txt`, depth: 1 });
    nodes.push({ kind: 'bin',    name: 'Recycle Bin', depth: 1, muted: true });
    return nodes;
  }, [title, chapterCount, namingFormat, abr, chapterLabel,
      includeBible, includeNotes, includeResearch, includeWorldbuilding, includeFrontMatter]);

  if (!visible) return null;

  const isSettings = mode === 'settings';
  const modalTitle = isSettings ? 'Project Settings' : 'New Novel Wizard';
  const primaryLabel = isSettings ? 'Save Changes' : 'Create Project';

  // ── Derived naming format options with live chapterLabel preview ───────────
  const label = chapterLabel || 'Chapter';
  const namingOptions = [
    { value: 'ch-abr' as NamingFormat, preview: `${label} 01 - ${abr}.txt` },
    { value: 'abr-ch' as NamingFormat, preview: `${abr} - ${label} 01.txt` },
    { value: 'abr_ch' as NamingFormat, preview: `${abr}_Ch01.txt` },
  ];

  return (
    <div
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(0, 0, 0, 0.92)',
        color:          '#c8c8c8',
        fontFamily:     DT.TYPOGRAPHY.ui.fontFamily,
        zIndex:         DT.Z_INDEX.modal,
        overflowY:      'auto',
        display:        'flex',
        flexDirection:  'column',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        borderBottom: DT.BORDERS.default,
        padding:      '14px 24px',
        display:      'flex',
        justifyContent: 'space-between',
        alignItems:   'center',
        flexShrink:   0,
        background:   DT.COLORS.background.panel,
      }}>
        <div style={{
          ...DT.TYPOGRAPHY.sectionHeader,
          fontSize: '13px',
          display:  'flex',
          alignItems: 'center',
          gap:      '10px',
        }}>
          <span style={{ opacity: 0.7 }}>📖</span> {modalTitle}
        </div>
        <button
          onClick={onClose}
          style={{
            background:   'transparent',
            border:       DT.BORDERS.default,
            borderRadius: 0,
            color:        '#888',
            padding:      '6px 14px',
            cursor:       'pointer',
            fontFamily:   DT.TYPOGRAPHY.ui.fontFamily,
            fontSize:     '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow:    'none',
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{
        flex:      1,
        overflowY: 'auto',
        padding:   '24px',
        display:   'flex',
        gap:       '24px',
      }}>

        {/* ── Left: Form ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, maxWidth: '640px' }}>

          {/* ── Title & Abbreviation ──────────────────────────────────── */}
          <div style={SECTION_STYLE}>
            <div style={SECTION_HEADER}>Title &amp; Abbreviation</div>
            <div style={{ marginBottom: '16px' }}>
              <label style={LABEL_STYLE}>Project Title</label>
              <input
                type="text"
                value={title}
                onChange={e => { if (!isSettings) setTitle(e.target.value); }}
                placeholder="Enter your novel title..."
                autoFocus={!isSettings}
                readOnly={isSettings}
                style={{
                  ...INPUT_STYLE,
                  ...(isSettings ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                }}
              />
              <div style={HINT_STYLE}>
                {isSettings
                  ? 'Project title cannot be changed after creation.'
                  : 'Working title — you can change it later.'}
              </div>
            </div>
            <div>
              <label style={LABEL_STYLE}>Abbreviation</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={abbreviation}
                  onChange={e => { setAbbreviation(e.target.value.toUpperCase()); setAbrManual(true); }}
                  placeholder="ABR"
                  maxLength={5}
                  style={{ ...INPUT_STYLE, width: '100px', textAlign: 'center', fontWeight: 700, fontSize: '18px' }}
                />
                {abrManual && (
                  <button
                    onClick={() => { setAbrManual(false); setAbbreviation(generateAbbreviation(title)); }}
                    style={{ ...OPTION_BTN(false), fontSize: '11px', padding: '5px 12px' }}
                  >
                    Auto
                  </button>
                )}
              </div>
              <div style={HINT_STYLE}>Used in all file names. Max 5 characters. Auto-generated from title.</div>
            </div>
          </div>

          {/* ── Chapters ─────────────────────────────────────────────── */}
          <div style={SECTION_STYLE}>
            <div style={SECTION_HEADER}>Chapters</div>

            {/* Chapter count */}
            <div style={{ marginBottom: '18px' }}>
              <label style={LABEL_STYLE}>Number of Chapters</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={chapterCount}
                  onChange={e => setChapterCount(Number(e.target.value))}
                  style={{ flex: 1, accentColor: DT.COLORS.ui.teal }}
                />
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={chapterCount}
                  onChange={e => setChapterCount(Math.max(1, Math.min(100, Number(e.target.value))))}
                  style={{ ...INPUT_STYLE, width: '70px', textAlign: 'center' }}
                />
              </div>
              <div style={HINT_STYLE}>You can add or remove chapters later.</div>
            </div>

            {/* File naming format */}
            <div>
              <label style={LABEL_STYLE}>File Naming Format</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {namingOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setNamingFormat(opt.value); setUseCustomLabel(false); }}
                    style={NAMING_ROW(!useCustomLabel && namingFormat === opt.value)}
                  >
                    <span style={{ width: '14px', flexShrink: 0 }}>
                      {!useCustomLabel && namingFormat === opt.value ? '●' : '○'}
                    </span>
                    <span>{opt.preview}</span>
                  </button>
                ))}

                {/* 4th option: Custom label */}
                <button
                  onClick={() => setUseCustomLabel(true)}
                  style={NAMING_ROW(useCustomLabel)}
                >
                  <span style={{ width: '14px', flexShrink: 0 }}>{useCustomLabel ? '●' : '○'}</span>
                  <span>Custom…</span>
                </button>
              </div>

              {/* Custom label input */}
              {useCustomLabel && (
                <div style={{ marginTop: '10px' }}>
                  <input
                    ref={customLabelRef}
                    type="text"
                    value={chapterLabel === 'Chapter' ? '' : chapterLabel}
                    onChange={e => setChapterLabel(e.target.value || 'Chapter')}
                    placeholder="e.g. Scene, Part, Act, Episode…"
                    style={INPUT_STYLE}
                  />
                  <div style={HINT_STYLE}>
                    Your custom chapter name. Files will be named:{' '}
                    <span style={{ color: '#c8c8c8' }}>
                      {label} 01 - {abr}.txt
                    </span>
                  </div>
                </div>
              )}

              <div style={{ ...HINT_STYLE, marginTop: '8px' }}>
                Choose how chapter files are named. Can be changed later.
              </div>
            </div>
          </div>

          {/* ── Project Type ──────────────────────────────────────────── */}
          <div style={SECTION_STYLE}>
            <div style={SECTION_HEADER}>Project Type</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {([
                { value: 'novel'         as GenrePreset, label: '📖 Novel' },
                { value: 'screenplay'    as GenrePreset, label: '🎬 Screenplay' },
                { value: 'short-stories' as GenrePreset, label: '📝 Short Stories' },
                { value: 'custom'        as GenrePreset, label: '⚙ Custom' },
              ]).map(g => (
                <button key={g.value} onClick={() => setGenre(g.value)} style={OPTION_BTN(genre === g.value)}>
                  {g.label}
                </button>
              ))}
            </div>
            <div style={HINT_STYLE}>Presets configure the folder structure. Select "Custom" to pick your own.</div>

            <div style={{ marginTop: '16px' }}>
              <label style={LABEL_STYLE}>Included Folders</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button style={TOGGLE_STYLE(includeBible)}         onClick={() => { setGenre('custom'); setIncludeBible(!includeBible); }}>
                  {includeBible ? '☑' : '☐'} Bible
                </button>
                <button style={TOGGLE_STYLE(includeNotes)}         onClick={() => { setGenre('custom'); setIncludeNotes(!includeNotes); }}>
                  {includeNotes ? '☑' : '☐'} Notes
                </button>
                <button style={TOGGLE_STYLE(includeResearch)}      onClick={() => { setGenre('custom'); setIncludeResearch(!includeResearch); }}>
                  {includeResearch ? '☑' : '☐'} Research
                </button>
                <button style={TOGGLE_STYLE(includeWorldbuilding)} onClick={() => { setGenre('custom'); setIncludeWorldbuilding(!includeWorldbuilding); }}>
                  {includeWorldbuilding ? '☑' : '☐'} Worldbuilding
                </button>
                <button style={TOGGLE_STYLE(includeFrontMatter)}   onClick={() => { setGenre('custom'); setIncludeFrontMatter(!includeFrontMatter); }}>
                  {includeFrontMatter ? '☑' : '☐'} Front Matter
                </button>
              </div>
            </div>
          </div>

          {/* ── Writing Goals & Style ─────────────────────────────────── */}
          <div style={SECTION_STYLE}>
            <div style={SECTION_HEADER}>Writing Goals &amp; Style</div>
            <div style={{ marginBottom: '16px' }}>
              <label style={LABEL_STYLE}>Target Word Count</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min={1000}
                  max={500000}
                  step={1000}
                  value={targetWordCount}
                  onChange={e => setTargetWordCount(Number(e.target.value))}
                  style={{ ...INPUT_STYLE, width: '120px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '13px', color: '#c8c8c8' }}>words</span>
                <span style={{ fontSize: '11px', color: DT.COLORS.text.muted, marginLeft: '8px' }}>
                  (~{Math.round(targetWordCount / chapterCount).toLocaleString()} per chapter)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {[50000, 80000, 100000, 120000].map(wc => (
                  <button
                    key={wc}
                    onClick={() => setTargetWordCount(wc)}
                    style={{ ...OPTION_BTN(targetWordCount === wc), fontSize: '11px', padding: '4px 10px' }}
                  >
                    {wc / 1000}k
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={LABEL_STYLE}>Point of View</label>
                <input
                  type="text"
                  value={pov}
                  onChange={e => setPov(e.target.value)}
                  placeholder="e.g. First Person, Third Limited"
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Tense</label>
                <input
                  type="text"
                  value={tense}
                  onChange={e => setTense(e.target.value)}
                  placeholder="e.g. Past Tense, Present Tense"
                  style={INPUT_STYLE}
                />
              </div>
            </div>
            <div>
              <label style={LABEL_STYLE}>Style Notes</label>
              <textarea
                value={styleNotes}
                onChange={e => setStyleNotes(e.target.value)}
                placeholder="Tone, voice, influences, rules to follow..."
                rows={3}
                style={{ ...INPUT_STYLE, resize: 'vertical' as const }}
              />
              <div style={HINT_STYLE}>Stored in your Bible folder for reference while writing.</div>
            </div>
          </div>

          {/* ── Storage Location ──────────────────────────────────────── */}
          <div style={SECTION_STYLE}>
            <div style={SECTION_HEADER}>Storage Location</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {([
                {
                  value: 'local' as StorageLocation,
                  label: '💾 Local Storage',
                  desc: 'Files saved in your browser. No account needed.',
                  linked: true,
                },
                {
                  value: 'google-drive' as StorageLocation,
                  label: '☁ Google Drive',
                  desc: 'Sync to your Google Drive account.',
                  linked: isGoogleConnected,
                },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStorageLocation(opt.value)}
                  style={{
                    ...NAMING_ROW(storageLocation === opt.value),
                    flexDirection: 'column',
                    alignItems:    'flex-start',
                    gap:           '2px',
                    padding:       '10px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                    <span style={{ width: '14px' }}>{storageLocation === opt.value ? '●' : '○'}</span>
                    <span style={{ fontWeight: 600, color: storageLocation === opt.value ? DT.COLORS.ui.teal : '#c8c8c8' }}>{opt.label}</span>
                    {opt.value !== 'local' && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize:   '11px',
                        fontWeight: 600,
                        color:      opt.linked
                          ? DT.COLORS.ui.teal
                          : '#e05c5c',
                      }}>
                        {opt.linked ? '✓ LINKED' : 'NOT LINKED'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', paddingLeft: '24px', color: '#888' }}>{opt.desc}</div>
                </button>
              ))}
            </div>

            {storageLocation !== 'local' && (
              <div style={{ marginTop: '16px' }}>
                <label style={LABEL_STYLE}>Cloud Sync Mode</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {([
                    {
                      value: 'direct' as CloudSyncMode,
                      label: '📡 Work Directly in Cloud',
                      desc:  'Files are read from and saved directly to your cloud drive. Requires internet.',
                    },
                    {
                      value: 'periodic' as CloudSyncMode,
                      label: '🔄 Sync Periodically',
                      desc:  'Work locally and sync changes to cloud on a regular schedule. Works offline.',
                    },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setCloudSyncMode(opt.value)}
                      style={{
                        ...NAMING_ROW(cloudSyncMode === opt.value),
                        flexDirection: 'column',
                        alignItems:    'flex-start',
                        gap:           '2px',
                        padding:       '10px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '14px' }}>{cloudSyncMode === opt.value ? '●' : '○'}</span>
                        <span style={{ fontWeight: 600 }}>{opt.label}</span>
                      </div>
                      <div style={{ fontSize: '11px', paddingLeft: '24px', color: '#888' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {storageLocation === 'google-drive' && (
              isGoogleConnected ? (
                <div style={{ marginTop: '12px', padding: '12px', border: DT.BORDERS.active }}>
                  <div style={{ fontSize: '13px', color: DT.COLORS.ui.teal }}>
                    ✓ Your Google Drive account is connected and ready.
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '12px', padding: '12px', border: DT.BORDERS.default }}>
                  <div style={{ fontSize: '13px', marginBottom: '8px', color: '#e05c5c' }}>
                    ⚠ You need to link your Google Drive account to use cloud storage.
                  </div>
                  <div style={{ fontSize: '11px', marginBottom: '8px', color: '#888' }}>
                    You can link accounts in Settings → Storage at any time.
                  </div>
                  <button
                    onClick={() => onLinkStorage(storageLocation)}
                    style={{ ...OPTION_BTN(true), fontSize: '12px' }}
                  >
                    Link Account →
                  </button>
                </div>
              )
            )}
            <div style={HINT_STYLE}>Storage location and sync mode can be changed later in settings.</div>
          </div>

          {/* ── Footer note ───────────────────────────────────────────── */}
          <div style={{
            padding:      '14px 18px',
            border:       DT.BORDERS.subtle,
            borderRadius: 0,
            marginBottom: '20px',
            fontSize:     '13px',
            lineHeight:   1.6,
            fontFamily:   DT.TYPOGRAPHY.ui.fontFamily,
            color:        DT.COLORS.text.muted,
          }}>
            <strong style={{ color: '#c8c8c8' }}>All settings can be changed after creation.</strong>
            {' '}Add/remove chapters, rename files, and update style notes at any time.
          </div>
        </div>

        {/* ── Right: Live Preview ───────────────────────────────────── */}
        <div style={{ width: '300px', flexShrink: 0, position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
          <div style={{
            border:       DT.BORDERS.default,
            borderRadius: 0,
            padding:      '0',
            background:   DT.COLORS.background.panel,
            boxShadow:    'none',
          }}>
            {/* Preview header */}
            <div style={{
              ...SECTION_HEADER,
              margin:        0,
              padding:       '12px 14px',
              borderBottom:  DT.BORDERS.default,
              paddingBottom: '12px',
            }}>
              Project Preview
            </div>

            {/* Tree */}
            <div style={{ padding: '8px 0' }}>
              {treeNodes.map((node, i) => (
                <div
                  key={i}
                  style={{
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '5px',
                    padding:    `2px 8px 2px ${8 + node.depth * 16}px`,
                    fontSize:   '12px',
                    fontFamily: DT.TYPOGRAPHY.body.fontFamily,
                    color:      node.muted ? '#444' : '#c8c8c8',
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: '2px' }}>
                    {node.kind === 'bin'
                      ? <span style={{ fontSize: '12px', lineHeight: 1 }}>🗑️</span>
                      : node.kind === 'file'
                      ? <span style={{ fontSize: '12px', lineHeight: 1 }}>🗒️</span>
                      : node.depth === 0
                      ? <BookOpen size={13} color="#c8a84b" style={{ verticalAlign: 'middle', flexShrink: 0 }} />
                      : <span style={{ fontSize: '12px', lineHeight: 1 }}>📂</span>
                    }
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{
              borderTop:  DT.BORDERS.subtle,
              padding:    '12px 14px',
              fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
            }}>
              {[
                { label: 'CHAPTERS',     value: String(chapterCount) },
                { label: 'WORD TARGET',  value: targetWordCount.toLocaleString() },
                { label: 'SYNC',         value: storageLocation === 'local' ? 'Local' : 'Google Drive' },
                ...(pov   ? [{ label: 'POV',   value: pov }]   : []),
                ...(tense ? [{ label: 'TENSE', value: tense }] : []),
              ].map(({ label: l, value }) => (
                <div key={l} style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  alignItems:     'baseline',
                  gap:            '8px',
                  lineHeight:     2,
                }}>
                  <span style={{ ...DT.TYPOGRAPHY.sectionHeader, fontSize: '9px' }}>{l}</span>
                  <span style={{ fontSize: '11px', color: '#c8c8c8' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              style={{
                flex:         1,
                padding:      '12px',
                borderRadius: 0,
                background:   canCreate ? DT.COLORS.ui.teal : 'rgba(0, 223, 160, 0.12)',
                color:        canCreate ? DT.COLORS.background.primary : DT.COLORS.text.muted,
                border:       canCreate ? DT.BORDERS.active : DT.BORDERS.default,
                cursor:       canCreate ? 'pointer' : 'not-allowed',
                fontFamily:   DT.TYPOGRAPHY.ui.fontFamily,
                fontSize:     '12px',
                fontWeight:   600,
                letterSpacing:'0.08em',
                textTransform:'uppercase' as const,
                boxShadow:    'none',
                transition:   'all 0.15s',
              }}
            >
              {primaryLabel}
            </button>
            <button
              onClick={onClose}
              style={{
                padding:      '12px 16px',
                borderRadius: 0,
                background:   'transparent',
                color:        '#888',
                border:       '1px solid #444',
                cursor:       'pointer',
                fontFamily:   DT.TYPOGRAPHY.ui.fontFamily,
                fontSize:     '12px',
                letterSpacing:'0.08em',
                textTransform:'uppercase' as const,
                boxShadow:    'none',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
