import { useState, useRef, useCallback, useEffect } from 'react';
import { db } from '../db';
import { SESSION_MIN_WORDS, SESSION_MIN_MINUTES, SESSION_IDLE_MS, type WritingSessionRecord } from './types';

interface SessionTrackerOpts {
  chronicleId: string;
  onSessionComplete?: (session: WritingSessionRecord) => void;
}

function wordCount(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').filter(w => w.length > 0).length : 0;
}

export function useSessionTracker({ chronicleId, onSessionComplete }: SessionTrackerOpts) {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionWords, setSessionWords] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  const startWordsRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionActiveRef = useRef(false);
  const currentWordsRef = useRef(0);

  const endSession = useCallback(async () => {
    if (!sessionActiveRef.current) return null;
    sessionActiveRef.current = false;
    setSessionActive(false);

    const wordsWritten = currentWordsRef.current - startWordsRef.current;
    const startTime = sessionStartTime ?? Date.now();
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    const durationMinutes = durationSeconds / 60;

    if (wordsWritten < SESSION_MIN_WORDS || durationMinutes < SESSION_MIN_MINUTES) {
      return null; // session doesn't qualify
    }

    const session: WritingSessionRecord = {
      id: crypto.randomUUID(),
      chronicleId,
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date().toISOString(),
      wordCount: wordsWritten,
      durationSeconds,
      xpEarned: 0, // filled by XP engine
      streakDay: 0,
    };

    await db.table('writingSessions').put(session);
    onSessionComplete?.(session);
    return session;
  }, [chronicleId, onSessionComplete, sessionStartTime]);

  /** Call on every editor change with current content */
  const trackActivity = useCallback((content: string) => {
    const words = wordCount(content);
    currentWordsRef.current = words;
    lastActivityRef.current = Date.now();

    // Start session on first meaningful input
    if (!sessionActiveRef.current) {
      sessionActiveRef.current = true;
      setSessionActive(true);
      setSessionStartTime(Date.now());
      startWordsRef.current = words;
    }

    setSessionWords(words - startWordsRef.current);

    // Reset idle timer
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      endSession();
    }, SESSION_IDLE_MS);
  }, [endSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const sessionDuration = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : 0;

  return {
    sessionActive,
    sessionWords,
    sessionDuration,
    trackActivity,
    endSession,
  };
}
