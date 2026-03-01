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
      text: '#00c896',
      background: '#0d1117',
      glow: 'rgba(0, 200, 150, 0.35)',
      accent: '#00c896',
      muted: 'rgba(0, 200, 150, 0.4)',
      border: 'rgba(0, 200, 150, 0.3)',
      surface: 'rgba(0, 200, 150, 0.06)',
    },
    fonts: {
      body: "'JetBrains Mono', 'Courier Prime', 'Courier New', monospace",
      display: "'Space Grotesk', sans-serif",
      ui: "'Space Grotesk', sans-serif",
    },
    effects: { scanlines: true, crtGlow: true, textGlow: true, paperTexture: false },
    preview: { sampleText: 'The quick brown fox', bg: '#0d1117', fg: '#00c896' },
  },
  modern: {
    mode: 'modern',
    label: 'Modern',
    description: 'Clean. Minimal. Effortless.',
    icon: '◆',
    colors: {
      text: '#1c2333',
      background: '#f8f7f4',
      glow: 'transparent',
      accent: '#4a6fa5',
      muted: 'rgba(28, 35, 51, 0.45)',
      border: '#dddbd6',
      surface: '#ffffff',
    },
    fonts: {
      body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "'Space Grotesk', sans-serif",
      ui: "'Space Grotesk', sans-serif",
    },
    effects: { scanlines: false, crtGlow: false, textGlow: false, paperTexture: false },
    preview: { sampleText: 'The quick brown fox', bg: '#f8f7f4', fg: '#1c2333' },
  },
  typewriter: {
    mode: 'typewriter',
    label: 'Typewriter',
    description: 'Warm. Tactile. Timeless.',
    icon: '✦',
    colors: {
      text: '#2c1f14',
      background: '#f2ede3',
      glow: 'transparent',
      accent: '#b8860b',
      muted: 'rgba(44, 31, 20, 0.45)',
      border: '#cec3ae',
      surface: '#faf6ee',
    },
    fonts: {
      body: "'Lora', 'Georgia', 'Times New Roman', serif",
      display: "'Space Grotesk', sans-serif",
      ui: "'Space Grotesk', sans-serif",
    },
    effects: { scanlines: false, crtGlow: false, textGlow: false, paperTexture: true },
    preview: { sampleText: 'The quick brown fox', bg: '#f2ede3', fg: '#2c1f14' },
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
  root.style.setProperty('--font-body', resolvedTheme.fonts.body);
  root.style.setProperty('--font-display', resolvedTheme.fonts.display);
  root.style.setProperty('--font-ui', resolvedTheme.fonts.ui);

  // Remove all theme classes
  body.classList.remove('theme-terminal', 'theme-modern', 'theme-typewriter');
  body.classList.add(`theme-${resolvedTheme.mode}`);
}
