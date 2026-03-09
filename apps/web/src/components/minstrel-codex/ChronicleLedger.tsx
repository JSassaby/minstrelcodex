import { useState, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';
import {
  DESIGN_TOKENS as DT,
  getLevelForXP,
  db,
} from '@minstrelcodex/core';
import type {
  WriterProfile,
  ChronicleDefinition,
  WritingStatRecord,
  AchievementRecord,
} from '@minstrelcodex/core';

// ── Constants ──────────────────────────────────────────────────────────────
const LV6_RENOWN  = 16_000;
const LV11_RENOWN = 80_000;

const CATEGORY_ORDER: ChronicleDefinition['category'][] = [
  'consistency', 'wordcount', 'session', 'project', 'hidden',
];

const CATEGORY_LABELS: Record<ChronicleDefinition['category'], string> = {
  consistency: 'Days Devoted',
  wordcount:   'Words of the Realm',
  session:     'Songs Sung',
  project:     'Milestones of Legend',
  hidden:      'Renown Earned',
};

const CATEGORY_ICONS: Record<ChronicleDefinition['category'], string> = {
  consistency: '🔥',
  wordcount:   '📜',
  session:     '🎵',
  project:     '📖',
  hidden:      '✨',
};

// ── Progress thresholds for locked chronicle bars ──────────────────────────
const WORD_THRESHOLDS: Record<string, number> = {
  'first-words-spoken': 100,
  'opening-chapter':    1_000,
  'into-the-story':     10_000,
  'first-act':          25_000,
  'middle-distance':    50_000,
  'full-manuscript':    80_000,
  'prolific-voice':     200_000,
};

const STREAK_THRESHOLDS: Record<string, number> = {
  'three-days-hence':    3,
  'week-unbroken':       7,
  'fortnights-devotion': 14,
  'month-of-making':     30,
  'creature-of-habit':   60,
};

function getProgress(
  id: string,
  totalWords: number,
  streakDays: number,
  sessionCount: number,
): number {
  if (id in WORD_THRESHOLDS)   return Math.min(1, totalWords / WORD_THRESHOLDS[id]);
  if (id in STREAK_THRESHOLDS) return Math.min(1, streakDays / STREAK_THRESHOLDS[id]);
  if (id === 'first-inkmark')  return Math.min(1, sessionCount / 1);
  return 0;
}

// ── Date helpers ───────────────────────────────────────────────────────────
function getToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d));
  }
  return days;
}

function dayLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

// ── Sub-components ─────────────────────────────────────────────────────────
function SectionHeader({
  title, right,
}: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '10px',
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: DT.COLORS.text.teal,
      marginBottom: '12px',
      paddingBottom: '6px',
      borderBottom: DT.BORDERS.default,
      fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
    }}>
      <span>{title}</span>
      {right != null && (
        <span style={{ opacity: 0.6, fontWeight: 500 }}>{right}</span>
      )}
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      border: DT.BORDERS.default,
      padding: DT.SPACING.cardPadding,
      background: DT.COLORS.background.card,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '10px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        opacity: 0.5,
        marginBottom: '4px',
        fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '22px',
        fontWeight: 700,
        fontFamily: 'Georgia, serif',
        color: DT.COLORS.ui.gold,
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: '10px',
          opacity: 0.55,
          marginTop: '3px',
          fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────
