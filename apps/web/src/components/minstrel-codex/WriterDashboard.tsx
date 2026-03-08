import { useState, useEffect } from 'react';
import { X, LayoutDashboard } from 'lucide-react';
import {
  WRITER_RANKS,
  STREAK_TIERS,
  getLevelForXP,
  getStreakMultiplier,
  db,
} from '@minstrelcodex/core';
import type { WriterProfile, WritingStatRecord, ChronicleDefinition, AchievementRecord } from '@minstrelcodex/core';

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";
const GOLD = '#c8a84b';
const TEAL = 'var(--terminal-accent)';

// ── Helpers ───────────────────────────────────────────────────────────
function getToday(): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d));
  }
  return days;
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short' });
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

// ── Section header ────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: '10px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: TEAL,
      fontWeight: 600,
      marginBottom: '12px',
      paddingBottom: '6px',
      borderBottom: '1px solid var(--terminal-border)',
    }}>
      {title}
    </div>
  );
}

// ── Stat box (2×2 grid cell) ──────────────────────────────────────────
function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      border: '1px solid var(--terminal-border)',
      padding: '12px 10px',
      background: 'var(--terminal-surface)',
    }}>
      <div style={{ fontSize: '10px', letterSpacing: '0.12em', opacity: 0.5, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Georgia, serif', color: GOLD, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '10px', opacity: 0.55, marginTop: '3px' }}>{sub}</div>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────
interface WriterDashboardProps {
  visible: boolean;
  profile: WriterProfile;
  unlockedChronicles?: ChronicleDefinition[];
  allChronicles?: ChronicleDefinition[];
  onClose: () => void;
}

export default function WriterDashboard({ visible, profile, unlockedChronicles = [], allChronicles = [], onClose }: WriterDashboardProps) {
  const [totalWords, setTotalWords] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [weekStats, setWeekStats] = useState<Record<string, number>>({});
  const [achievementRecords, setAchievementRecords] = useState<AchievementRecord[]>([]);

  // Load data from IndexedDB whenever panel opens
  useEffect(() => {
    if (!visible) return;

    db.writingStats.toArray().then((records: WritingStatRecord[]) => {
      const sum = records.reduce((acc, r) => acc + (r.words ?? 0), 0);
      setTotalWords(sum);
      const map: Record<string, number> = {};
      records.forEach(r => { map[r.date] = r.words; });
      setWeekStats(map);
    });

    db.writingSessions.count().then(setSessionCount);

    db.achievements.toArray().then(setAchievementRecords);
  }, [visible]);

  if (!visible) return null;

  // ── Level data ──────────────────────────────────────────────────────
  const { level, title, xpForCurrent, xpForNext } = getLevelForXP(profile.renown);
  const nextRank = WRITER_RANKS.find(r => r.level === level + 1);
  const renownInLevel = profile.renown - xpForCurrent;
  const renownNeeded = xpForNext !== null ? xpForNext - xpForCurrent : null;
  const levelProgress = renownNeeded ? Math.min(100, (renownInLevel / renownNeeded) * 100) : 100;

  // ── Streak data ─────────────────────────────────────────────────────
  const streakDays = profile.currentStreak;
  const streakMultiplier = getStreakMultiplier(streakDays);
  const activeTier = [...STREAK_TIERS].reverse().find(t => streakDays >= t.minDays);
  const streakLabel = activeTier?.label || '';

  // ── This Week ───────────────────────────────────────────────────────
  const last7 = getLast7Days();
  const today = getToday();
  const weekValues = last7.map(d => weekStats[d] ?? 0);
  const weekMax = Math.max(...weekValues, 1);
  const weekTotal = weekValues.reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        width: '280px',
        height: '100%',
        background: 'var(--terminal-bg)',
        borderRight: '1px solid var(--terminal-border)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: uiFont,
        color: 'var(--terminal-text)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LayoutDashboard size={15} strokeWidth={1.8} style={{ color: TEAL }} />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em' }}>
            WRITER DASHBOARD
          </span>
        </div>
        <div
          onClick={onClose}
          style={{ cursor: 'pointer', opacity: 0.5, padding: '4px', borderRadius: '4px', transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        >
          <X size={14} strokeWidth={2} />
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 24px' }}>

        {/* ── Section 1: The Bard's Legend ──────────────────────────── */}
        <SectionHeader title="The Bard's Legend" />

        {/* 2×2 stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <StatBox
            label="TOTAL RENOWN"
            value={fmtNum(profile.renown)}
          />
          <StatBox
            label="CURRENT LEVEL"
            value={`Lv ${level}`}
            sub={title}
          />
          <StatBox
            label="WORDS WRITTEN"
            value={fmtNum(totalWords)}
          />
          <StatBox
            label="TOTAL SESSIONS"
            value={fmtNum(sessionCount)}
          />
        </div>

        {/* Renown progress bar */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '5px', opacity: 0.7 }}>
            <span>{title}</span>
            <span>{nextRank?.title ?? '—'}</span>
          </div>
          <div style={{
            height: '6px',
            background: 'var(--terminal-surface)',
            border: '1px solid var(--terminal-border)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${levelProgress}%`,
              background: GOLD,
              transition: 'width 0.8s cubic-bezier(.16,1,.3,1)',
            }} />
          </div>
          <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '5px', textAlign: 'center' }}>
            {level === 12
              ? 'Legend of the Page — Maximum level reached'
              : `${fmtNum(renownNeeded! - renownInLevel)} Renown to ${nextRank?.title}`
            }
          </div>
        </div>

        {/* Streak row */}
        <div style={{
          background: 'var(--terminal-surface)',
          border: '1px solid var(--terminal-border)',
          padding: '10px 12px',
          marginBottom: '20px',
          fontSize: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>
              {streakDays > 0 ? `🔥 ${streakDays} day streak` : 'No active streak'}
            </span>
            {streakDays >= 3 && (
              <span style={{ fontSize: '10px', color: TEAL, opacity: 0.85 }}>
                {streakMultiplier}× {streakLabel}
              </span>
            )}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.5 }}>
            Longest ever: {profile.longestStreak} day{profile.longestStreak !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── Section 2: This Week ──────────────────────────────────── */}
        <SectionHeader title="This Week" />

        <div style={{ marginBottom: '8px' }}>
          {/* Bar chart */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '80px', marginBottom: '4px' }}>
            {last7.map((date, i) => {
              const words = weekValues[i];
              const barHeight = weekMax > 0 ? Math.max(2, (words / weekMax) * 72) : 2;
              const isToday = date === today;
              return (
                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  {words > 0 && (
                    <div style={{ fontSize: '8px', opacity: 0.6, marginBottom: '2px', textAlign: 'center', lineHeight: 1 }}>
                      {words >= 1000 ? `${(words / 1000).toFixed(1)}k` : words}
                    </div>
                  )}
                  <div style={{
                    width: '100%',
                    height: `${barHeight}px`,
                    background: isToday ? TEAL : 'var(--terminal-border)',
                    opacity: words === 0 ? 0.25 : 1,
                    transition: 'height 0.4s ease',
                  }} />
                </div>
              );
            })}
          </div>
          {/* Day labels */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {last7.map((date) => (
              <div key={date} style={{
                flex: 1,
                textAlign: 'center',
                fontSize: '9px',
                opacity: date === today ? 1 : 0.45,
                color: date === today ? TEAL : 'var(--terminal-text)',
                letterSpacing: '0.02em',
              }}>
                {dayLabel(date)}
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: '11px', opacity: 0.5, textAlign: 'right', marginBottom: '20px' }}>
          {fmtNum(weekTotal)} words this week
        </div>

        {/* ── Section 3: Renown Breakdown ───────────────────────────── */}
        <SectionHeader title="Renown Breakdown" />

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '10px' }}>
          <tbody>
            {[
              ['Words written',                 '0.5 per word'],
              ['Session ≥ 250 words',           '+25 bonus'],
              ['Session ≥ 500 words',           '+75 bonus'],
              ['Session ≥ 1,000 words',         '+200 bonus'],
              ['Chapter completed (sprint end)', '+50'],
              ['First session of the day',      '+15'],
              ['Personal best (word record)',   '+100'],
              ['Novel completed',               '+1,000'],
              ['Chronicle unlocked',            '+50'],
              ['Daily streak bonus',            '+10 × streak day'],
            ].map(([action, reward]) => (
              <tr key={action} style={{ borderBottom: '1px solid var(--terminal-border)' }}>
                <td style={{ padding: '5px 4px 5px 0', opacity: 0.7, lineHeight: 1.3 }}>{action}</td>
                <td style={{ padding: '5px 0', textAlign: 'right', color: GOLD, fontWeight: 600, whiteSpace: 'nowrap', paddingLeft: '4px' }}>
                  {reward}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: '10px', marginBottom: '6px', opacity: 0.6, letterSpacing: '0.04em' }}>
          STREAK MULTIPLIERS
        </div>
        {STREAK_TIERS.filter(t => t.minDays > 0).map(tier => (
          <div key={tier.minDays} style={{
            fontSize: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '3px 0',
            borderBottom: '1px solid var(--terminal-border)',
            opacity: streakDays >= tier.minDays ? 1 : 0.45,
          }}>
            <span>
              {tier.maxDays !== null
                ? `${tier.minDays}–${tier.maxDays} days`
                : `${tier.minDays}+ days`} — {tier.label}
            </span>
            <span style={{ color: GOLD, fontWeight: 600 }}>{tier.multiplier}×</span>
          </div>
        ))}

        <div style={{ marginBottom: '20px' }} />

        {/* ── Section 4: Level Roadmap ──────────────────────────────── */}
        <SectionHeader title="Level Roadmap" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {WRITER_RANKS.map(rank => {
            const isCurrent = rank.level === level;
            const isDone = rank.level < level;
            return (
              <div
                key={rank.level}
                style={{
                  padding: '8px 10px',
                  border: `1px solid ${isCurrent ? TEAL : 'var(--terminal-border)'}`,
                  background: isCurrent ? 'rgba(42, 157, 143, 0.08)' : 'transparent',
                  opacity: isDone ? 0.55 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? TEAL : isDone ? GOLD : 'var(--terminal-text)',
                  }}>
                    {isDone ? '✓ ' : ''}{rank.title}
                  </span>
                  <span style={{ fontSize: '9px', opacity: 0.5 }}>Lv {rank.level}</span>
                </div>
                <div style={{ fontSize: '9px', opacity: 0.45, marginBottom: '2px' }}>
                  {rank.renownRequired === 0 ? 'Starting rank' : `${fmtNum(rank.renownRequired)} Renown`}
                </div>
                <div style={{ fontSize: '9px', opacity: isCurrent ? 0.75 : 0.45, lineHeight: 1.3 }}>
                  {rank.unlocks}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: '20px' }} />

        {/* ── Section 5: Chronicles ──────────────────────────────────── */}
        <SectionHeader title="Chronicles" />

        {/* Earned */}
        {unlockedChronicles.length > 0 && (
          <>
            <div style={{ fontSize: '9px', letterSpacing: '0.1em', opacity: 0.5, marginBottom: '6px' }}>EARNED</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              {unlockedChronicles.map(c => {
                const record = achievementRecords.find(r => r.id === c.id);
                const dateStr = record
                  ? new Date(record.unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '';
                return (
                  <div
                    key={c.id}
                    style={{
                      border: `1px solid ${GOLD}`,
                      padding: '8px 10px',
                      background: 'rgba(200, 168, 75, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: GOLD }}>{c.name}</span>
                      <span style={{
                        fontSize: '9px',
                        background: TEAL,
                        color: 'var(--terminal-bg)',
                        padding: '1px 5px',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                      }}>
                        {c.category}
                      </span>
                    </div>
                    <div style={{ fontSize: '9px', opacity: 0.6, marginBottom: '2px' }}>{c.description}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                      <span style={{ color: GOLD, opacity: 0.8 }}>+{fmtNum(c.renownReward)} Renown</span>
                      <span style={{ opacity: 0.4 }}>{dateStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Locked */}
        {(() => {
          const unlockedIds = new Set(unlockedChronicles.map(c => c.id));
          const locked = allChronicles.filter(c => !unlockedIds.has(c.id));
          if (locked.length === 0) return null;
          return (
            <>
              <div style={{ fontSize: '9px', letterSpacing: '0.1em', opacity: 0.5, marginBottom: '6px' }}>LOCKED</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {locked.map(c => {
                  const isHidden = c.hidden;
                  return (
                    <div
                      key={c.id}
                      style={{
                        border: '1px solid var(--terminal-border)',
                        padding: '7px 10px',
                        opacity: 0.5,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 500 }}>
                          {isHidden ? '🔒 ???' : `🔒 ${c.name}`}
                        </span>
                        <span style={{
                          fontSize: '9px',
                          border: '1px solid var(--terminal-border)',
                          padding: '1px 5px',
                          letterSpacing: '0.05em',
                        }}>
                          {isHidden ? 'hidden' : c.category}
                        </span>
                      </div>
                      {!isHidden && (
                        <div style={{ fontSize: '9px', opacity: 0.6 }}>{c.description}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--terminal-border)',
        fontSize: '10px',
        opacity: 0.35,
        textAlign: 'center',
        letterSpacing: '0.04em',
        flexShrink: 0,
      }}>
        Ctrl+Shift+U to close
      </div>
    </div>
  );
}
