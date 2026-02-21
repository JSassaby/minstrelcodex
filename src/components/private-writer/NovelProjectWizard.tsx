import { useState, useEffect, useMemo } from 'react';
import { useGoogleToken } from '@/hooks/useGoogleToken';

export type NamingFormat = 'ch-abr' | 'abr-ch' | 'abr_ch';
export type GenrePreset = 'novel' | 'screenplay' | 'short-stories' | 'custom';
export type StorageLocation = 'local' | 'google-drive';
export type CloudSyncMode = 'direct' | 'periodic';
export interface NovelProjectConfig {
  title: string;
  abbreviation: string;
  chapterCount: number;
  namingFormat: NamingFormat;
  genre: GenrePreset;
  targetWordCount: number;
  pov: string;
  tense: string;
  styleNotes: string;
  includeBible: boolean;
  includeNotes: boolean;
  includeResearch: boolean;
  includeWorldbuilding: boolean;
  includeFrontMatter: boolean;
  storageLocation: StorageLocation;
  cloudSyncMode: CloudSyncMode;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (config: NovelProjectConfig) => void;
  onLinkStorage: (location: StorageLocation) => void;
}

function generateAbbreviation(title: string): string {
  if (!title.trim()) return '';
  const words = title.trim().split(/\s+/).filter(w => !['the', 'a', 'an', 'of', 'and', 'in', 'to', 'for'].includes(w.toLowerCase()));
  if (words.length === 0) return title.trim().substring(0, 3).toUpperCase();
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').toUpperCase().substring(0, 4);
}

function formatChapterName(format: NamingFormat, abr: string, num: number): string {
  const ch = String(num).padStart(2, '0');
  switch (format) {
    case 'ch-abr': return `Chapter ${ch} - ${abr}.txt`;
    case 'abr-ch': return `${abr} - Chapter ${ch}.txt`;
    case 'abr_ch': return `${abr}_Ch${ch}.txt`;
  }
}

const GENRE_FOLDERS: Record<GenrePreset, { bible: boolean; notes: boolean; research: boolean; worldbuilding: boolean; frontMatter: boolean }> = {
  novel: { bible: true, notes: true, research: false, worldbuilding: false, frontMatter: false },
  screenplay: { bible: true, notes: true, research: false, worldbuilding: false, frontMatter: false },
  'short-stories': { bible: false, notes: true, research: false, worldbuilding: false, frontMatter: false },
  custom: { bible: true, notes: true, research: false, worldbuilding: false, frontMatter: false },
};

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

const SECTION_STYLE: React.CSSProperties = {
  marginBottom: '20px',
  padding: '20px',
  border: '1px solid var(--terminal-border)',
  borderRadius: '12px',
  background: 'var(--terminal-surface)',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '11px',
  marginBottom: '8px',
  letterSpacing: '0.07em',
  fontWeight: '600',
  textTransform: 'uppercase',
  opacity: 0.55,
  fontFamily: "var(--font-ui, 'Space Grotesk', sans-serif)",
};

const HINT_STYLE: React.CSSProperties = {
  fontSize: '11px',
  marginTop: '6px',
  opacity: 0.45,
  fontFamily: "var(--font-ui, 'Space Grotesk', sans-serif)",
};

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'var(--terminal-bg)',
  border: '1px solid var(--terminal-border)',
  borderRadius: '9px',
  color: 'var(--terminal-text)',
  padding: '10px 14px',
  fontFamily: "var(--font-ui, 'Space Grotesk', sans-serif)",
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
};

const OPTION_BTN = (selected: boolean): React.CSSProperties => ({
  padding: '9px 16px',
  borderRadius: '9px',
  background: selected ? 'var(--terminal-accent)' : 'var(--terminal-bg)',
  color: selected ? 'var(--terminal-bg)' : 'var(--terminal-text)',
  border: selected ? '1.5px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
  fontWeight: selected ? '600' : '400',
  cursor: 'pointer',
  fontFamily: "var(--font-ui, 'Space Grotesk', sans-serif)",
  fontSize: '13px',
  transition: 'all 0.12s',
});

const TOGGLE_STYLE = (on: boolean): React.CSSProperties => ({
  padding: '7px 14px',
  borderRadius: '8px',
  background: on ? 'var(--terminal-accent)' : 'var(--terminal-bg)',
  color: on ? 'var(--terminal-bg)' : 'var(--terminal-text)',
  border: on ? '1.5px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
  cursor: 'pointer',
  fontFamily: "var(--font-ui, 'Space Grotesk', sans-serif)",
  fontSize: '12px',
  fontWeight: on ? '600' : '400',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.12s',
});

