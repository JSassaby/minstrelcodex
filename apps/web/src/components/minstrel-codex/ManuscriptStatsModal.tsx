import { useState, useEffect } from 'react';
import { db, type WritingStatRecord } from '@minstrelcodex/core';
import type { FileStructure, FileNode, DocumentData } from '@minstrelcodex/core';
import ModalShell from './ModalShell';

interface ManuscriptStatsModalProps {
  visible: boolean;
  structure: FileStructure;
  allDocuments: Record<string, DocumentData>;
  wordCountTarget: number;
  onClose: () => void;
}

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(html: string) {
  const text = stripHtml(html);
  return text ? text.split(' ').filter(w => w.length > 0).length : 0;
}

function collectChapterFiles(node: FileNode, acc: string[] = []): string[] {
  if (!node.children) return acc;
  for (const child of Object.values(node.children)) {
    if (child.type === 'file') acc.push(child.name);
    else collectChapterFiles(child, acc);
  }
  return acc;
}

function readingTime(words: number) {
  const mins = Math.round(words / 250);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function isoDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function ManuscriptStatsModal({
  visible, structure, allDocuments, wordCountTarget, onClose,
}: ManuscriptStatsModalProps) {
  const [stats, setStats] = useState<WritingStatRecord[]>([]);

  useEffect(() => {
    if (!visible) return;
    db.writingStats.orderBy('date').toArray().then(setStats).catch(console.error);
  }, [visible]);

  // Compute document-level stats
  const allFiles = collectChapterFiles(structure.root);
  const fileCounts = allFiles.map(f => ({
    name: f,
    words: countWords(allDocuments[f]?.content || ''),
  }));
  const totalWords = fileCounts.reduce((s, f) => s + f.words, 0);
  const chapterCount = fileCounts.filter(f => f.words > 0).length;
  const avgPerChapter = chapterCount > 0 ? Math.round(totalWords / chapterCount) : 0;
  const remaining = Math.max(0, wordCountTarget - totalWords);

  // Writing pace from Dexie stats
  const today = isoDate(new Date());
  const todayWords = stats.find(s => s.date === today)?.words || 0;

  const weekAgo = isoDate(new Date(Date.now() - 6 * 86400000));
  const weekWords = stats.filter(s => s.date >= weekAgo).reduce((a, s) => a + s.words, 0);

  const monthAgo = isoDate(new Date(Date.now() - 29 * 86400000));
  const monthWords = stats.filter(s => s.date >= monthAgo).reduce((a, s) => a + s.words, 0);

  const bestDay = stats.reduce((best, s) => s.words > best ? s.words : best, 0);

  // Best 7-day window
  const sortedDates = [...stats].sort((a, b) => a.date.localeCompare(b.date));
  let bestWeek = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    const windowStart = sortedDates[i].date;
    const windowEnd = isoDate(new Date(new Date(windowStart).getTime() + 6 * 86400000));
    const windowSum = sortedDates
      .filter(s => s.date >= windowStart && s.date <= windowEnd)
      .reduce((a, s) => a + s.words, 0);
    if (windowSum > bestWeek) bestWeek = windowSum;
  }

  // Daily average (past 14 days with data)
  const activeDays = stats.filter(s => s.date >= isoDate(new Date(Date.now() - 13 * 86400000)) && s.words > 0);
  const dailyAvg = activeDays.length > 0
    ? Math.round(activeDays.reduce((a, s) => a + s.words, 0) / activeDays.length)
    : 0;

  const projectedDays = dailyAvg > 0 ? Math.ceil(remaining / dailyAvg) : null;
  const projectedDate = projectedDays != null
    ? new Date(Date.now() + projectedDays * 86400000).toLocaleDateString()
    : null;

  const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div style={{
      border: '1px solid var(--terminal-border)',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '10px', opacity: 0.5, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: uiFont }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Georgia, serif', color: '#c8a84b', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '10px', opacity: 0.4, fontFamily: uiFont }}>{sub}</div>}
    </div>
  );

  return (
    <ModalShell visible={visible} title="📊 MANUSCRIPT STATISTICS" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '16px 0' }}>
        <Stat label="TOTAL WORDS" value={totalWords.toLocaleString()} sub={`${Math.round((totalWords / wordCountTarget) * 100)}% of ${wordCountTarget.toLocaleString()} target`} />
        <Stat label="CHAPTERS WITH TEXT" value={String(chapterCount)} sub={avgPerChapter > 0 ? `avg ${avgPerChapter.toLocaleString()}w each` : undefined} />
        <Stat label="EST. READING TIME" value={readingTime(totalWords)} sub="at 250 wpm" />
        <Stat label="WORDS REMAINING" value={remaining.toLocaleString()} sub={projectedDate ? `finish ~${projectedDate}` : 'set a daily pace to project'} />

        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--terminal-border)', paddingTop: '8px', fontSize: '10px', letterSpacing: '0.12em', fontWeight: 600, color: 'var(--terminal-accent)', fontFamily: uiFont, textTransform: 'uppercase' }}>
          WRITING PACE
        </div>

        <Stat label="TODAY" value={todayWords.toLocaleString()} sub="words written" />
        <Stat label="THIS WEEK" value={weekWords.toLocaleString()} sub="last 7 days" />
        <Stat label="THIS MONTH" value={monthWords.toLocaleString()} sub="last 30 days" />
        <Stat label="DAILY AVERAGE" value={dailyAvg > 0 ? dailyAvg.toLocaleString() : '—'} sub="past 14 active days" />

        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--terminal-border)', paddingTop: '8px', fontSize: '10px', letterSpacing: '0.12em', fontWeight: 600, color: 'var(--terminal-accent)', fontFamily: uiFont, textTransform: 'uppercase' }}>
          PERSONAL RECORDS
        </div>

        <Stat label="BEST DAY" value={bestDay > 0 ? bestDay.toLocaleString() : '—'} sub="words in a single day" />
        <Stat label="BEST WEEK" value={bestWeek > 0 ? bestWeek.toLocaleString() : '—'} sub="words in any 7-day window" />
      </div>
    </ModalShell>
  );
}
