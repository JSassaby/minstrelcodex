import { useState, useEffect, useCallback, useRef } from 'react';
import { detectBeat } from './beatDetector';
import type { BeatType, NarrativeBeat, NarrativeState } from './types';

const STORAGE_KEY = 'minstrel-narrative-beats';

function loadFiredTypes(): BeatType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFiredTypes(types: BeatType[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
  } catch {
    // localStorage unavailable — continue silently
  }
}

/**
 * useNarrativeEngine
 *
 * Tracks narrative beats (inciting incident, midpoint, crisis, climax) as the
 * writer progresses through their project. Beats fire once and are persisted to
 * localStorage so they never repeat across sessions.
 *
 * @param documentWords - live word count for the current document/chapter
 * @param totalWords    - overall project word count target (denominator)
 */
export function useNarrativeEngine(
  documentWords: number,
  totalWords: number,
): { state: NarrativeState; dismissBeat: () => void } {
  // Fired types persisted to localStorage
  const [firedTypes, setFiredTypes]     = useState<BeatType[]>(loadFiredTypes);
  const firedTypesRef                   = useRef<BeatType[]>(firedTypes);

  // Session-local list of beats that fired this session
  const [beats, setBeats]               = useState<NarrativeBeat[]>([]);
  const [pendingBeat, setPendingBeat]   = useState<NarrativeBeat | null>(null);

  // Keep ref in sync so the effect always sees the latest value without re-running
  useEffect(() => { firedTypesRef.current = firedTypes; }, [firedTypes]);

  // Beat detection — runs on every word count change
  useEffect(() => {
    if (totalWords <= 0 || documentWords <= 0) return;

    const beat = detectBeat(totalWords, documentWords, firedTypesRef.current);
    if (!beat) return;

    const updated = [...firedTypesRef.current, beat.type];
    firedTypesRef.current = updated;
    setFiredTypes(updated);
    saveFiredTypes(updated);
    setBeats(prev => [...prev, beat]);
    setPendingBeat(beat);
  }, [documentWords, totalWords]);

  const dismissBeat = useCallback(() => {
    setPendingBeat(null);
  }, []);

  const positionPercent =
    totalWords > 0
      ? Math.min(100, Math.max(0, (documentWords / totalWords) * 100))
      : 0;

  const state: NarrativeState = {
    beats,
    totalWords,
    currentActPercent: Math.round(positionPercent * 10) / 10,
    pendingBeat,
  };

  return { state, dismissBeat };
}
