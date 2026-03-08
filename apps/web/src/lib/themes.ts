export type ThemeMode = 'terminal' | 'modern' | 'typewriter';

export interface ThemeDefinition {
  mode: ThemeMode;
  label: string;
  description: string;
  icon: string;
  colors: {
    text: string;
    background: string;
    glow: string;
    accent: string;
    muted: string;
    border: string;
    surface: string;
    menuBg: string;
  };
  fonts: {
    body: string;
    display: string;
    ui: string;
  };
  effects: {
    scanlines: boolean;
    crtGlow: boolean;
    textGlow: boolean;
    paperTexture: boolean;
  };
  preview: {
    sampleText: string;
    bg: string;
    fg: string;
  };
}

export const THEMES: Record<ThemeMode, ThemeDefinition> = {
  terminal: {
    mode: 'terminal',
    label: 'Terminal',
    description: 'Focused. Dark. Precise.',
    icon: '▶',
    colors: {
      text: '#00dfa0',
      background: '#0a0f14',
      glow: 'rgba(0, 223, 160, 0.12)',
      accent: '#00dfa0',
      muted: 'rgba(0, 223, 160, 0.4)',
      border: 'rgba(0, 223, 160, 0.18)',
      surface: 'rgba(0, 223, 160, 0.06)',
      menuBg: '#0d1219',
    },
    fonts: {
      body: "'JetBrains Mono', 'Courier Prime', 'Courier New', monospace",
      display: "'Space Grotesk', sans-serif",
      ui: "'Space Grotesk', sans-serif",
    },
    effects: { scanlines: true, crtGlow: true, textGlow: true, paperTexture: false },
    preview: { sampleText: 'The quick brown fox', bg: '#0a0f14', fg: '#00dfa0' },
  },
  modern: {
    mode: 'modern',
    label: 'Bioluminescent',
    description: 'Deep. Organic. Immersive.',
    icon: '◆',
    colors: {
      text: '#e0eaf0',
      background: '#060b18',
      glow: 'rgba(0, 212, 200, 0.12)',
      accent: '#00d4c8',
      muted: 'rgba(224, 234, 240, 0.35)',
      border: 'rgba(0, 212, 200, 0.15)',
      surface: 'rgba(0, 212, 200, 0.06)',
      menuBg: '#0a1228',
    },
    fonts: {
      body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "'Space Grotesk', sans-serif",
      ui: "'Space Grotesk', sans-serif",
    },
    effects: { scanlines: false, crtGlow: false, textGlow: true, paperTexture: false },
    preview: { sampleText: 'The quick brown fox', bg: '#060b18', fg: '#e0eaf0' },
  },
  typewriter: {
    mode: 'typewriter',
    label: 'Typewriter',
    description: 'Warm. Tactile. Timeless.',
    icon: '✦',
    colors: {
      text: '#d4c4a8',
      background: '#12100c',
      glow: 'rgba(184, 140, 60, 0.08)',
      accent: '#c8943a',
      muted: 'rgba(212, 196, 168, 0.35)',
      border: 'rgba(200, 148, 58, 0.18)',
      surface: 'rgba(200, 148, 58, 0.06)',
      menuBg: '#16130e',
    },
    fonts: {
      body: "'Lora', 'Georgia', 'Times New Roman', serif",
      display: "'Space Grotesk', sans-serif",
      ui: "'Space Grotesk', sans-serif",
    },
    effects: { scanlines: false, crtGlow: false, textGlow: false, paperTexture: true },
    preview: { sampleText: 'The quick brown fox', bg: '#12100c', fg: '#d4c4a8' },
  },
};
const THEME_KEY = 'pw-theme-mode';
const THEME_CHOSEN_KEY = 'pw-theme-chosen';
const DEFAULT_THEME: ThemeMode = 'terminal';

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'terminal' || value === 'modern' || value === 'typewriter';
}

export function getSavedTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  if (isThemeMode(saved)) return saved;

  // Self-heal stale/invalid values from older versions to avoid blank screens
  localStorage.setItem(THEME_KEY, DEFAULT_THEME);
  return DEFAULT_THEME;
}

export function saveTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
  localStorage.setItem(THEME_CHOSEN_KEY, 'true');
}

export function hasChosenTheme(): boolean {
  return localStorage.getItem(THEME_CHOSEN_KEY) === 'true';
}

export function applyTheme(theme?: ThemeDefinition) {
  const resolvedTheme = theme ?? THEMES[DEFAULT_THEME];
  const root = document.documentElement;
  const body = document.body;

  // Set CSS variables
  root.style.setProperty('--terminal-text', resolvedTheme.colors.text);
  root.style.setProperty('--terminal-bg', resolvedTheme.colors.background);
  root.style.setProperty('--terminal-glow', resolvedTheme.colors.glow);
  root.style.setProperty('--terminal-accent', resolvedTheme.colors.accent);
  root.style.setProperty('--terminal-muted', resolvedTheme.colors.muted);
  root.style.setProperty('--terminal-border', resolvedTheme.colors.border);
  root.style.setProperty('--terminal-surface', resolvedTheme.colors.surface);
  root.style.setProperty('--menu-bg', resolvedTheme.colors.menuBg);
  root.style.setProperty('--font-body', resolvedTheme.fonts.body);
  root.style.setProperty('--font-display', resolvedTheme.fonts.display);
  root.style.setProperty('--font-ui', resolvedTheme.fonts.ui);

  // Remove all theme classes
  body.classList.remove('theme-terminal', 'theme-modern', 'theme-typewriter');
  body.classList.add(`theme-${resolvedTheme.mode}`);
}
