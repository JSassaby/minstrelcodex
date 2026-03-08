import { useEffect, useState } from 'react';
import type { SessionXPBreakdown } from '@minstrelcodex/core';
import ShareMilestoneModal from './ShareMilestoneModal';
import type { ShareableCardData } from './ShareableCard';

interface SongCompleteProps {
  visible: boolean;
  wordsWritten: number;
  durationSeconds: number;
  xpBreakdown: SessionXPBreakdown | null;
  currentStreak: number;
  currentLevel: number;
  currentTitle: string;
  totalXp: number;
  xpInLevel: number;
  xpNeeded: number | null;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function SongComplete({
  visible, wordsWritten, durationSeconds, xpBreakdown,
  currentStreak, currentLevel, currentTitle,
  totalXp, xpInLevel, xpNeeded, onClose,
}: SongCompleteProps) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');

  useEffect(() => {
    if (visible) {
      setPhase('enter');
      const t = setTimeout(() => setPhase('visible'), 50);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!visible) return null;

  const progress = xpNeeded ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100;
  const opacity = phase === 'enter' ? 0 : 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)',
        opacity,
        transition: 'opacity 0.5s ease',
        fontFamily: "var(--font-ui, 'Space Grotesk', sans-serif)",
        color: 'var(--terminal-text)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--terminal-bg)',
          border: '2px solid var(--terminal-text)',
          maxWidth: '440px',
          width: '90vw',
          padding: '32px 28px',
          textAlign: 'center',
          boxShadow: '0 0 60px var(--terminal-glow), 0 0 120px var(--terminal-glow)',
          transform: phase === 'enter' ? 'scale(0.9) translateY(20px)' : 'scale(1) translateY(0)',
          transition: 'transform 0.5s cubic-bezier(.16,1,.3,1), opacity 0.5s ease',
          opacity,
        }}
      >
        {/* Header */}
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', opacity: 0.5, marginBottom: '4px' }}>
          SONG COMPLETE
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', textShadow: '0 0 8px var(--terminal-glow)' }}>
          ♪ Session Ended
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <StatBox label="WORDS WRITTEN" value={wordsWritten.toLocaleString()} />
          <StatBox label="TIME SPENT" value={formatDuration(durationSeconds)} />
          <StatBox label="XP EARNED" value={xpBreakdown ? `+${xpBreakdown.totalXp.toLocaleString()}` : '—'} highlight />
          <StatBox label="STREAK" value={currentStreak > 0 ? `🔥 ${currentStreak} day${currentStreak !== 1 ? 's' : ''}` : 'Start today!'} />
        </div>

        {/* Multiplier breakdown */}
        {xpBreakdown && (xpBreakdown.focusMultiplier > 1 || xpBreakdown.streakMultiplier > 1) && (
          <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '16px', lineHeight: 1.8 }}>
            {xpBreakdown.focusMultiplier > 1 && (
              <div>⚡ Focus bonus: {xpBreakdown.focusMultiplier}x (30+ min session)</div>
            )}
            {xpBreakdown.streakMultiplier > 1 && (
              <div>🔥 Streak bonus: {xpBreakdown.streakMultiplier}x ({currentStreak}-day streak)</div>
            )}
          </div>
        )}

        {/* Level progress bar */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
            <span style={{ opacity: 0.6 }}>Lv.{currentLevel} {currentTitle}</span>
            <span style={{ opacity: 0.6 }}>
              {xpNeeded ? `${xpInLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} XP` : 'MAX'}
            </span>
          </div>
          <div style={{
            height: '8px',
            background: 'var(--terminal-surface)',
            border: '1px solid var(--terminal-border)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--terminal-accent)',
              boxShadow: '0 0 8px var(--terminal-glow)',
              transition: 'width 1s cubic-bezier(.16,1,.3,1)',
            }} />
          </div>
        </div>

        <div style={{ fontSize: '11px', opacity: 0.4, marginBottom: '20px' }}>
          Total XP: {totalXp.toLocaleString()}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => setShareVisible(true)}
            style={{
              padding: '10px 24px',
              border: '1px solid var(--terminal-text)',
              background: 'transparent',
              color: 'var(--terminal-text)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13px',
              letterSpacing: '0.1em',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--terminal-surface)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            ⇗ SHARE
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 32px',
              border: '1px solid var(--terminal-text)',
              background: 'transparent',
              color: 'var(--terminal-text)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13px',
              letterSpacing: '0.1em',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--terminal-accent)'; e.currentTarget.style.color = 'var(--terminal-bg)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--terminal-text)'; }}
          >
            CONTINUE WRITING
          </button>
        </div>

        {/* Share modal */}
        <ShareMilestoneModal
          visible={shareVisible}
          data={shareData}
          onClose={() => setShareVisible(false)}
        />
      </div>
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      border: '1px solid var(--terminal-border)',
      padding: '14px 10px',
      background: highlight ? 'var(--terminal-surface)' : 'transparent',
    }}>
      <div style={{ fontSize: '10px', letterSpacing: '0.15em', opacity: 0.5, marginBottom: '4px' }}>{label}</div>
      <div style={{
        fontSize: highlight ? '22px' : '20px',
        fontWeight: 700,
        textShadow: highlight ? '0 0 8px var(--terminal-glow)' : undefined,
      }}>{value}</div>
    </div>
  );
}
