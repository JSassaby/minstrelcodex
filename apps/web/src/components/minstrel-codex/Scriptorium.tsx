import { useState, useEffect } from 'react';
import { getLevelForXP, db, type WriterProfile } from '@minstrelcodex/core';
import minstrelWordmark from '@/assets/wordmark.svg';

interface Props {
  profile: WriterProfile;
  onEnter: () => void;
  onOpenFile: (filename: string) => void;
  recentFiles: Array<{ filename: string; wordCount: number }>;
  onMusicPlay: () => void;
  musicPlaying: boolean;
  onOpenSettings: () => void;
  onNewNovel: () => void;
  onNewFile: () => void;
}

const PHRASES = [
  "The blank page is not your enemy. It is waiting to be filled.",
  "Every word is a step further into the story.",
  "The bard who writes today will be remembered tomorrow.",
  "Sit. Write. The rest will follow.",
  "Your chronicle does not write itself.",
  "The story exists. You are finding it.",
  "Consistency is the only craft secret worth knowing.",
  "Begin anywhere. The beginning will reveal itself.",
  "Words written in silence outlast words spoken in noise.",
  "The session that matters is the one you're about to start.",
  "A thousand words today. A manuscript by year's end.",
  "Write as if the page is listening. It is.",
];

const uiFont = 'var(--font-ui)';

const COL_HEADER: React.CSSProperties = {
  fontSize: '10px',
  fontFamily: uiFont,
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--terminal-accent)',
  marginBottom: '16px',
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: '9px',
  fontFamily: uiFont,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--terminal-muted)',
  marginBottom: '8px',
};

const displayName = (filename: string) => filename.split('/').pop() || filename;

