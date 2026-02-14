import { useState, useCallback, useEffect } from 'react';
import type { AppColors } from '@/lib/types';

const COLORS_KEY = 'pw-colors';

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 51, g: 255, b: 51 };
}

export function useTerminalTheme() {
  const [colors, setColors] = useState<AppColors>({ text: '#33ff33', background: '#000000' });
  const [fontSize, setFontSize] = useState(18);

  const applyColors = useCallback((c: AppColors) => {
    document.documentElement.style.setProperty('--terminal-text', c.text);
    document.documentElement.style.setProperty('--terminal-bg', c.background);
    const rgb = hexToRgb(c.text);
    document.documentElement.style.setProperty('--terminal-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
  }, []);

  useEffect(() => {
    // Always start with default green terminal
    applyColors(colors);
  }, []);

  const updateColors = useCallback((c: AppColors) => {
    setColors(c);
    applyColors(c);
    localStorage.setItem(COLORS_KEY, JSON.stringify(c));
  }, [applyColors]);

  const resetColors = useCallback(() => {
    const defaults = { text: '#33ff33', background: '#000000' };
    updateColors(defaults);
  }, [updateColors]);

  const changeFontSize = useCallback((delta: number) => {
    setFontSize(prev => Math.max(12, Math.min(32, prev + delta)));
  }, []);

  return { colors, fontSize, updateColors, resetColors, changeFontSize };
}
