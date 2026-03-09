import { useState, useEffect, useRef, useCallback } from 'react';
import { DESIGN_TOKENS as DT } from '@minstrelcodex/core';
import type { BeatType, NarrativeBeat } from '@minstrelcodex/core';

// ── Beat icons ─────────────────────────────────────────────────────────────
const BEAT_ICONS: Record<BeatType, string> = {
  'inciting-incident': '⚡',
  'decision':          '🔱',
  'midpoint':          '⚔️',
  'crisis':            '🌑',
  'climax':            '🔥',
  'transformation':    '✨',
};

const DISMISS_DURATION = 6000; // ms

interface NarrativeBeatToastProps {
  beat: NarrativeBeat | null;
  onDismiss: () => void;
}

export default function NarrativeBeatToast({ beat, onDismiss }: NarrativeBeatToastProps) {
  // localBeat holds the beat to display; it lags behind `beat` by one
  // transition cycle so we can animate out before unmounting
  const [localBeat, setLocalBeat]   = useState<NarrativeBeat | null>(null);
  const [entered, setEntered]       = useState(false);
  const [progress, setProgress]     = useState(100); // 0–100 drain bar

  const dismissedRef  = useRef(false);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (intervalRef.current)  { clearInterval(intervalRef.current);  intervalRef.current  = null; }
    if (timeoutRef.current)   { clearTimeout(timeoutRef.current);    timeoutRef.current   = null; }
  }, []);

  // Trigger the dismiss sequence: slide out then call onDismiss
  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    clearTimers();
    setEntered(false);
    // Wait for CSS transition (300ms) before unmounting
    timeoutRef.current = setTimeout(onDismiss, 300);
  }, [clearTimers, onDismiss]);

  // Mount / new beat
  useEffect(() => {
    if (!beat) {
      // Parent cleared the beat — slide out if visible
      if (localBeat) handleDismiss();
      return;
    }

    // New beat arriving
    clearTimers();
    dismissedRef.current = false;
    setLocalBeat(beat);
    setProgress(100);
    setEntered(false); // start hidden

    // One-frame delay to allow DOM to paint before starting transition
    timeoutRef.current = setTimeout(() => setEntered(true), 16);

    // Drain progress bar and auto-dismiss after DISMISS_DURATION
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.max(0, 100 - (elapsed / DISMISS_DURATION) * 100);
      setProgress(pct);
      if (elapsed >= DISMISS_DURATION) handleDismiss();
    }, 50);

    return clearTimers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!localBeat) return null;

  return (
    <div
      onClick={handleDismiss}
      aria-live="polite"
      aria-label={`Narrative beat: ${localBeat.label}`}
      style={{
        position:   'fixed',
        bottom:     '28px',
        left:       '50%',
        // Slide in from below; slide out back down
        transform:  entered
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(120%)',
        opacity:    entered ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        width:      '320px',
        // ── Design tokens — no hardcoded values ──────────────────────
        background:   DT.COLORS.background.panel,
        border:       DT.BORDERS.default,
        borderRadius: DT.BORDER_RADIUS.modal,   // 0
        boxShadow:    DT.SHADOWS.modal,          // 'none'
        zIndex:       DT.Z_INDEX.modal - 100,
        cursor:       'pointer',
        overflow:     'hidden',
        fontFamily:   DT.TYPOGRAPHY.ui.fontFamily,
        userSelect:   'none',
      }}
    >
      {/* ── Content ──────────────────────────────────────────────── */}
      <div style={{ padding: '12px 14px' }}>
        {/* Header row: icon + label */}
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          DT.SPACING.iconGap,
          marginBottom: '6px',
        }}>
          <span style={{ fontSize: '16px', lineHeight: 1 }}>
            {BEAT_ICONS[localBeat.type]}
          </span>
          <span style={{
            fontSize:      DT.TYPOGRAPHY.sectionHeader.fontSize,
            fontWeight:    DT.TYPOGRAPHY.sectionHeader.fontWeight,
            letterSpacing: DT.TYPOGRAPHY.sectionHeader.letterSpacing,
            textTransform: DT.TYPOGRAPHY.sectionHeader.textTransform,
            color:         DT.COLORS.text.teal,
            fontFamily:    DT.TYPOGRAPHY.sectionHeader.fontFamily,
          }}>
            {localBeat.label}
          </span>
        </div>

        {/* Description */}
        <div style={{
          fontSize:   '11px',
          opacity:    0.6,
          lineHeight: 1.5,
          fontFamily: DT.TYPOGRAPHY.body.fontFamily,
          color:      DT.COLORS.text.primary,
        }}>
          {localBeat.description}
        </div>
      </div>

      {/* ── Progress bar (drains over 6 s) ───────────────────────── */}
      <div style={{
        height:     '2px',
        background: DT.COLORS.background.card,
      }}>
        <div style={{
          height:     '100%',
          width:      `${progress}%`,
          background: DT.COLORS.ui.teal,
          transition: 'width 0.05s linear',
        }} />
      </div>
    </div>
  );
}
