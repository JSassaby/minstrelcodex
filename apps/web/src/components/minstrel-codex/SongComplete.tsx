import { useEffect, useState, useRef } from 'react';
import type { SessionXPBreakdown, ChronicleDefinition } from '@minstrelcodex/core';
import ShareMilestoneModal from './ShareMilestoneModal';
import type { ShareableCardData } from './ShareableCard';

const SESSION_TITLES = [
  'A Song Well Sung',
  'The Quill Rests',
  'Another Page of Legend',
  'Words for the Ages',
] as const;

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
  newChronicles?: ChronicleDefinition[];
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
  totalXp, xpInLevel, xpNeeded, newChronicles = [], onClose,
}: SongCompleteProps) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const [shareVisible, setShareVisible] = useState(false);
  const sessionTitleRef = useRef<string>(SESSION_TITLES[Math.floor(Math.random() * SESSION_TITLES.length)]);

  const shareData: ShareableCardData = {
    type: 'session',
    wordsWritten,
    durationSeconds,
    xpBreakdown,
    currentStreak,
    currentLevel,
    currentTitle,
    totalXp,
  };

  useEffect(() => {
    if (visible) {
      // Pick a new random title each time the modal opens
      sessionTitleRef.current = SESSION_TITLES[Math.floor(Math.random() * SESSION_TITLES.length)];
      setPhase('enter');
      const t = setTimeout(() => setPhase('visible'), 50);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!visible) return null;

  const progress = xpNeeded ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100;
  const opacity = phase === 'enter' ? 0 : 1;

  const streakDisplay = currentStreak > 0
    ? `🔥 ${currentStreak} day${currentStreak !== 1 ? 's' : ''}`
    : 'Begin your streak today';

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
          border: '1px solid var(--terminal-border)',
          maxWidth: '440px',
          width: '90vw',
          padding: '32px 28px',
          textAlign: 'center',
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
          ♪ {sessionTitleRef.current}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <StatBox label="WORDS SUNG" value={wordsWritten.toLocaleString()} />
          <StatBox label="TIME AT THE DESK" value={formatDuration(durationSeconds)} />
          <StatBox label="RENOWN EARNED" value={xpBreakdown ? `+${xpBreakdown.totalXp.toLocaleString()}` : '—'} highlight />
          <StatBox label="DAYS DEVOTED" value={streakDisplay} />
        </div>

        {/* Multiplier breakdown */}
        {xpBreakdown && (xpBreakdown.streakMultiplier > 1 || (xpBreakdown.streakDayBonus ?? 0) > 0) && (
          <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '16px', lineHeight: 1.8 }}>
            {xpBreakdown.streakMultiplier > 1 && (
              <div>🔥 Streak multiplier: {xpBreakdown.streakMultiplier}× ({currentStreak}-day streak)</div>
            )}
            {(xpBreakdown.streakDayBonus ?? 0) > 0 && (
              <div>✦ Streak day bonus: +{xpBreakdown.streakDayBonus} Renown</div>
            )}
          </div>
        )}

        {/* Level progress bar */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
            <span style={{ opacity: 0.6 }}>Lv.{currentLevel} {currentTitle}</span>
            <span style={{ opacity: 0.6 }}>
              {xpNeeded ? `${xpInLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} Renown` : 'MAX'}
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
              transition: 'width 1s cubic-bezier(.16,1,.3,1)',
            }} />
          </div>
        </div>

        <div style={{ fontSize: '11px', opacity: 0.4, marginBottom: newChronicles.length > 0 ? '12px' : '20px' }}>
          Total Renown: {totalXp.toLocaleString()}
        </div>

        {/* New Chronicles */}
        {newChronicles.length > 0 && (
          <div style={{
            background: 'rgba(200, 168, 75, 0.08)',
            border: '1px solid rgba(200, 168, 75, 0.35)',
            padding: '10px 14px',
            marginBottom: '20px',
            textAlign: 'left',
          }}>
            <div style={{
              fontSize: '10px',
              letterSpacing: '0.12em',
              color: '#c8a84b',
              fontWeight: 600,
              marginBottom: '8px',
            }}>
              {newChronicles.length === 1 ? 'NEW CHRONICLE UNLOCKED' : 'NEW CHRONICLES UNLOCKED'}
            </div>
            {newChronicles.map(c => (
              <div key={c.id} style={{
                fontSize: '12px',
                color: '#c8a84b',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}>
                <span>✦ {c.name}</span>
                <span style={{ fontSize: '11px', opacity: 0.8 }}>+{c.renownReward.toLocaleString()} Renown</span>
              </div>
            ))}
          </div>
        )}

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
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '10px', letterSpacing: '0.12em', opacity: 0.5, marginBottom: '4px' }}>{label}</div>
      <div style={{
        fontSize: '22px',
        fontWeight: 700,
        fontFamily: 'Georgia, serif',
        color: '#c8a84b',
        lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}
