import { useState, useEffect, useCallback } from 'react';

export interface AccessibilitySettings {
  // Text & Reading
  textScale: number;           // 0.8 – 2.0 multiplier
  lineSpacing: number;         // 1.4 – 3.0
  letterSpacing: number;       // 0 – 5 (px)
  wordSpacing: number;         // 0 – 10 (px)
  dyslexiaFont: boolean;       // swap to OpenDyslexic
  paragraphSpacing: number;    // 0 – 3 (em)

  // Visual
  highContrast: boolean;
  reducedMotion: boolean;
  largerCursor: boolean;
  focusHighlight: boolean;     // enhanced focus indicators

  // Colour Filters
  colorFilter: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'grayscale';

  // Reading Aid
  readingGuide: boolean;       // horizontal line that follows cursor
  readingGuideOpacity: number; // 0.1 – 0.6

  // Voice
  voiceInputEnabled: boolean;
  ttsEnabled: boolean;
  ttsRate: number;             // 0.5 – 2.0
  ttsVoiceIdx: number;         // browser voice index

  // Screen Reader
  screenReaderHints: boolean;  // extra ARIA live regions
}

const DEFAULTS: AccessibilitySettings = {
  textScale: 1,
  lineSpacing: 1.6,
  letterSpacing: 0,
  wordSpacing: 0,
  dyslexiaFont: false,
  paragraphSpacing: 0.5,
  highContrast: false,
  reducedMotion: false,
  largerCursor: false,
  focusHighlight: false,
  colorFilter: 'none',
  readingGuide: false,
  readingGuideOpacity: 0.25,
  voiceInputEnabled: false,
  ttsEnabled: false,
  ttsRate: 1,
  ttsVoiceIdx: 0,
  screenReaderHints: false,
};

const STORAGE_KEY = 'pw-accessibility';

function load(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(load);

  // Persist on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply global CSS custom properties & classes
  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty('--a11y-text-scale', String(settings.textScale));
    root.style.setProperty('--a11y-line-spacing', String(settings.lineSpacing));
    root.style.setProperty('--a11y-letter-spacing', `${settings.letterSpacing}px`);
    root.style.setProperty('--a11y-word-spacing', `${settings.wordSpacing}px`);
    root.style.setProperty('--a11y-paragraph-spacing', `${settings.paragraphSpacing}em`);

    root.classList.toggle('a11y-high-contrast', settings.highContrast);
    root.classList.toggle('a11y-reduced-motion', settings.reducedMotion);
    root.classList.toggle('a11y-larger-cursor', settings.largerCursor);
    root.classList.toggle('a11y-focus-highlight', settings.focusHighlight);
    root.classList.toggle('a11y-dyslexia-font', settings.dyslexiaFont);
    root.classList.toggle('a11y-reading-guide', settings.readingGuide);

    // Color filter
    const filters: Record<string, string> = {
      none: 'none',
      protanopia: 'url(#a11y-protanopia)',
      deuteranopia: 'url(#a11y-deuteranopia)',
      tritanopia: 'url(#a11y-tritanopia)',
      grayscale: 'grayscale(100%)',
    };
    root.style.setProperty('--a11y-color-filter', filters[settings.colorFilter] || 'none');

    return () => {
      root.classList.remove(
        'a11y-high-contrast', 'a11y-reduced-motion', 'a11y-larger-cursor',
        'a11y-focus-highlight', 'a11y-dyslexia-font', 'a11y-reading-guide',
      );
    };
  }, [settings]);

  const update = useCallback(<K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...DEFAULTS });
  }, []);

  return { settings, update, reset };
}
