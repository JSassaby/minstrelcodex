

# D-Note: Raspberry Pi Prototype Software

A full-screen, keyboard-only writing application with a retro terminal aesthetic (green/amber on black). Designed to run in kiosk mode on a Raspberry Pi — no mouse, no distractions, just writing.

---

## 1. Boot & Setup Wizard
When the app first loads, the user goes through an initial setup flow — all keyboard-navigable:
- **Welcome screen** — "D-Note" branding with retro boot-up animation (text appearing line by line)
- **Language selection** — Arrow keys to pick, Enter to confirm
- **Wi-Fi setup** — Show available networks, enter password via keyboard
- **Account creation** (optional) — Name/email for cloud sync later
- **Setup complete** — Drops straight into the writing screen

The setup wizard only shows on first launch (saved to local storage).

## 2. Writing Screen
The core experience — a full-screen distraction-free text editor:
- **Terminal-style cursor** — blinking block cursor
- **Green or amber monospaced text** on a pure black background
- **Status bar** at the bottom showing: filename, word count, battery indicator (simulated), Wi-Fi status icon
- **No visible UI chrome** — just text and the status bar
- **Full keyboard input** — typing goes directly into the document

## 3. Menu System (Escape key to open)
Pressing `Escape` opens a top menu bar, navigable with arrow keys:
- **File** — New, Open, Open Recent, Save, Save As
- **Edit** — Copy, Paste, Undo, Redo, Select Font, Text Size
- **View** — Increase/Decrease text size
- **Network** — Wi-Fi toggle, Bluetooth toggle (simulated)
- **Storage** — Local, USB (simulated), cloud options (simulated placeholders)
- **Power** — Software Update, Shut Down (simulated)

All menus are keyboard-only — arrow keys to navigate, Enter to select, Escape to close.

## 4. File Management
- **New File** — Clears editor, prompts for filename
- **Save / Save As** — Saves to browser local storage
- **Open** — Shows list of saved files, pick with arrow keys
- **Open Recent** — Quick access to last 5 files

## 5. Visual Design
- **Font**: Monospaced (Courier-style or a retro terminal font)
- **Colors**: Green (#33ff33) or amber (#ffb000) text on black (#000000)
- **Animations**: Subtle CRT-style effects — slight text glow, scanline overlay (optional), boot-up text cascade
- **No rounded corners, no shadows** — everything is flat, grid-aligned, terminal-authentic

## 6. Keyboard Controls Reference
- `Escape` — Open/close menu
- `Arrow keys` — Navigate menus and setup wizard
- `Enter` — Confirm selection
- `Ctrl+S` — Quick save
- `Ctrl+N` — New file
- `Ctrl+Z/R` — Undo/Redo
- All standard typing goes to the editor

---

**The result**: A fully functional prototype you can demo in a browser today, and deploy to a Raspberry Pi in kiosk mode tomorrow. Plug in a mechanical keyboard, full-screen it, and you have D-Note.

