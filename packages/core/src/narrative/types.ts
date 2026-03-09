export type BeatType =
  | 'inciting-incident'
  | 'decision'
  | 'midpoint'
  | 'crisis'
  | 'climax'
  | 'transformation';

export interface NarrativeBeat {
  type: BeatType;
  label: string;
  description: string;
  positionPercent: number; // 0–100, where in the doc this fires
  wordCount: number;       // absolute word count when triggered
  firedAt: string;         // ISO timestamp
}

export interface NarrativeState {
  beats: NarrativeBeat[];
  totalWords: number;
  currentActPercent: number; // 0–100
  pendingBeat: NarrativeBeat | null; // beat waiting to be shown
}
