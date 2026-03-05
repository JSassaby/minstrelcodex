import { useState, useCallback, useEffect } from 'react';
import { ThemeMode, THEMES, getSavedTheme, saveTheme, applyTheme, hasChosenTheme } from '@/lib/themes';
import type { AppColors } from '@minstrelcodex/core';

const COLORS_KEY = 'pw-colors';

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 51, g: 255, b: 51 };
}

export function useAppTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getSavedTheme);
  const [themeChosen, setThemeChosen] = useState(hasChosenTheme);
  const [colors, setColors] = useState<AppColors>(() => {
    // For terminal mode, check for saved custom colors
    const saved = localStorage.getItem(COLORS_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    const theme = THEMES[getSavedTheme()];
    return { text: theme.colors.text, background: theme.colors.background };
  });
  const [fontSize, setFontSize] = useState(18);

  // Apply theme on mount and when mode changes
  useEffect(() => {
    const theme = THEMES[themeMode] ?? THEMES.terminal;
    applyTheme(theme);
    // If custom colors are set for terminal mode, override
    if (themeMode === 'terminal') {
      const saved = localStorage.getItem(COLORS_KEY);
      if (saved) {
        try {
          const c = JSON.parse(saved);
          document.documentElement.style.setProperty('--terminal-text', c.text);
          document.documentElement.style.setProperty('--terminal-bg', c.background);
          const rgb = hexToRgb(c.text);
          document.documentElement.style.setProperty('--terminal-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
        } catch {}
      }
    }
  }, [themeMode]);

  const switchTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    saveTheme(mode);
    setThemeChosen(true);
    const theme = THEMES[mode];
    setColors({ text: theme.colors.text, background: theme.colors.background });
    // Clear custom colors when switching away from terminal
    if (mode !== 'terminal') {
      localStorage.removeItem(COLORS_KEY);
    }
  }, []);

  const markThemeChosen = useCallback(() => {
    setThemeChosen(true);
    saveTheme(themeMode);
  }, [themeMode]);

  const updateColors = useCallback((c: AppColors) => {
    setColors(c);
    document.documentElement.style.setProperty('--terminal-text', c.text);
    document.documentElement.style.setProperty('--terminal-bg', c.background);
    const rgb = hexToRgb(c.text);
    document.documentElement.style.setProperty('--terminal-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
    localStorage.setItem(COLORS_KEY, JSON.stringify(c));
  }, []);

  const resetColors = useCallback(() => {
    const theme = THEMES[themeMode];
    const defaults = { text: theme.colors.text, background: theme.colors.background };
    updateColors(defaults);
    localStorage.removeItem(COLORS_KEY);
  }, [themeMode, updateColors]);

  const changeFontSize = useCallback((delta: number) => {
    setFontSize(prev => Math.max(12, Math.min(32, prev + delta)));
  }, []);

  return {
    themeMode,
    themeChosen,
    colors,
    fontSize,
    switchTheme,
    markThemeChosen,
    updateColors,
    resetColors,
    changeFontSize,
    currentTheme: THEMES[themeMode],
  };
}