interface ChronicleLedgerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: WriterProfile;
  unlockedChronicles: ChronicleDefinition[];
  allChronicles: ChronicleDefinition[];
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ChronicleLedger({
  isOpen,
  onClose,
  profile,
  unlockedChronicles,
  allChronicles,
}: ChronicleLedgerProps) {
  const [activeTab, setActiveTab]           = useState<'overview' | 'chronicles'>('overview');
  const [totalWords, setTotalWords]         = useState(0);
  const [sessionCount, setSessionCount]     = useState(0);
  const [weekStats, setWeekStats]           = useState<Record<string, number>>({});
  const [bestDay, setBestDay]               = useState(0);
  const [achievementRecords, setAchievementRecords] = useState<AchievementRecord[]>([]);

  // Load data from IndexedDB when panel opens
  useEffect(() => {
    if (!isOpen) return;

    db.writingStats.toArray().then((records: WritingStatRecord[]) => {
      const sum  = records.reduce((acc, r) => acc + (r.words ?? 0), 0);
      const best = records.reduce((m, r) => Math.max(m, r.words ?? 0), 0);
      const map: Record<string, number> = {};
      records.forEach(r => { map[r.date] = r.words; });
      setTotalWords(sum);
      setBestDay(best);
      setWeekStats(map);
    });

    db.writingSessions.count().then(setSessionCount);
    db.achievements.toArray().then(setAchievementRecords);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ── Derived state ──────────────────────────────────────────────────────
  const { level, title } = getLevelForXP(profile.renown);
  const isLocked    = level < 6;
  const lv11Open    = level >= 11;

  const last7       = getLast7Days();
  const today       = getToday();
  const weekValues  = last7.map(d => weekStats[d] ?? 0);
  const weekMax     = Math.max(...weekValues, 1);
  const weekTotal   = weekValues.reduce((a, b) => a + b, 0);

  const unlockedIds = new Set(unlockedChronicles.map(c => c.id));
  const totalCount  = allChronicles.length;
  const earnedCount = unlockedChronicles.length;
  const chronPct    = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  // ── Panel shell ────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: '280px',
        height: '100%',
        background: 'var(--terminal-bg)',
        borderRight: DT.BORDERS.default,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
        color: 'var(--terminal-text)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 16px',
        borderBottom: DT.BORDERS.default,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: DT.SPACING.iconGap }}>
          <BookOpen
            size={DT.ICONS.lg.size}
            strokeWidth={DT.ICONS.lg.strokeWidth}
            style={{ color: DT.COLORS.text.teal }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em' }}>
            CHRONICLE LEDGER
          </span>
        </div>
        <div
          onClick={onClose}
          style={{
            cursor: 'pointer',
            opacity: 0.5,
            padding: '4px',
            transition: DT.TRANSITIONS.fast,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        >
          <X size={DT.ICONS.md.size} strokeWidth={2} />
        </div>
      </div>

      {/* ── Locked gate ─────────────────────────────────────────────── */}
      {isLocked ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📜</div>
          <div style={{
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: DT.COLORS.text.teal,
            marginBottom: '8px',
          }}>
            LOCKED
          </div>
          <div style={{ fontSize: '11px', opacity: 0.6, lineHeight: 1.6, marginBottom: '20px' }}>
            Opens at Lv 6 — Chronicler<br />(16,000 Renown)
          </div>
          {/* Renown progress toward Lv 6 */}
          <div style={{ width: '100%', marginBottom: '8px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              opacity: 0.5,
              marginBottom: '5px',
              fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
            }}>
              <span>{fmtNum(profile.renown)}</span>
              <span>{fmtNum(LV6_RENOWN)}</span>
            </div>
            <div style={{
              height: '4px',
              background: DT.COLORS.background.card,
              border: DT.BORDERS.default,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (profile.renown / LV6_RENOWN) * 100)}%`,
                background: DT.COLORS.ui.gold,
                transition: DT.TRANSITIONS.slow,
              }} />
            </div>
          </div>
          <div style={{ fontSize: '10px', opacity: 0.4 }}>
            {fmtNum(Math.max(0, LV6_RENOWN - profile.renown))} Renown remaining
          </div>
        </div>
      ) : (
        <>
          {/* ── Tabs ──────────────────────────────────────────────── */}
          <div style={{ display: 'flex', borderBottom: DT.BORDERS.default, flexShrink: 0 }}>
            {(['overview', 'chronicles'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '9px 8px',
                  border: 'none',
                  borderBottom: activeTab === tab
                    ? `2px solid ${DT.COLORS.ui.teal}`
                    : '2px solid transparent',
                  background: 'transparent',
                  color: activeTab === tab ? DT.COLORS.text.teal : 'var(--terminal-text)',
                  fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
                  fontSize: '11px',
                  fontWeight: activeTab === tab ? 700 : 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  opacity: activeTab === tab ? 1 : 0.5,
                  transition: DT.TRANSITIONS.fast,
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Scrollable body ───────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 24px' }}>

            {/* ════════════════ OVERVIEW TAB ════════════════ */}
            {activeTab === 'overview' && (
              <>
                {/* The Bard's Legend — 6 stat cards */}
                <SectionHeader title="The Bard's Legend" />
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: DT.SPACING.itemGap,
                  marginBottom: '16px',
                }}>
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
                    label="WORDS SUNG"
                    value={fmtNum(totalWords)}
                  />
                  <StatBox
                    label="SONGS COMPLETE"
                    value={fmtNum(sessionCount)}
                  />
                  <StatBox
                    label="DAYS DEVOTED"
                    value={String(profile.currentStreak)}
                    sub={`best: ${profile.longestStreak}d`}
                  />
                  <StatBox
                    label="FINEST HOUR"
                    value={bestDay > 0 ? fmtNum(bestDay) : '—'}
                    sub="best single day"
                  />
                </div>

                {/* This Week — bar chart */}
                <SectionHeader title="This Week" />
                <div style={{ marginBottom: '8px' }}>
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'flex-end',
                    height: '80px',
                    marginBottom: '4px',
                  }}>
                    {last7.map((date, i) => {
                      const words  = weekValues[i];
                      const barH   = weekMax > 0 ? Math.max(2, (words / weekMax) * 72) : 2;
                      const isToday = date === today;
                      return (
                        <div
                          key={date}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            height: '100%',
                          }}
                        >
                          {words > 0 && (
                            <div style={{
                              fontSize: '8px',
                              opacity: 0.6,
                              marginBottom: '2px',
                              textAlign: 'center',
                              lineHeight: 1,
                            }}>
                              {words >= 1000 ? `${(words / 1000).toFixed(1)}k` : words}
                            </div>
                          )}
                          <div style={{
                            width: '100%',
                            height: `${barH}px`,
                            background: isToday ? DT.COLORS.ui.teal : 'var(--terminal-border)',
                            opacity: words === 0 ? 0.25 : 1,
                            transition: 'height 0.4s ease',
                          }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {last7.map(date => (
                      <div key={date} style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: '9px',
                        opacity: date === today ? 1 : 0.45,
                        color: date === today ? DT.COLORS.ui.teal : 'var(--terminal-text)',
                        letterSpacing: '0.02em',
                      }}>
                        {dayLabel(date)}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{
                  fontSize: '11px',
                  opacity: 0.5,
                  textAlign: 'right',
                  marginBottom: '20px',
                }}>
                  {fmtNum(weekTotal)} words this week
                </div>

                {/* Hall of Works */}
                <SectionHeader title="Hall of Works" />
                {lv11Open ? (
                  <div style={{
                    fontSize: '11px',
                    opacity: 0.45,
                    textAlign: 'center',
                    padding: '16px 0',
                    marginBottom: '20px',
                  }}>
                    No works inscribed yet
                  </div>
                ) : (
                  <div style={{
                    border: DT.BORDERS.subtle,
                    padding: '14px',
                    marginBottom: '20px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '11px', opacity: 0.45, lineHeight: 1.6 }}>
                      🔒 Unlocks at Lv 11 — Grand Bard
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.3, marginTop: '4px' }}>
                      {fmtNum(Math.max(0, LV11_RENOWN - profile.renown))} Renown remaining
                    </div>
                  </div>
                )}

                {/* Chronicles summary */}
                <SectionHeader title="Chronicles" />
                <div style={{ marginBottom: '4px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    opacity: 0.7,
                    marginBottom: '6px',
                    fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
                  }}>
                    <span>{earnedCount} of {totalCount} earned</span>
                    <span style={{ color: DT.COLORS.ui.gold }}>{Math.round(chronPct)}%</span>
                  </div>
                  <div style={{
                    height: '4px',
                    background: DT.COLORS.background.card,
                    border: DT.BORDERS.default,
                    overflow: 'hidden',
                    marginBottom: '12px',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${chronPct}%`,
                      background: DT.COLORS.ui.gold,
                      transition: 'width 0.8s cubic-bezier(.16,1,.3,1)',
                    }} />
                  </div>
                  <button
                    onClick={() => setActiveTab('chronicles')}
                    style={{
                      width: '100%',
                      padding: DT.SPACING.buttonPadding,
                      border: DT.BORDERS.default,
                      borderRadius: DT.BORDER_RADIUS.button,
                      background: 'transparent',
                      color: DT.COLORS.text.teal,
                      fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                      transition: DT.TRANSITIONS.fast,
                      boxShadow: DT.SHADOWS.card,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = DT.COLORS.background.card;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    VIEW ALL CHRONICLES →
                  </button>
                </div>
              </>
            )}

            {/* ════════════════ CHRONICLES TAB ════════════════ */}
            {activeTab === 'chronicles' && (
              <>
                {CATEGORY_ORDER.map(cat => {
                  const catChronicles = allChronicles.filter(c => c.category === cat);
                  if (catChronicles.length === 0) return null;
                  const catEarned = catChronicles.filter(c => unlockedIds.has(c.id)).length;

                  return (
                    <div key={cat} style={{ marginBottom: '24px' }}>
                      <SectionHeader
                        title={`${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
                        right={`${catEarned}/${catChronicles.length}`}
                      />
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: DT.SPACING.itemGap,
                      }}>
                        {catChronicles.map(c => {
                          const isUnlocked = unlockedIds.has(c.id);
                          const record     = achievementRecords.find(r => r.id === c.id);
                          const dateStr    = record
                            ? new Date(record.unlockedAt).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short',
                              })
                            : '';
                          const progress = !isUnlocked
                            ? getProgress(c.id, totalWords, profile.currentStreak, sessionCount)
                            : 0;
                          const showLock = c.hidden && !isUnlocked;

                          return (
                            <div
                              key={c.id}
                              style={{
                                border: isUnlocked
                                  ? `1px solid rgba(0, 223, 160, 0.35)`
                                  : DT.BORDERS.default,
                                padding: '8px 10px',
                                background: isUnlocked
                                  ? 'rgba(0, 223, 160, 0.04)'
                                  : 'transparent',
                                opacity: isUnlocked ? 1 : 0.5,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px',
                              }}
                            >
                              {/* Icon */}
                              <div style={{ fontSize: '14px', lineHeight: 1, marginBottom: '2px' }}>
                                {showLock ? '🔒' : CATEGORY_ICONS[c.category]}
                              </div>

                              {/* Title */}
                              <div style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                color: isUnlocked ? DT.COLORS.ui.teal : 'var(--terminal-text)',
                                lineHeight: 1.3,
                                fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
                              }}>
                                {showLock ? '???' : c.name}
                              </div>

                              {/* Description */}
                              <div style={{
                                fontSize: '9px',
                                opacity: 0.6,
                                lineHeight: 1.4,
                                fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
                              }}>
                                {showLock ? 'Secret chronicle' : c.description}
                              </div>

                              {/* Unlock date */}
                              {isUnlocked && dateStr && (
                                <div style={{
                                  fontSize: '9px',
                                  color: DT.COLORS.text.teal,
                                  opacity: 0.7,
                                  marginTop: '2px',
                                  fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
                                }}>
                                  {dateStr}
                                </div>
                              )}

                              {/* Progress bar for locked with known progress */}
                              {!isUnlocked && progress > 0 && (
                                <div style={{
                                  marginTop: '4px',
                                  height: '2px',
                                  background: DT.COLORS.background.card,
                                  overflow: 'hidden',
                                }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${progress * 100}%`,
                                    background: DT.COLORS.ui.teal,
                                  }} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 14px',
        borderTop: DT.BORDERS.default,
        fontSize: '10px',
        opacity: 0.35,
        textAlign: 'center',
        letterSpacing: '0.04em',
        flexShrink: 0,
        fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
      }}>
        Ctrl+Shift+C to close
      </div>
    </div>
  );
}