export default function NovelProjectWizard({ visible, onClose, onCreate, onLinkStorage }: Props) {
  const [title, setTitle] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [abrManual, setAbrManual] = useState(false);
  const [chapterCount, setChapterCount] = useState(10);
  const [namingFormat, setNamingFormat] = useState<NamingFormat>('ch-abr');
  const [genre, setGenre] = useState<GenrePreset>('novel');
  const [targetWordCount, setTargetWordCount] = useState(80000);
  const [pov, setPov] = useState('');
  const [tense, setTense] = useState('');
  const [styleNotes, setStyleNotes] = useState('');
  const [includeBible, setIncludeBible] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeResearch, setIncludeResearch] = useState(false);
  const [includeWorldbuilding, setIncludeWorldbuilding] = useState(false);
  const [includeFrontMatter, setIncludeFrontMatter] = useState(false);
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('local');
  const [cloudSyncMode, setCloudSyncMode] = useState<CloudSyncMode>('direct');

  // Auto-generate abbreviation from title
  useEffect(() => {
    if (!abrManual) {
      setAbbreviation(generateAbbreviation(title));
    }
  }, [title, abrManual]);

  // Apply genre preset
  useEffect(() => {
    if (genre !== 'custom') {
      const preset = GENRE_FOLDERS[genre];
      setIncludeBible(preset.bible);
      setIncludeNotes(preset.notes);
      setIncludeResearch(preset.research);
      setIncludeWorldbuilding(preset.worldbuilding);
      setIncludeFrontMatter(preset.frontMatter);
    }
  }, [genre]);

  // Reset on open
  useEffect(() => {
    if (visible) {
      setTitle(''); setAbbreviation(''); setAbrManual(false);
      setChapterCount(10); setNamingFormat('ch-abr'); setGenre('novel');
      setTargetWordCount(80000); setPov(''); setTense(''); setStyleNotes('');
      setIncludeBible(true); setIncludeNotes(true); setIncludeResearch(false);
      setIncludeWorldbuilding(false); setIncludeFrontMatter(false);
      setStorageLocation('local'); setCloudSyncMode('direct');
    }
  }, [visible]);

  // Use the shared Google token hook for consistent connected status
  const { isConnected: isGoogleConnected } = useGoogleToken();

  const abr = abbreviation || 'ABR';

  // Build preview tree
  const treePreview = useMemo(() => {
    const t = title || '[Title]';
    const lines: string[] = [`📁 ${t}/`];
    lines.push('├─ 📁 Active/');
    lines.push('│  ├─ 📁 Chapters/');
    const maxShow = Math.min(chapterCount, 3);
    for (let i = 1; i <= maxShow; i++) {
      const prefix = i === maxShow && !includeBible && !includeNotes && !includeResearch && !includeWorldbuilding ? '│  │  └─' : '│  │  ├─';
      lines.push(`${prefix} 📄 ${formatChapterName(namingFormat, abr, i)}`);
    }
    if (chapterCount > 3) lines.push(`│  │  └─ ... (${chapterCount} total)`);

    if (includeBible) {
      lines.push('│  ├─ 📁 Bible/');
      lines.push(`│  │  ├─ 📄 Characters - ${abr}.txt`);
      lines.push(`│  │  ├─ 📄 Outline - ${abr}.txt`);
      lines.push(`│  │  └─ 📄 Setting - ${abr}.txt`);
    }
    if (includeNotes) {
      lines.push('│  ├─ 📁 Notes/');
      lines.push(`│  │  └─ 📄 Ideas - ${abr}.txt`);
    }
    if (includeResearch) {
      lines.push('│  ├─ 📁 Research/');
      lines.push(`│  │  └─ 📄 Research Notes - ${abr}.txt`);
    }
    if (includeWorldbuilding) {
      lines.push('│  └─ 📁 Worldbuilding/');
      lines.push(`│     └─ 📄 World Notes - ${abr}.txt`);
    }
    if (includeFrontMatter) {
      lines.push('├─ 📁 Front Matter/');
      lines.push(`│  ├─ 📄 Dedication - ${abr}.txt`);
      lines.push(`│  ├─ 📄 Epigraph - ${abr}.txt`);
      lines.push(`│  └─ 📄 Prologue - ${abr}.txt`);
    }
    lines.push('├─ 📁 Versions/');
    lines.push('├─ 📁 Snapshots/');
    lines.push(`└─ 📄 Version History - ${abr}.txt`);
    return lines.join('\n');
  }, [title, chapterCount, namingFormat, abr, includeBible, includeNotes, includeResearch, includeWorldbuilding, includeFrontMatter]);

  const canCreate = title.trim().length > 0 && abbreviation.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    onCreate({
      title: title.trim(),
      abbreviation: abbreviation.trim(),
      chapterCount,
      namingFormat,
      genre,
      targetWordCount,
      pov: pov.trim(),
      tense: tense.trim(),
      styleNotes: styleNotes.trim(),
      includeBible,
      includeNotes,
      includeResearch,
      includeWorldbuilding,
      includeFrontMatter,
      storageLocation,
      cloudSyncMode,
    });
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--terminal-bg)',
        color: 'var(--terminal-text)',
        fontFamily: uiFont,
        zIndex: 3000,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        borderBottom: '1px solid var(--terminal-border)',
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        background: 'var(--terminal-surface)',
      }}>
        <div style={{ fontSize: '17px', fontWeight: '700', fontFamily: uiFont, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ opacity: 0.7 }}>📖</span> New Novel Project
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid var(--terminal-border)',
            borderRadius: '8px',
            color: 'var(--terminal-text)',
            padding: '6px 14px',
            cursor: 'pointer',
            fontFamily: uiFont,
            fontSize: '13px',
            opacity: 0.6,
            transition: 'opacity 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
        >
          ✕ Close
        </button>
      </div>

      {/* Body */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        gap: '32px',
      }}>
        {/* Left: Form */}
        <div style={{ flex: 1, maxWidth: '640px' }}>
          {/* ── Title & Abbreviation ── */}
          <div style={SECTION_STYLE}>
            <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--terminal-border)', paddingBottom: '10px', fontFamily: uiFont, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Title &amp; Abbreviation
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={LABEL_STYLE}>PROJECT TITLE</div>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter your novel title..."
                autoFocus
                style={INPUT_STYLE}
              />
              <div style={HINT_STYLE}>This is your working title — you can change it later.</div>
            </div>
            <div>
              <div style={LABEL_STYLE}>ABBREVIATION</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={abbreviation}
                  onChange={e => { setAbbreviation(e.target.value.toUpperCase()); setAbrManual(true); }}
                  placeholder="ABR"
                  maxLength={5}
                  style={{ ...INPUT_STYLE, width: '100px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}
                />
                {abrManual && (
                  <button
                    onClick={() => { setAbrManual(false); setAbbreviation(generateAbbreviation(title)); }}
                    style={{ ...OPTION_BTN(false), fontSize: '11px', padding: '4px 10px' }}
                  >
                    AUTO
                  </button>
                )}
              </div>
              <div style={HINT_STYLE}>Used in all file names. Max 5 characters. Auto-generated from title.</div>
            </div>
          </div>

          {/* ── Chapters ── */}
          <div style={SECTION_STYLE}>
            <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--terminal-border)', paddingBottom: '10px', fontFamily: uiFont, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Chapters
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={LABEL_STYLE}>NUMBER OF CHAPTERS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={chapterCount}
                  onChange={e => setChapterCount(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--terminal-text)' }}
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
            <div>
              <div style={LABEL_STYLE}>FILE NAMING FORMAT</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {([
                  { value: 'ch-abr' as NamingFormat, preview: `Chapter 01 - ${abr}.txt` },
                  { value: 'abr-ch' as NamingFormat, preview: `${abr} - Chapter 01.txt` },
                  { value: 'abr_ch' as NamingFormat, preview: `${abr}_Ch01.txt` },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setNamingFormat(opt.value)}
                    style={{
                      ...OPTION_BTN(namingFormat === opt.value),
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span style={{ width: '16px' }}>{namingFormat === opt.value ? '●' : '○'}</span>
                    <span>{opt.preview}</span>
                  </button>
                ))}
              </div>
              <div style={HINT_STYLE}>Choose how chapter files are named. Can be changed later.</div>
            </div>
          </div>

          {/* ── Genre / Template ── */}
          <div style={SECTION_STYLE}>
            <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--terminal-border)', paddingBottom: '10px', fontFamily: uiFont, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Project Type
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {([
                { value: 'novel' as GenrePreset, label: '📖 Novel' },
                { value: 'screenplay' as GenrePreset, label: '🎬 Screenplay' },
                { value: 'short-stories' as GenrePreset, label: '📝 Short Stories' },
                { value: 'custom' as GenrePreset, label: '⚙ Custom' },
              ]).map(g => (
                <button key={g.value} onClick={() => setGenre(g.value)} style={OPTION_BTN(genre === g.value)}>
                  {g.label}
                </button>
              ))}
            </div>
            <div style={HINT_STYLE}>Presets configure the folder structure. Select "Custom" to pick your own.</div>

            {/* Folder toggles */}
            <div style={{ marginTop: '16px' }}>
              <div style={LABEL_STYLE}>INCLUDED FOLDERS</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button style={TOGGLE_STYLE(includeBible)} onClick={() => { setGenre('custom'); setIncludeBible(!includeBible); }}>
                  {includeBible ? '☑' : '☐'} Bible
                </button>
                <button style={TOGGLE_STYLE(includeNotes)} onClick={() => { setGenre('custom'); setIncludeNotes(!includeNotes); }}>
                  {includeNotes ? '☑' : '☐'} Notes
                </button>
                <button style={TOGGLE_STYLE(includeResearch)} onClick={() => { setGenre('custom'); setIncludeResearch(!includeResearch); }}>
                  {includeResearch ? '☑' : '☐'} Research
                </button>
                <button style={TOGGLE_STYLE(includeWorldbuilding)} onClick={() => { setGenre('custom'); setIncludeWorldbuilding(!includeWorldbuilding); }}>
                  {includeWorldbuilding ? '☑' : '☐'} Worldbuilding
                </button>
                <button style={TOGGLE_STYLE(includeFrontMatter)} onClick={() => { setGenre('custom'); setIncludeFrontMatter(!includeFrontMatter); }}>
                  {includeFrontMatter ? '☑' : '☐'} Front Matter
                </button>
              </div>
            </div>
          </div>

          {/* ── Writing Goals & Style ── */}
          <div style={SECTION_STYLE}>
            <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--terminal-border)', paddingBottom: '10px', fontFamily: uiFont, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Writing Goals &amp; Style
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={LABEL_STYLE}>TARGET WORD COUNT</div>
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
                <span style={{ fontSize: '13px' }}>words</span>
                <span style={{ fontSize: '11px', marginLeft: '8px' }}>
                  (~{Math.round(targetWordCount / chapterCount).toLocaleString()} per chapter)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {[50000, 80000, 100000, 120000].map(wc => (
                  <button
                    key={wc}
                    onClick={() => setTargetWordCount(wc)}
                    style={{ ...OPTION_BTN(targetWordCount === wc), fontSize: '11px', padding: '4px 8px' }}
                  >
                    {(wc / 1000)}k
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={LABEL_STYLE}>POINT OF VIEW</div>
                <input
                  type="text"
                  value={pov}
                  onChange={e => setPov(e.target.value)}
                  placeholder="e.g. First Person, Third Limited"
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <div style={LABEL_STYLE}>TENSE</div>
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
              <div style={LABEL_STYLE}>STYLE NOTES</div>
              <textarea
                value={styleNotes}
                onChange={e => setStyleNotes(e.target.value)}
                placeholder="Tone, voice, influences, rules to follow..."
                rows={3}
                style={{ ...INPUT_STYLE, resize: 'vertical' }}
              />
              <div style={HINT_STYLE}>Stored in your Bible folder for reference while writing.</div>
            </div>
          </div>

          {/* ── Storage Location ── */}
          <div style={SECTION_STYLE}>
            <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--terminal-border)', paddingBottom: '10px', fontFamily: uiFont, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Storage Location
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {([
                { value: 'local' as StorageLocation, label: '💾 Local Storage', desc: 'Files saved in your browser. No account needed.', linked: true },
                { value: 'google-drive' as StorageLocation, label: '☁ Google Drive', desc: 'Sync to your Google Drive account.', linked: isGoogleConnected },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStorageLocation(opt.value)}
                  style={{
                    ...OPTION_BTN(storageLocation === opt.value),
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    padding: '10px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                    <span style={{ width: '16px' }}>{storageLocation === opt.value ? '●' : '○'}</span>
                    <span style={{ fontWeight: 'bold' }}>{opt.label}</span>
                    {opt.value !== 'local' && (
                      <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 'bold', color: opt.linked ? 'inherit' : (storageLocation === opt.value ? 'var(--terminal-bg)' : '#ff5555') }}>
                        {opt.linked ? '✓ LINKED' : 'NOT LINKED'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', paddingLeft: '26px' }}>{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* Cloud sync mode - only show for cloud storage */}
            {storageLocation !== 'local' && (
              <div style={{ marginTop: '16px' }}>
                <div style={LABEL_STYLE}>CLOUD SYNC MODE</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => setCloudSyncMode('direct')}
                    style={{
                      ...OPTION_BTN(cloudSyncMode === 'direct'),
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '2px',
                      padding: '10px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '16px' }}>{cloudSyncMode === 'direct' ? '●' : '○'}</span>
                      <span style={{ fontWeight: 'bold' }}>📡 Work Directly in Cloud</span>
                    </div>
                    <div style={{ fontSize: '11px', paddingLeft: '26px' }}>
                      Files are read from and saved directly to your cloud drive. Requires active internet connection.
                    </div>
                  </button>
                  <button
                    onClick={() => setCloudSyncMode('periodic')}
                    style={{
                      ...OPTION_BTN(cloudSyncMode === 'periodic'),
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '2px',
                      padding: '10px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '16px' }}>{cloudSyncMode === 'periodic' ? '●' : '○'}</span>
                      <span style={{ fontWeight: 'bold' }}>🔄 Sync Periodically</span>
                    </div>
                    <div style={{ fontSize: '11px', paddingLeft: '26px' }}>
                      Work locally and sync changes to cloud on a regular schedule. Works offline, syncs when connected.
                    </div>
                  </button>
                </div>
                <div style={HINT_STYLE}>
                  {cloudSyncMode === 'direct'
                    ? 'All changes save instantly to the cloud. Best for always-online workflows.'
                    : 'Changes are stored locally first, then synced. Best for writing on-the-go.'}
                </div>
              </div>
            )}

            {storageLocation === 'google-drive' && (
              isGoogleConnected ? (
                <div style={{ marginTop: '12px', padding: '12px', border: '1px solid var(--terminal-text)' }}>
                  <div style={{ fontSize: '13px' }}>
                    ✓ Your Google Drive account is connected and ready.
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '12px', padding: '12px', border: '1px solid var(--terminal-text)' }}>
                  <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                    ⚠ You need to link your Google Drive account to use cloud storage.
                  </div>
                  <div style={{ fontSize: '11px', marginBottom: '8px', opacity: 0.7 }}>
                    You can link accounts in Settings → Storage at any time.
                  </div>
                  <button
                    onClick={() => onLinkStorage(storageLocation)}
                    style={{ ...OPTION_BTN(true), fontSize: '13px' }}
                  >
                    LINK ACCOUNT →
                  </button>
                </div>
              )
            )}
            <div style={HINT_STYLE}>Storage location and sync mode can be changed later in settings.</div>
          </div>

          {/* ── Note ── */}
          <div style={{
            padding: '14px 18px',
            border: '1px solid var(--terminal-border)',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '13px',
            lineHeight: 1.6,
            fontFamily: uiFont,
            background: 'var(--terminal-surface)',
            opacity: 0.75,
          }}>
            <strong>All settings can be changed after creation.</strong> Add/remove chapters, rename files, and update style notes at any time.
          </div>
        </div>

        {/* Right: Live Preview */}
        <div style={{ width: '320px', flexShrink: 0, position: 'sticky', top: '0', alignSelf: 'flex-start' }}>
          <div style={{ border: '1px solid var(--terminal-border)', borderRadius: '12px', padding: '16px', background: 'var(--terminal-surface)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '12px', borderBottom: '1px solid var(--terminal-border)', paddingBottom: '10px', fontFamily: uiFont, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Project Preview
            </div>
            <pre style={{ fontFamily: "'Courier Prime', 'Courier New', monospace", fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, opacity: 0.85 }}>
              {treePreview}
            </pre>
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--terminal-border)', fontSize: '12px', lineHeight: 1.8, fontFamily: uiFont, opacity: 0.65 }}>
              <div>📝 {chapterCount} chapters</div>
              <div>🎯 {targetWordCount.toLocaleString()} word target</div>
              {pov && <div>👁 POV: {pov}</div>}
              {tense && <div>⏱ Tense: {tense}</div>}
              <div>💾 {storageLocation === 'local' ? 'Local' : 'Google Drive'}</div>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              style={{
                flex: 1, padding: '13px',
                borderRadius: '10px',
                background: canCreate ? 'var(--terminal-accent)' : 'var(--terminal-surface)',
                color: canCreate ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                border: canCreate ? '1.5px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
                cursor: canCreate ? 'pointer' : 'not-allowed',
                fontFamily: uiFont, fontSize: '14px', fontWeight: '700',
                opacity: canCreate ? 1 : 0.5, transition: 'all 0.15s',
              }}
            >
              Create Project
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '13px 18px', borderRadius: '10px',
                background: 'transparent', color: 'var(--terminal-text)',
                border: '1px solid var(--terminal-border)',
                cursor: 'pointer', fontFamily: uiFont, fontSize: '13px', opacity: 0.65,
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
