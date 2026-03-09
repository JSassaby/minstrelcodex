# Minstrel Codex — Design System

## 1. Philosophy

Minstrel Codex is a writing tool styled as a lore-keeper's codex: dark, precise,
and deliberate. The aesthetic draws from terminal interfaces and illuminated
manuscripts — sharp right angles, high-contrast teal on near-black, and gold
reserved for achievement and renown. Every visual decision reinforces the
atmosphere of craft: this is a serious instrument for writers, not a lifestyle app.

---

## 2. Core Rules

1. **No border-radius on UI chrome** — panels, cards, buttons, inputs, modals,
   dropdowns, and badges all use `border-radius: 0`. The only permitted exceptions
   are toggle switches (`9999px` pill), circular avatars (`50%`), and colour
   picker dot swatches (`50%`).

2. **No box shadows** — elevation is expressed through 1px borders and background
   tone differences, never `box-shadow`. Set all panel/card/modal/dropdown shadows
   to `none`.

3. **All panels use a 1px solid border** — use `var(--terminal-border)` for
   standard borders, `var(--terminal-accent)` for active/selected states.

4. **Dark backgrounds only for UI chrome** — primary background `#0a0f14`,
   panel background `#0d1219`, menu/dropdown background `#080e1e`. Never use
   light backgrounds for any structural element.

5. **Stat values use Georgia serif, gold, 22px, centred** — any large numeric
   display (word counts, XP, streaks) must use `font-family: Georgia, serif`,
   `color: #c8a84b`, `font-size: 22px`, `font-weight: 700`, `line-height: 1`.

6. **Section headers are uppercase, teal, letter-spaced** — use
   `text-transform: uppercase`, `letter-spacing: 0.12em`, `font-size: 10px`,
   `color: var(--terminal-accent)` for all section divider labels.

7. **Buttons are flat, bordered, sharp, no shadow** — background is transparent
   or a very faint tint of teal, border is `1px solid var(--terminal-border)`
   (or accent when primary). No gradient fills, no glow, no radius.

8. **Never touch the editor canvas** — do not apply any of these rules to
   `.ProseMirror`, `.tiptap`, or any of their children. The editor is a
   separate rendering context.

9. **Import tokens, never hardcode** — all visual values must come from
   `DESIGN_TOKENS` in `@minstrelcodex/core`. See §7 for details.

---

## 3. Colour Palette

| Name            | Value                          | Usage                                        |
|-----------------|--------------------------------|----------------------------------------------|
| Background      | `#0a0f14`                      | Main app background (`--terminal-bg`)        |
| Panel           | `#0d1219`                      | Sidebars, settings panel (`--menu-bg`)       |
| Menu            | `#080e1e`                      | Dropdown / floating menus                    |
| Teal Accent     | `#00dfa0`                      | Primary UI accent (`--terminal-accent`)      |
| Teal Border     | `rgba(0, 223, 160, 0.18)`      | Standard 1px borders (`--terminal-border`)   |
| Teal Surface    | `rgba(0, 223, 160, 0.06)`      | Card backgrounds (`--terminal-surface`)      |
| Teal Muted      | `rgba(0, 223, 160, 0.40)`      | Secondary/subdued text (`--terminal-muted`)  |
| Teal Glow       | `rgba(0, 223, 160, 0.12)`      | Glow effects (`--terminal-glow`)             |
| Gold            | `#c8a84b`                      | Stat values, renown, milestones              |
| Danger          | `#e05c5c`                      | Errors, destructive actions                  |
| Text Primary    | `#00dfa0`                      | Main readable text (`--terminal-text`)       |

---

## 4. Typography

| Role           | Font Family                     | Size   | Weight | Colour               |
|----------------|---------------------------------|--------|--------|----------------------|
| Stat Value     | Georgia, serif                  | 22px   | 700    | `#c8a84b` (gold)     |
| Stat Label     | Space Grotesk (`--font-ui`)     | 10px   | 500    | text at 50% opacity  |
| Section Header | Space Grotesk (`--font-ui`)     | 10px   | 600    | `--terminal-accent`  |
| Body           | JetBrains Mono (`--font-body`)  | 13px   | 400    | `--terminal-text`    |
| UI             | Space Grotesk (`--font-ui`)     | 12px   | 400    | `--terminal-text`    |
| Mono Utility   | JetBrains Mono                  | 12px   | 400    | `--terminal-text`    |

All section headers use `letter-spacing: 0.12em` and `text-transform: uppercase`.

---

## 5. Component Patterns

### Stat Card

