import { useState, useEffect, useRef } from 'react';
import { DESIGN_TOKENS as DT } from '@minstrelcodex/core';

export interface NovelConfig {
  title: string;
  genre: string;
  wordTarget: number;
}

interface NovelWizardProps {
  onComplete: (config: NovelConfig) => void;
}

const GENRES = [
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Romance',
  'Thriller',
  'Historical Fiction',
  'Horror',
  'Literary Fiction',
];

const PRESETS = [
  { label: '50,000', value: 50_000, note: '~200 pages' },
  { label: '80,000', value: 80_000, note: '~320 pages' },
  { label: '100,000', value: 100_000, note: '~400 pages' },
  { label: 'Custom', value: 0, note: '' },
];

const OVERLAY: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: DT.Z_INDEX.modal,
  fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
};

const MODAL: React.CSSProperties = {
  width: '480px',
  background: DT.COLORS.background.panel,
  border: DT.BORDERS.default,
  borderRadius: DT.BORDER_RADIUS.modal,
  boxShadow: DT.SHADOWS.modal,
  padding: '40px 44px 36px',
  boxSizing: 'border-box',
  position: 'relative',
};

export default function NovelWizard({ onComplete }: NovelWizardProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [preset, setPreset] = useState(80_000);
  const [customValue, setCustomValue] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLInputElement>(null);

  // Autofocus title on mount
  useEffect(() => {
    if (step === 1) titleRef.current?.focus();
  }, [step]);

  // Autofocus custom input when Custom is selected
  useEffect(() => {
    if (preset === 0) customRef.current?.focus();
  }, [preset]);

  const wordTarget = preset !== 0 ? preset : parseInt(customValue || '0', 10);
  const canNext1 = title.trim().length > 0;
  const canNext2 = genre.length > 0;
  const canFinish = wordTarget >= 1000;

  const pages = preset !== 0 ? Math.round(preset / 250) : Math.round(wordTarget / 250);

  const advance = () => {
    if (step === 1 && canNext1) setStep(2);
    else if (step === 2 && canNext2) setStep(3);
    else if (step === 3 && canFinish) handleComplete();
  };

  const handleComplete = () => {
    onComplete({ title: title.trim(), genre, wordTarget });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') advance();
  };

  // ── Shared styles ────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    ...DT.TYPOGRAPHY.sectionHeader,
    display: 'block',
    marginBottom: '12px',
    color: DT.COLORS.text.teal,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: DT.COLORS.background.input,
    border: DT.BORDERS.default,
    borderRadius: DT.BORDER_RADIUS.input,
    color: DT.COLORS.text.primary,
    fontFamily: DT.TYPOGRAPHY.body.fontFamily,
    fontSize: '15px',
    padding: '10px 12px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const primaryBtn: React.CSSProperties = {
    background: DT.COLORS.ui.teal,
    border: 'none',
    borderRadius: DT.BORDER_RADIUS.button,
    color: '#0a0f14',
    fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '10px 24px',
    cursor: 'pointer',
  };

  const ghostBtn: React.CSSProperties = {
    background: 'transparent',
    border: DT.BORDERS.default,
    borderRadius: DT.BORDER_RADIUS.button,
    color: DT.COLORS.text.muted,
    fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '10px 20px',
    cursor: 'pointer',
  };

  const disabledBtn: React.CSSProperties = {
    ...primaryBtn,
    background: 'rgba(0, 223, 160, 0.2)',
    color: 'rgba(0, 223, 160, 0.4)',
    cursor: 'not-allowed',
  };

  return (
    <div style={OVERLAY} onKeyDown={handleKeyDown}>
      <div style={MODAL}>

        {/* Step indicator */}
        <div style={{
          position: 'absolute',
          top: '18px',
          right: '20px',
          fontSize: '10px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: DT.COLORS.text.muted,
          fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
          opacity: 0.5,
        }}>
          Step {step} of 3
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚔️</div>
          <div style={{
            fontFamily: DT.TYPOGRAPHY.body.fontFamily,
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: DT.COLORS.text.teal,
          }}>
            {step === 1 && 'Name Your Tale'}
            {step === 2 && 'Choose Your Realm'}
            {step === 3 && 'Set Your Quest'}
          </div>
        </div>

        {/* ── Step 1: Title ──────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <label style={labelStyle}>Working Title</label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="The name of your novel…"
              style={inputStyle}
              autoComplete="off"
              spellCheck={false}
            />
            <div style={{
              fontSize: '10px',
              color: DT.COLORS.text.muted,
              marginTop: '8px',
              opacity: 0.5,
              fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
            }}>
              You can change this later at any time.
            </div>
          </div>
        )}

        {/* ── Step 2: Genre ──────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <label style={labelStyle}>Genre</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}>
              {GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  style={{
                    background: genre === g ? 'rgba(0, 223, 160, 0.08)' : DT.COLORS.background.input,
                    border: genre === g ? DT.BORDERS.active : DT.BORDERS.default,
                    borderRadius: DT.BORDER_RADIUS.button,
                    color: genre === g ? DT.COLORS.text.teal : DT.COLORS.text.primary,
                    fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
                    fontSize: '12px',
                    fontWeight: genre === g ? 600 : 400,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: DT.TRANSITIONS.fast,
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Word target ────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <label style={labelStyle}>Word Target</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginBottom: '12px',
            }}>
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setPreset(p.value)}
                  style={{
                    background: preset === p.value ? 'rgba(0, 223, 160, 0.08)' : DT.COLORS.background.input,
                    border: preset === p.value ? DT.BORDERS.active : DT.BORDERS.default,
                    borderRadius: DT.BORDER_RADIUS.button,
                    color: preset === p.value ? DT.COLORS.text.teal : DT.COLORS.text.primary,
                    fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
                    fontSize: '12px',
                    fontWeight: preset === p.value ? 600 : 400,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: DT.TRANSITIONS.fast,
                  }}
                >
                  <div>{p.label}</div>
                  {p.note && (
                    <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '2px' }}>{p.note}</div>
                  )}
                </button>
              ))}
            </div>

            {/* Custom input */}
            {preset === 0 && (
              <input
                ref={customRef}
                type="number"
                min={1000}
                step={1000}
                value={customValue}
                onChange={e => setCustomValue(e.target.value)}
                placeholder="Enter word count…"
                style={{ ...inputStyle, marginBottom: '12px' }}
              />
            )}

            {/* Page estimate */}
            {(preset !== 0 || wordTarget >= 1000) && (
              <div style={{
                fontSize: '11px',
                color: DT.COLORS.text.muted,
                opacity: 0.6,
                fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
              }}>
                That's roughly <strong style={{ color: DT.COLORS.text.gold }}>{pages.toLocaleString()}</strong> pages.
              </div>
            )}
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          justifyContent: step > 1 ? 'space-between' : 'flex-end',
          alignItems: 'center',
          marginTop: '32px',
          gap: '12px',
        }}>
          {step > 1 && (
            <button style={ghostBtn} onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          )}

          {step < 3 && (
            <button
              style={(step === 1 ? canNext1 : canNext2) ? primaryBtn : disabledBtn}
              onClick={advance}
              disabled={step === 1 ? !canNext1 : !canNext2}
            >
              Next →
            </button>
          )}

          {step === 3 && (
            <button
              style={canFinish ? primaryBtn : disabledBtn}
              onClick={handleComplete}
              disabled={!canFinish}
            >
              Begin Your Tale
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
