/** Font management – built-in list + user-added Google Fonts */

export interface FontOption {
  label: string;
  value: string;
  category: 'mono' | 'serif' | 'sans' | 'display';
  builtIn: boolean;
}

// ── Curated built-in fonts ────────────────────────────────────────
export const BUILT_IN_FONTS: FontOption[] = [
  // Monospace
  { label: 'Courier Prime', value: "'Courier Prime', 'Courier New', monospace", category: 'mono', builtIn: true },
  { label: 'Courier New', value: "'Courier New', monospace", category: 'mono', builtIn: true },
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace", category: 'mono', builtIn: true },
  { label: 'Fira Code', value: "'Fira Code', monospace", category: 'mono', builtIn: true },
  { label: 'Source Code Pro', value: "'Source Code Pro', monospace", category: 'mono', builtIn: true },
  { label: 'IBM Plex Mono', value: "'IBM Plex Mono', monospace", category: 'mono', builtIn: true },
  { label: 'Roboto Mono', value: "'Roboto Mono', monospace", category: 'mono', builtIn: true },
  { label: 'VT323', value: "'VT323', monospace", category: 'mono', builtIn: true },
  { label: 'Space Mono', value: "'Space Mono', monospace", category: 'mono', builtIn: true },
  // Serif
  { label: 'Lora', value: "'Lora', Georgia, serif", category: 'serif', builtIn: true },
  { label: 'Merriweather', value: "'Merriweather', Georgia, serif", category: 'serif', builtIn: true },
  { label: 'Playfair Display', value: "'Playfair Display', Georgia, serif", category: 'serif', builtIn: true },
  { label: 'EB Garamond', value: "'EB Garamond', Garamond, serif", category: 'serif', builtIn: true },
  { label: 'Crimson Text', value: "'Crimson Text', Georgia, serif", category: 'serif', builtIn: true },
  { label: 'Libre Baskerville', value: "'Libre Baskerville', Georgia, serif", category: 'serif', builtIn: true },
  // Sans-serif
  { label: 'Inter', value: "'Inter', system-ui, sans-serif", category: 'sans', builtIn: true },
  { label: 'DM Sans', value: "'DM Sans', sans-serif", category: 'sans', builtIn: true },
  { label: 'Work Sans', value: "'Work Sans', sans-serif", category: 'sans', builtIn: true },
  { label: 'Nunito', value: "'Nunito', sans-serif", category: 'sans', builtIn: true },
  { label: 'Open Sans', value: "'Open Sans', sans-serif", category: 'sans', builtIn: true },
  // Display / fun
  { label: 'Space Grotesk', value: "'Space Grotesk', sans-serif", category: 'display', builtIn: true },
  { label: 'Syne', value: "'Syne', sans-serif", category: 'display', builtIn: true },
  { label: 'Bricolage Grotesque', value: "'Bricolage Grotesque', sans-serif", category: 'display', builtIn: true },
];

const CUSTOM_FONTS_KEY = 'pw-custom-fonts';
const loadedFonts = new Set<string>();

/** Load a Google Font stylesheet if not already loaded */
export function loadGoogleFont(fontName: string) {
  if (loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

/** Pre-load all built-in Google Fonts */
export function preloadBuiltInFonts() {
  BUILT_IN_FONTS.forEach(f => loadGoogleFont(f.label));
}

/** Get user-added custom fonts from localStorage */
export function getCustomFonts(): FontOption[] {
  try {
    const raw = localStorage.getItem(CUSTOM_FONTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save a custom Google Font */
export function addCustomFont(fontName: string): FontOption {
  const trimmed = fontName.trim();
  const option: FontOption = {
    label: trimmed,
    value: `'${trimmed}', sans-serif`,
    category: 'display',
    builtIn: false,
  };
  const existing = getCustomFonts();
  if (!existing.some(f => f.label.toLowerCase() === trimmed.toLowerCase())) {
    existing.push(option);
    localStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(existing));
  }
  loadGoogleFont(trimmed);
  return option;
}

/** Remove a custom font */
export function removeCustomFont(label: string) {
  const existing = getCustomFonts().filter(f => f.label !== label);
  localStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(existing));
}

/** Get all available fonts (built-in + custom) */
export function getAllFonts(): FontOption[] {
  const custom = getCustomFonts();
  // Load custom fonts
  custom.forEach(f => loadGoogleFont(f.label));
  return [...BUILT_IN_FONTS, ...custom];
}
