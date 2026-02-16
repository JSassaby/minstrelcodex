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
    description: 'Classic green-on-black CRT',
    icon: '▶',
    colors: {
      text: '#33ff33',
      background: '#000000',
      glow: 'rgba(51, 255, 51, 0.5)',
      accent: '#33ff33',
      muted: 'rgba(51, 255, 51, 0.4)',
      border: '#33ff33',
      surface: 'rgba(51, 255, 51, 0.05)',
    },
    fonts: {
      body: "'Courier Prime', 'Courier New', monospace",
      display: "'VT323', monospace",
      ui: "'VT323', monospace",
    },
    effects: { scanlines: true, crtGlow: true, textGlow: true, paperTexture: false },
    preview: { sampleText: 'The quick brown fox', bg: '#000000', fg: '#33ff33' },
  },
  modern: {
    mode: 'modern',
    label: 'Modern',
    description: 'Clean, minimal, distraction-free',
    icon: '◆',
    colors: {
      text: '#1a1a2e',
      background: '#fafafa',
      glow: 'transparent',
      accent: '#6366f1',
      muted: 'rgba(0, 0, 0, 0.4)',
      border: '#e2e2e2',
      surface: '#ffffff',
    },
    fonts: {
      body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "'Inter', sans-serif",
      ui: "'Inter', sans-serif",
    },
    effects: { scanlines: false, crtGlow: false, textGlow: false, paperTexture: false },
    preview: { sampleText: 'The quick brown fox', bg: '#fafafa', fg: '#1a1a2e' },
  },
  typewriter: {
    mode: 'typewriter',
    label: 'Typewriter',
    description: 'Warm sepia, old-world charm',
    icon: '✦',
    colors: {
      text: '#3b2f2f',
      background: '#f5f0e8',
      glow: 'transparent',
      accent: '#8b6914',
      muted: 'rgba(59, 47, 47, 0.4)',
      border: '#c4b49a',
      surface: '#faf6ee',
    },
    fonts: {
      body: "'Lora', 'Georgia', 'Times New Roman', serif",
      display: "'Lora', serif",
      ui: "'Courier Prime', 'Courier New', monospace",
    },
    effects: { scanlines: false, crtGlow: false, textGlow: false, paperTexture: true },
    preview: { sampleText: 'The quick brown fox', bg: '#f5f0e8', fg: '#3b2f2f' },
  },
};

const THEME_KEY = 'pw-theme-mode';
const THEME_CHOSEN_KEY = 'pw-theme-chosen';

export function getSavedTheme(): ThemeMode {
  return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'terminal';
}

export function saveTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
  localStorage.setItem(THEME_CHOSEN_KEY, 'true');
}

export function hasChosenTheme(): boolean {
  return localStorage.getItem(THEME_CHOSEN_KEY) === 'true';
}

export function applyTheme(theme: ThemeDefinition) {
  const root = document.documentElement;
  const body = document.body;

  // Set CSS variables
  root.style.setProperty('--terminal-text', theme.colors.text);
  root.style.setProperty('--terminal-bg', theme.colors.background);
  root.style.setProperty('--terminal-glow', theme.colors.glow);
  root.style.setProperty('--terminal-accent', theme.colors.accent);
  root.style.setProperty('--terminal-muted', theme.colors.muted);
  root.style.setProperty('--terminal-border', theme.colors.border);
  root.style.setProperty('--terminal-surface', theme.colors.surface);
  root.style.setProperty('--font-body', theme.fonts.body);
  root.style.setProperty('--font-display', theme.fonts.display);
  root.style.setProperty('--font-ui', theme.fonts.ui);

  // Remove all theme classes
  body.classList.remove('theme-terminal', 'theme-modern', 'theme-typewriter');
  body.classList.add(`theme-${theme.mode}`);
}
