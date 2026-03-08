import { forwardRef } from 'react';
import type { SessionXPBreakdown } from '@minstrelcodex/core';

export interface ShareableCardData {
  type: 'session' | 'streak' | 'level-up' | 'chronicle';
  // Session data
  wordsWritten?: number;
  durationSeconds?: number;
  xpBreakdown?: SessionXPBreakdown | null;
  // Profile data
  currentStreak?: number;
  currentLevel?: number;
  currentTitle?: string;
  totalXp?: number;
  // Chronicle data
  chronicleName?: string;
  chronicleWords?: number;
  // Custom
  headline?: string;
  subtitle?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

function getFlameEmoji(streak: number): string {
  if (streak >= 30) return '🔥🔥🔥';
  if (streak >= 14) return '🔥🔥';
  if (streak >= 3) return '🔥';
  return '✨';
}

const ShareableCard = forwardRef<HTMLDivElement, { data: ShareableCardData }>(
  ({ data }, ref) => {
    const {
      type, wordsWritten = 0, durationSeconds = 0, xpBreakdown,
      currentStreak = 0, currentLevel = 1, currentTitle = 'Apprentice Scribe',
      totalXp = 0, chronicleName, chronicleWords, headline, subtitle,
    } = data;

    const defaultHeadlines: Record<string, string> = {
      session: '♪ Song Complete',
      streak: `${getFlameEmoji(currentStreak)} ${currentStreak}-Day Streak`,
      'level-up': `⚔ Level ${currentLevel}`,
      chronicle: `📖 ${chronicleName || 'Chronicle'}`,
    };

    const displayHeadline = headline || defaultHeadlines[type] || 'Milestone';

    const defaultSubtitles: Record<string, string> = {
      session: `${wordsWritten.toLocaleString()} words in ${formatDuration(durationSeconds)}`,
      streak: `Writing every day for ${currentStreak} days`,
      'level-up': currentTitle,
      chronicle: chronicleWords ? `${chronicleWords.toLocaleString()} words` : '',
    };

    const displaySubtitle = subtitle || defaultSubtitles[type] || '';

    return (
      <div
        ref={ref}
        style={{
          width: '480px',
          height: '320px',
          background: 'linear-gradient(145deg, #0a0e14 0%, #111820 40%, #0d1117 100%)',
          color: '#c8d6e5',
          fontFamily: "'Space Grotesk', 'Segoe UI', sans-serif",
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '32px',
          boxSizing: 'border-box',
        }}
      >
        {/* Decorative border */}
        <div style={{
          position: 'absolute',
          inset: '8px',
          border: '1px solid rgba(200, 214, 229, 0.15)',
          pointerEvents: 'none',
        }} />

        {/* Corner ornaments */}
        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => {
          const [v, h] = corner.split('-');
          return (
            <div
              key={corner}
              style={{
                position: 'absolute',
                [v as string]: '12px',
                [h as string]: '12px',
                width: '20px',
                height: '20px',
                borderTop: v === 'top' ? '2px solid rgba(200, 214, 229, 0.3)' : 'none',
                borderBottom: v === 'bottom' ? '2px solid rgba(200, 214, 229, 0.3)' : 'none',
                borderLeft: h === 'left' ? '2px solid rgba(200, 214, 229, 0.3)' : 'none',
                borderRight: h === 'right' ? '2px solid rgba(200, 214, 229, 0.3)' : 'none',
                pointerEvents: 'none',
              }}
            />
          );
        })}

        {/* Glow accent */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(99, 179, 237, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Top label */}
        <div style={{
          fontSize: '10px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          opacity: 0.4,
          marginBottom: '8px',
        }}>
          MINSTREL CODEX
        </div>

        {/* Headline */}
        <div style={{
          fontSize: '28px',
          fontWeight: 700,
          textShadow: '0 0 20px rgba(99, 179, 237, 0.3)',
          marginBottom: '6px',
          textAlign: 'center',
        }}>
          {displayHeadline}
        </div>

        {/* Subtitle */}
        {displaySubtitle && (
          <div style={{
            fontSize: '14px',
            opacity: 0.6,
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            {displaySubtitle}
          </div>
        )}

        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: '24px',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          {type === 'session' && xpBreakdown && (
            <>
              <MiniStat label="XP" value={`+${xpBreakdown.totalXp.toLocaleString()}`} />
              {xpBreakdown.streakMultiplier > 1 && (
                <MiniStat label="STREAK" value={`${xpBreakdown.streakMultiplier}x`} />
              )}
              {xpBreakdown.focusMultiplier > 1 && (
                <MiniStat label="FOCUS" value={`${xpBreakdown.focusMultiplier}x`} />
              )}
            </>
          )}
          {type === 'streak' && (
            <>
              <MiniStat label="DAYS" value={currentStreak.toString()} />
              <MiniStat label="TOTAL XP" value={totalXp.toLocaleString()} />
            </>
          )}
          {type === 'level-up' && (
            <>
              <MiniStat label="LEVEL" value={currentLevel.toString()} />
              <MiniStat label="TOTAL XP" value={totalXp.toLocaleString()} />
            </>
          )}
          {type === 'chronicle' && chronicleWords && (
            <MiniStat label="WORDS" value={chronicleWords.toLocaleString()} />
          )}
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute',
          bottom: '14px',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '9px',
          letterSpacing: '0.2em',
          opacity: 0.25,
        }}>
          minstrelcodex.app
        </div>
      </div>
    );
  }
);

ShareableCard.displayName = 'ShareableCard';

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, textShadow: '0 0 10px rgba(99, 179, 237, 0.2)' }}>
        {value}
      </div>
      <div style={{ fontSize: '9px', letterSpacing: '0.15em', opacity: 0.4, marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
}

export default ShareableCard;
