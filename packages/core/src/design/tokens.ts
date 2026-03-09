/**
 * Minstrel Codex Design Tokens
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for every visual value in the design system.
 *
 * ALL new components must import from DESIGN_TOKENS — never hardcode colours,
 * spacing, typography, or border values directly. This keeps the visual
 * language coherent and maintainable across the entire codebase.
 *
 * CSS custom properties (--terminal-*) are resolved at runtime per theme.
 * The resolved values documented here reflect the default Terminal theme.
 */

export const DESIGN_TOKENS = {

  // ── Border Radius ───────────────────────────────────────────────────────
  // The Minstrel Codex design system uses sharp right angles everywhere.
  // All UI chrome — panels, cards, buttons, inputs, modals — uses 0 radius.
  // The three exceptions below must never be applied to structural elements.
  BORDER_RADIUS: {
    panel:       0,
    card:        0,
    button:      0,
    input:       0,
    dropdown:    0,
    modal:       0,
    badge:       0,
    // Intentional exceptions only — do not apply to any UI chrome:
    toggle:      '9999px',  // toggle switch pill shape
    avatar:      '50%',     // circular profile images only
    colorSwatch: '50%',     // colour picker dot swatches only
  },

  // ── Colors ──────────────────────────────────────────────────────────────
  COLORS: {
    background: {
      primary:   '#0a0f14',                      // main app dark background (--terminal-bg)
      panel:     '#0d1219',                      // sidebar / settings panel (--menu-bg)
      menu:      '#080e1e',                      // dropdown / floating menus
      card:      'var(--terminal-surface)',      // rgba(0, 223, 160, 0.06) — stat cards
      cardHover: 'rgba(0, 223, 160, 0.09)',      // card hover state
      input:     'rgba(0, 0, 0, 0.3)',           // input field background
    },
    border: {
      default:   'var(--terminal-border)',       // rgba(0, 223, 160, 0.18) — standard border
      active:    'var(--terminal-accent)',       // #00dfa0 — selected / active state
      subtle:    'rgba(0, 223, 160, 0.06)',      // very faint dividers
      focus:     'rgba(0, 223, 160, 0.12)',      // input focus ring
    },
    text: {
      primary:   'var(--terminal-text)',         // #00dfa0 — main terminal text
      muted:     'var(--terminal-muted)',        // rgba(0, 223, 160, 0.4) — secondary labels
      teal:      'var(--terminal-accent)',       // teal — section headers, active labels
      gold:      '#c8a84b',                      // gold — stat values, renown, milestones
      danger:    '#e05c5c',                      // red — errors, destructive actions
    },
    ui: {
      teal:      '#00dfa0',                      // resolved value of --terminal-accent
      gold:      '#c8a84b',                      // gold accent constant
      glow:      'var(--terminal-glow)',         // rgba(0, 223, 160, 0.12) — glow effect
      surface:   'var(--terminal-surface)',      // rgba(0, 223, 160, 0.06)
    },
  },

  // ── Typography ──────────────────────────────────────────────────────────
  TYPOGRAPHY: {
    // Large numeric stat values — dashboards, song complete, manuscript stats
    statValue: {
      fontFamily:    'Georgia, serif',
      fontSize:      '22px',
      fontWeight:    700,
      color:         '#c8a84b',
      lineHeight:    1,
    },
    // Small uppercase labels beneath stat values
    statLabel: {
      fontFamily:    "var(--font-ui, 'Space Grotesk', sans-serif)",
      fontSize:      '10px',
      fontWeight:    500,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      opacity:       0.5,
    },
    // Teal uppercase section dividers (e.g. "WRITING PACE", "CHRONICLES")
    sectionHeader: {
      fontFamily:    "var(--font-ui, 'Space Grotesk', sans-serif)",
      fontSize:      '10px',
      fontWeight:    600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      color:         'var(--terminal-accent)',
    },
    // General UI body copy
    body: {
      fontFamily:    "var(--font-body, 'JetBrains Mono', 'Courier Prime', monospace)",
      fontSize:      '13px',
      fontWeight:    400,
      color:         'var(--terminal-text)',
      lineHeight:    1.6,
    },
    // Non-editor UI elements (buttons, labels, menus)
    ui: {
      fontFamily:    "var(--font-ui, 'Space Grotesk', sans-serif)",
      fontSize:      '12px',
      fontWeight:    400,
      color:         'var(--terminal-text)',
    },
    // Monospace utility (file names, code, hex values)
    mono: {
      fontFamily:    "'JetBrains Mono', 'Courier Prime', 'Courier New', monospace",
      fontSize:      '12px',
    },
  },

  // ── Borders ─────────────────────────────────────────────────────────────
  // Convenience shorthand strings — always 1px, always solid, always sharp.
  BORDERS: {
    default: '1px solid var(--terminal-border)',       // standard panel / card edge
    active:  '1px solid var(--terminal-accent)',       // selected or active state
    subtle:  '1px solid rgba(0, 223, 160, 0.06)',      // faint section divider
    focus:   '1px solid rgba(0, 223, 160, 0.12)',      // input focus ring
    gold:    '1px solid #c8a84b',                      // earned achievement / milestone
  },

  // ── Spacing ─────────────────────────────────────────────────────────────
  SPACING: {
    panelPadding:  '20px 18px',  // main panel / sidebar inner padding
    cardPadding:   '12px 14px',  // stat card inner padding
    sectionGap:    '20px',       // vertical space between panel sections
    itemGap:       '8px',        // gap between list items / stacked cards
    buttonPadding: '9px 20px',   // standard button inner padding
    inputPadding:  '8px 12px',   // text input inner padding
    iconGap:       '8px',        // flex gap between icon and label
  },

  // ── Shadows ─────────────────────────────────────────────────────────────
  // The Minstrel Codex design system uses no box shadows on UI chrome.
  // Elevation is expressed through borders and background tone, not shadows.
  SHADOWS: {
    panel:    'none',
    card:     'none',
    modal:    'none',
    dropdown: 'none',
  },

  // ── Transitions ─────────────────────────────────────────────────────────
  TRANSITIONS: {
    default: 'all 0.2s ease',
    fast:    'all 0.15s ease',
    slow:    'all 0.3s ease',
  },

  // ── Z-Index ─────────────────────────────────────────────────────────────
  Z_INDEX: {
    menuBar:  200,
    dropdown: 9999,
    modal:    50000,
  },

  // ── Icon Sizes ──────────────────────────────────────────────────────────
  ICONS: {
    sm: { size: 12, strokeWidth: 1.6 },
    md: { size: 14, strokeWidth: 1.6 },
    lg: { size: 15, strokeWidth: 1.8 },
    xl: { size: 18, strokeWidth: 1.6 },
  },

} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