```tsx
import { DESIGN_TOKENS as DT } from '@minstrelcodex/core';

<div style={{
  border: DT.BORDERS.default,
  padding: DT.SPACING.cardPadding,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  textAlign: 'center',
}}>
  <div style={{ ...DT.TYPOGRAPHY.statLabel }}>WORD COUNT</div>
  <div style={{ ...DT.TYPOGRAPHY.statValue }}>12,450</div>
  <div style={{ fontSize: '10px', opacity: 0.4, fontFamily: DT.TYPOGRAPHY.ui.fontFamily }}>
    of 80,000 target
  </div>
</div>
```

### Section Header

```tsx
<div style={{
  ...DT.TYPOGRAPHY.sectionHeader,
  borderTop: DT.BORDERS.default,
  paddingTop: '8px',
  marginBottom: '8px',
}}>
  WRITING PACE
</div>
```

### Button (default)

```tsx
<button style={{
  padding: DT.SPACING.buttonPadding,
  border: DT.BORDERS.default,
  borderRadius: DT.BORDER_RADIUS.button,  // 0
  background: DT.COLORS.background.card,
  color: 'var(--terminal-text)',
  fontFamily: DT.TYPOGRAPHY.ui.fontFamily,
  fontSize: DT.TYPOGRAPHY.ui.fontSize,
  cursor: 'pointer',
  boxShadow: DT.SHADOWS.card,            // 'none'
  transition: DT.TRANSITIONS.default,
}}>
  Label
</button>
```

### Panel

```tsx
<div style={{
  background: DT.COLORS.background.panel,
  border: DT.BORDERS.default,
  borderRadius: DT.BORDER_RADIUS.panel,  // 0
  padding: DT.SPACING.panelPadding,
}}>
  {children}
</div>
```

### Modal

```tsx
<div style={{
  background: DT.COLORS.background.panel,
  border: DT.BORDERS.active,
  borderRadius: DT.BORDER_RADIUS.modal,  // 0
  boxShadow: DT.SHADOWS.modal,           // 'none'
}}>
  {children}
</div>
```

### Dropdown Row

```tsx
<div style={{
  padding: '9px 12px',
  borderRadius: DT.BORDER_RADIUS.dropdown,  // 0
  background: isActive ? DT.COLORS.background.cardHover : 'transparent',
  color: isActive ? 'var(--terminal-accent)' : 'var(--terminal-text)',
  cursor: 'pointer',
  transition: DT.TRANSITIONS.fast,
}}>
  {label}
</div>
```

---

## 6. What Not To Do

- **No rounded corners on UI chrome** — do not add `borderRadius` to panels,
  cards, buttons, inputs, modals, badges, or dropdown items. The only exceptions
  are toggle pills, avatars, and colour swatches (see §2, Rule 1).

- **No shadows on panels or modals** — do not use `box-shadow` to imply depth.
  Use background colour and borders instead.

- **No gradient backgrounds** — do not use `linear-gradient` or
  `radial-gradient` for UI chrome backgrounds. Flat colours only. (Theme-level
  ambient effects in `index.css` are managed separately.)

- **No sans-serif for stat values** — numeric statistics must use
  `Georgia, serif`. Using `Space Grotesk` or system sans-serif for large numbers
  breaks the design language.

- **Do not apply design rules to the editor canvas** — `.ProseMirror` and
  `.tiptap` and all their children are excluded from the global border-radius
  enforcement rule in `index.css`. Do not add styles to these selectors.

- **Do not hardcode colour values** — never write `#00dfa0`, `#c8a84b`,
  `rgba(0, 223, 160, ...)`, etc. directly in a component. Import from
  `DESIGN_TOKENS` and reference the token.

- **Do not invent new spacing values** — use the spacing tokens in
  `DESIGN_TOKENS.SPACING`. If a new value is genuinely needed, add it to the
  token file first and document its usage.

---

## 7. How To Use `tokens.ts`

All new components must import visual values from the `DESIGN_TOKENS` export in
`@minstrelcodex/core` rather than hardcoding them. This ensures that any future
visual change (e.g. adjusting gold to `#d4a843` or tightening panel padding) can
be made in one place and propagates everywhere automatically. Import the object,
destructure the categories you need, and reference the values directly in inline
styles or passed to styled utilities. For example:

```tsx
import { DESIGN_TOKENS as DT } from '@minstrelcodex/core';

// Then in your component:
<div style={{ border: DT.BORDERS.default, padding: DT.SPACING.cardPadding }}>
```

Never copy-paste raw hex values or pixel strings from another component —
that defeats the purpose of the token system and will diverge over time.