export default function Scriptorium({
  profile, onEnter, onOpenFile, recentFiles,
  onMusicPlay, musicPlaying,
  onOpenSettings, onNewNovel, onNewFile,
}: Props) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);
  const [totalWords, setTotalWords] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);

  // Rotate phrase every 8 seconds with a fade
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseVisible(false);
      setTimeout(() => {
        setPhraseIdx(prev => (prev + 1) % PHRASES.length);
        setPhraseVisible(true);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Query writing stats and session count
  useEffect(() => {
    (async () => {
      const [stats, count] = await Promise.all([
        db.writingStats.toArray(),
        db.writingSessions.count(),
      ]);
      setTotalWords(stats.reduce((sum, s) => sum + (s.words ?? 0), 0));
      setSessionCount(count);
    })();
  }, []);

  // Read localStorage status values
  const driveName = localStorage.getItem('minstrel-drive-dest-name');
  const driveConnected = !!driveName;
  const aiEnabled = localStorage.getItem('minstrel-editor-enabled') === 'true';
  const spellcheckOn = localStorage.getItem('minstrel-spellcheck') !== 'false';

  const { level, xpForCurrent, xpForNext } = getLevelForXP(profile.renown);

  let progressPct = 0;
  if (xpForNext !== null && xpForNext > xpForCurrent) {
    progressPct = Math.min(100, ((profile.renown - xpForCurrent) / (xpForNext - xpForCurrent)) * 100);
  } else if (xpForNext === null) {
    progressPct = 100;
  }

  function statusRow(active: boolean): React.CSSProperties {
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 0',
      marginBottom: '4px',
      borderLeft: `2px solid ${active ? 'var(--terminal-accent)' : 'transparent'}`,
      paddingLeft: '10px',
    };
  }

  function dot(active: boolean): React.CSSProperties {
    return {
      width: '6px',
      height: '6px',
      flexShrink: 0,
      background: active ? 'var(--terminal-accent)' : 'var(--terminal-muted)',
    };
  }

  function statusLabel(text: string): React.ReactElement {
    return (
      <div style={{ fontSize: '11px', color: 'var(--terminal-text)', marginBottom: '2px', fontFamily: uiFont }}>
        {text}
      </div>
    );
  }

  function statusValue(active: boolean, text: string): React.ReactElement {
    return (
      <div style={{ fontSize: '10px', color: active ? 'var(--terminal-accent)' : 'var(--terminal-muted)', fontFamily: uiFont }}>
        {text}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 8000,
        background: 'var(--terminal-bg)',
        display: 'flex',
        fontFamily: uiFont,
        overflow: 'hidden',
      }}
    >
      {/* ── LEFT COLUMN — System Status (25%) ── */}
      <div
        style={{
          width: '25%',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 24px 32px',
          overflowY: 'auto',
        }}
      >
        <div style={COL_HEADER}>System Status</div>

        {/* Google Drive */}
        <div
          style={{ ...statusRow(driveConnected), cursor: driveConnected ? 'default' : 'pointer' }}
          onClick={driveConnected ? undefined : onEnter}
        >
          <div style={dot(driveConnected)} />
          <div>
            {statusLabel('Google Drive')}
            {statusValue(driveConnected, driveConnected ? `✓ Connected${driveName ? ` · ${driveName}` : ''}` : 'Not connected')}
          </div>
        </div>

        {/* AI Editor */}
        <div style={statusRow(aiEnabled)}>
          <div style={dot(aiEnabled)} />
          <div>
            {statusLabel('AI Editor')}
            {statusValue(aiEnabled, aiEnabled ? '✓ Enabled' : 'Disabled')}
          </div>
        </div>

        {/* Spellcheck */}
        <div style={statusRow(spellcheckOn)}>
          <div style={dot(spellcheckOn)} />
          <div>
            {statusLabel('Spellcheck')}
            {statusValue(spellcheckOn, spellcheckOn ? '✓ On' : 'Off')}
          </div>
        </div>

        {/* Music */}
        <div style={statusRow(musicPlaying)}>
          <div style={dot(musicPlaying)} />
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div>
              {statusLabel('Music')}
              {statusValue(false, 'Entertainment menu')}
            </div>
            <button
              onClick={onMusicPlay}
              style={{
                background: 'transparent',
                border: '1px solid var(--terminal-accent)',
                color: 'var(--terminal-accent)',
                fontSize: '10px',
                padding: '3px 8px',
                cursor: 'pointer',
                fontFamily: uiFont,
                flexShrink: 0,
              }}
            >
              {musicPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={onOpenSettings}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--terminal-muted)',
            fontSize: '11px',
            cursor: 'pointer',
            fontFamily: uiFont,
            padding: 0,
            textAlign: 'left',
          }}
        >
          Open Settings →
        </button>
      </div>

      {/* ── CENTRE COLUMN — Writer Identity (50%) ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px 32px',
          overflowY: 'auto',
        }}
      >
        {/* Wordmark */}
        <img
          src={minstrelWordmark}
          alt="Minstrel Codex"
          style={{ height: '40px', width: 'auto', objectFit: 'contain', marginBottom: '40px' }}
        />

        {/* Renown label */}
        <div style={{ fontSize: '10px', color: 'var(--terminal-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px', fontFamily: uiFont }}>
          Renown
        </div>

        {/* Renown total */}
        <div style={{ fontSize: '30px', fontWeight: 700, color: 'var(--terminal-accent)', fontFamily: uiFont, marginBottom: '6px' }}>
          {profile.renown.toLocaleString()}
        </div>

        {/* Level badge */}
        <div style={{ fontSize: '18px', color: 'var(--terminal-accent)', fontFamily: uiFont, marginBottom: '36px' }}>
          Lv {level} · {profile.title}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            maxWidth: '420px',
            marginBottom: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {[
            { label: 'Words Written', value: totalWords.toLocaleString() },
            { label: 'Sessions', value: sessionCount.toLocaleString() },
            { label: 'Streak', value: `${profile.currentStreak}d` },
          ].map(({ label, value }, i, arr) => (
            <div
              key={label}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '16px 8px',
                borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--terminal-text)', fontFamily: uiFont, marginBottom: '4px' }}>
                {value}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--terminal-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: uiFont }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', maxWidth: '420px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ fontSize: '10px', color: 'var(--terminal-muted)', fontFamily: uiFont }}>
              Level {level}
            </div>
            {xpForNext !== null && (
              <div style={{ fontSize: '10px', color: 'var(--terminal-muted)', fontFamily: uiFont }}>
                {(profile.renown - xpForCurrent).toLocaleString()} / {(xpForNext - xpForCurrent).toLocaleString()} to Lv {level + 1}
              </div>
            )}
          </div>
          <div style={{ height: '2px', background: 'rgba(255,255,255,0.08)', width: '100%' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'var(--terminal-accent)',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '100%', maxWidth: '420px', height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '28px' }} />

        {/* Motivational phrase */}
        <div
          style={{
            maxWidth: '420px',
            textAlign: 'center',
            fontSize: '13px',
            fontStyle: 'italic',
            color: 'var(--terminal-muted)',
            lineHeight: 1.7,
            minHeight: '48px',
            opacity: phraseVisible ? 1 : 0,
            transition: 'opacity 0.4s ease',
            fontFamily: uiFont,
          }}
        >
          "{PHRASES[phraseIdx]}"
        </div>

        {/* Enter button — pushed to bottom via marginTop: auto */}
        <button
          onClick={onEnter}
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '18px',
            background: 'var(--terminal-accent)',
            color: 'var(--terminal-bg)',
            border: 'none',
            fontSize: '16px',
            fontWeight: 700,
            fontFamily: uiFont,
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginTop: 'auto',
          }}
        >
          Enter the Codex →
        </button>
      </div>

      {/* ── RIGHT COLUMN — Your Work (25%) ── */}
      <div
        style={{
          width: '25%',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 24px 32px',
          overflowY: 'auto',
        }}
      >
        <div style={COL_HEADER}>Your Work</div>

        <div style={{ flex: 1 }}>
          {recentFiles.length > 0 && (
            <>
              <div style={SECTION_LABEL}>Continue Writing</div>
              <div
                onClick={() => onOpenFile(recentFiles[0].filename)}
                style={{
                  padding: '12px',
                  border: '1px solid var(--terminal-accent)',
                  cursor: 'pointer',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--terminal-text)',
                    fontFamily: uiFont,
                    marginBottom: '6px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName(recentFiles[0].filename)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--terminal-accent)', fontFamily: uiFont }}>
                  {recentFiles[0].wordCount.toLocaleString()}w
                </div>
              </div>
            </>
          )}

          {recentFiles.length > 1 && (
            <>
              <div style={SECTION_LABEL}>Recent Files</div>
              {recentFiles.slice(1, 8).map((f) => (
                <div
                  key={f.filename}
                  onClick={() => onOpenFile(f.filename)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '7px 0',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--terminal-text)',
                      fontFamily: uiFont,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      marginRight: '8px',
                    }}
                  >
                    {displayName(f.filename)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--terminal-muted)', fontFamily: uiFont, flexShrink: 0 }}>
                    {f.wordCount.toLocaleString()}w
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ paddingTop: '16px' }}>
          <div style={SECTION_LABEL}>Quick Actions</div>
          <button
            onClick={onNewNovel}
            style={{
              width: '100%',
              padding: '9px 12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--terminal-text)',
              fontSize: '11px',
              fontFamily: uiFont,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            New Novel
          </button>
          <button
            onClick={onNewFile}
            style={{
              width: '100%',
              padding: '9px 12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--terminal-text)',
              fontSize: '11px',
              fontFamily: uiFont,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'block',
            }}
          >
            New File
          </button>
        </div>
      </div>
    </div>
  );
}
