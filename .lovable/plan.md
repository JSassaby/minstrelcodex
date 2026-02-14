

# D-Note: React Rebuild Plan

Rebuilding the existing single-file HTML D-Note application as a React app with full keyboard navigation, fixing known bugs (M key file moving, [object Object] file loading), and maintaining the retro terminal aesthetic.

---

## What You'll Get

- The same D-Note experience -- boot sequence, writing screen, menu system, file sidebar, typing challenge, color customization, and live stats
- Every single interaction works from the keyboard -- no mouse required
- Known bugs fixed (file moving with M key, file loading showing [object Object])
- Cleaner, maintainable code split into focused components

---

## Features (matching your existing app)

1. **Boot sequence** -- animated text lines, press any key to continue
2. **Writing screen** -- full-screen textarea, monospaced font, CRT scanline overlay, blinking cursor
3. **Menu system** (ESC to open) -- File, Edit, View, Network, Storage, Power, Language -- arrow keys to navigate, Enter to select
4. **File sidebar** (Ctrl+B) -- folder tree, create folders, move files between folders with M key
5. **Modals** -- Save, Open, Recent, New Folder, Move to Folder, Color Customization, Typing Challenge
6. **Color customization** -- 10 text presets, 10 background presets, 12 WCAG-compliant combo presets, hex input
7. **Typing challenge** -- 3 difficulty levels, WPM/accuracy tracking, best scores saved
8. **Live stats overlay** (Ctrl+Shift+S) -- real-time WPM and character count
9. **Multi-language** -- English UK, English US, Afrikaans
10. **Status bar** -- filename, word count, character count, Wi-Fi icon, simulated battery

---

## Keyboard Navigation (Core Principle)

All shortcuts are shown in context -- in menu items, help text, and modal hints. Minimal shortcuts to memorize:

- **ESC** -- Open/close menu (shown in help text on screen)
- **Arrow keys + Enter** -- Navigate and select everywhere
- **Ctrl+S** -- Save (shown in File menu)
- **Ctrl+N** -- New file (shown in File menu)
- **Ctrl+B** -- Toggle sidebar (shown in View menu)
- **Ctrl+Shift+S** -- Toggle live stats (shown in Edit menu)
- **M** -- Move file when in sidebar (shown in sidebar hint)
- **Tab** -- Cycle through modal sections
- **PageUp/PageDown** -- Scroll modals

---

## Bug Fixes Included

1. **M key file moving** -- The tree-item query selector targets the wrapper div, but the move button is on the inner header div. Will fix by directly tracking file metadata (name, path) on each tree item via data attributes, so M key triggers the move modal without needing to find a nested button.

2. **File loading [object Object]** -- Will normalize document storage so content is always stored and retrieved as a string, handling both legacy (string) and new (object with content property) formats.

---

## Technical Architecture

### Component Structure

```text
src/
  App.tsx                    -- Routes (just "/" to DNote)
  index.css                  -- CRT effects, terminal theme CSS variables
  pages/
    DNote.tsx                -- Main orchestrator, keyboard event handler
  components/dnote/
    BootScreen.tsx           -- Boot animation sequence
    Editor.tsx               -- Full-screen textarea
    MenuBar.tsx              -- ESC-triggered top menu with submenus
    StatusBar.tsx             -- Bottom bar (filename, words, battery, wifi)
    FileSidebar.tsx           -- Right-side file tree panel
    FileTree.tsx              -- Recursive folder/file renderer
    HelpText.tsx              -- Contextual keyboard hints
    LiveStats.tsx             -- Floating WPM overlay
    modals/
      SaveModal.tsx
      OpenModal.tsx
      RecentModal.tsx
      NewDocModal.tsx
      NewFolderModal.tsx
      MoveToFolderModal.tsx
      ColorPickerModal.tsx
      TypingChallengeModal.tsx
  hooks/
    useKeyboardNavigation.ts -- Central keyboard handler with priority: sidebar > modal > menu > global > editor
    useDocumentStorage.ts    -- localStorage CRUD for documents
    useFileStructure.ts      -- localStorage CRUD for folder tree
    useTerminalTheme.ts      -- Color management, CSS variable updates
  lib/
    languages.ts             -- Translation strings (en-GB, en-US, af)
    typingPassages.ts        -- Challenge text passages by difficulty
    types.ts                 -- TypeScript interfaces
```

### State Management

All state managed via React hooks (useState/useReducer) -- no external state library needed:

- **App state** -- current document, menu/modal/sidebar open states, focus indices
- **Document storage** -- localStorage via custom hook
- **File structure** -- localStorage via custom hook
- **Theme** -- CSS variables updated via custom hook

### Keyboard Handler Priority

One central keydown listener with this priority chain (matching the original):

```text
1. Sidebar open? -> handle sidebar keys (arrows, Enter, M, Escape)
2. Modal open?   -> handle modal keys (arrows, Enter, Tab, Escape, PageUp/Down)
3. Menu open?    -> handle menu keys (arrows, Enter, Escape)
4. Global shortcuts (Escape->open menu, Ctrl+S, Ctrl+N, Ctrl+B, Ctrl+Shift+S)
5. Pass through to editor textarea
```

### Fonts

Import Google Fonts (Courier Prime + VT323) via CSS -- same as the original.

---

## Implementation Order

1. **Theme and CSS** -- Set up CSS variables, CRT scanline/glow effects, terminal font imports, global styles
2. **Types and translations** -- TypeScript interfaces, language strings, typing passages
3. **Storage hooks** -- useDocumentStorage, useFileStructure, useTerminalTheme
4. **Boot screen** -- Animated boot sequence with "press any key" listener
5. **Editor + Status bar** -- Core writing area with word/char count, filename display, battery/wifi
6. **Menu system** -- ESC-triggered menu bar with keyboard-navigable submenus
7. **Keyboard handler** -- Central useKeyboardNavigation hook wiring everything together
8. **File sidebar** -- Sidebar panel with file tree, folder creation, file moving (M key fixed)
9. **Modals** -- Save, Open, Recent, New Doc, New Folder, Move to Folder
10. **Color picker modal** -- Hex input, preset swatches, combo grid with Tab/arrow navigation
11. **Typing challenge** -- Difficulty selection, live WPM/accuracy, results screen
12. **Live stats overlay** -- Floating panel with real-time typing metrics
13. **Help text** -- Contextual hints that fade after 5 seconds

