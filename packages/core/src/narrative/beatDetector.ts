import type { BeatType, NarrativeBeat } from './types';

// ── Beat definitions ───────────────────────────────────────────────────────
// Each entry: [threshold%, type, label, description]
const BEAT_THRESHOLDS: Array<{
  threshold: number;
  type: BeatType;
  label: string;
  description: string;
}> = [
  {
    threshold:   25,
    type:        'inciting-incident',
    label:       'The Inciting Incident',
    description: 'Something has changed. The story begins in earnest.',
  },
  {
    threshold:   50,
    type:        'midpoint',
    label:       'The Midpoint',
    description: 'Halfway through. The stakes are raised.',
  },
  {
    threshold:   75,
    type:        'crisis',
    label:       'The Crisis',
    description: 'All seems lost. The darkest moment approaches.',
  },
  {
    threshold:   90,
    type:        'climax',
    label:       'The Climax',
    description: 'The decisive moment. Everything converges here.',
  },
];

/**
 * Check whether a narrative beat should fire.
 *
 * @param totalWords    - overall project word count (or target length)
 * @param documentWords - words written so far in the current document/chapter
 * @param firedBeatTypes - beat types that have already fired (never repeat)
 * @returns the first unfired beat whose threshold has been crossed, or null
 */
export function detectBeat(
  totalWords: number,
  documentWords: number,
  firedBeatTypes: BeatType[],
): NarrativeBeat | null {
  if (totalWords <= 0 || documentWords <= 0) return null;

  const positionPercent = Math.min(100, Math.max(0, (documentWords / totalWords) * 100));

  for (const def of BEAT_THRESHOLDS) {
    if (firedBeatTypes.includes(def.type)) continue;
    if (positionPercent >= def.threshold) {
      return {
        type:            def.type,
        label:           def.label,
        description:     def.description,
        positionPercent: Math.round(positionPercent * 10) / 10,
        wordCount:       documentWords,
        firedAt:         new Date().toISOString(),
      };
    }
  }

  return null;
}
