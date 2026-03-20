// ── Help & Reference Content ─────────────────────────────────────────
// All help topics are structured as a tree with rich HTML page content.
// These are READ-ONLY — they cannot be edited or deleted by the user.

export interface HelpPage {
  id: string;
  title: string;
  content: string; // HTML
}

export interface HelpFolder {
  id: string;
  title: string;
  children: (HelpPage | HelpFolder)[];
}

export type HelpNode = HelpPage | HelpFolder;

export function isHelpFolder(node: HelpNode): node is HelpFolder {
  return 'children' in node;
}

// ── Content ──────────────────────────────────────────────────────────

export const HELP_TREE: HelpFolder[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    children: [
      {
        id: 'welcome',
        title: 'Welcome to Minstrel Codex',
        content: `
<h2>Welcome to Minstrel Codex</h2>
<p>Minstrel Codex is a distraction-free writing environment built for novelists, poets, journalists, and anyone who works with words. It runs entirely in your browser with local-first storage — your writing never leaves your device unless you choose to sync it.</p>

<h3>Your First Steps</h3>
<ol>
<li><strong>Start typing</strong> — Click anywhere in the editor area and begin writing. There's no signup required, no cloud dependency. Your words are yours.</li>
<li><strong>Auto-save is always on</strong> — Every 30 seconds, your work is silently saved to your device's local storage. You'll see the save indicator in the status bar.</li>
<li><strong>Explore the menu bar</strong> — The top menu (FILE, ENTERTAINMENT, SETTINGS, HELP) gives you access to every feature. Press <kbd>ESC</kbd> to open it with your keyboard.</li>
</ol>

<h3>Philosophy</h3>
<p>Minstrel Codex is designed around three principles:</p>
<ul>
<li><strong>Distraction-free</strong> — No social feeds, no notifications, no clutter. Just you and your words.</li>
<li><strong>Local-first</strong> — Your documents live on your device. Cloud sync is optional and always under your control.</li>
<li><strong>Accessible</strong> — Voice dictation, text-to-speech, dyslexia-friendly fonts, high contrast modes, and full keyboard navigation are built in from day one.</li>
</ul>

<h3>Interface Overview</h3>
<p>The interface is composed of five zones:</p>
<ul>
<li><strong>Menu Bar</strong> (top) — FILE, ENTERTAINMENT, and SETTINGS menus give access to all commands. The SETTINGS item opens the settings panel directly.</li>
<li><strong>Sidebar</strong> (left) — File browser, help, notes, and chapter overview panels live here. Only one sidebar can be open at a time.</li>
<li><strong>Editor</strong> (centre) — Your writing canvas. Supports rich text formatting, headings, and scene breaks.</li>
<li><strong>Status Bar</strong> (bottom) — Shows word count, save status, battery, Wi-Fi, and your current writing session stats.</li>
<li><strong>Editor Panel</strong> (right) — Optional AI editorial feedback panel. Opens alongside the editor when you request feedback. Enable it in Settings → Language.</li>
<li><strong>Scriptorium</strong> (launch screen) — The writer's home screen that appears on every app load, showing your stats, recent files, and system status.</li>
</ul>
`,
      },
      {
        id: 'interface-tour',
        title: 'Interface Tour',
        content: `
<h2>Interface Tour</h2>
<p>This guide walks you through every part of the Minstrel Codex interface so you know exactly where to find what you need.</p>

<h3>Menu Bar</h3>
<p>The menu bar sits at the very top of the screen. It contains these menus:</p>
<ul>
<li><strong>FILE</strong> — Create, open, save, export, import, and manage documents and novel projects. Access the file browser, version snapshots, and Google Drive sync.</li>
<li><strong>ENTERTAINMENT</strong> — Writer Dashboard (Ctrl+Shift+U), ambient music player, and Typing Challenge.</li>
<li><strong>SETTINGS</strong> — Opens the settings panel directly (no submenu).</li>
</ul>
<p>The EDIT menu no longer exists. Help is accessed via the ? icon in the nav bar.</p>

<h3>Editor Area</h3>
<p>The central editor is a rich-text writing surface powered by TipTap. It supports:</p>
<ul>
<li>Headings (H1–H3)</li>
<li>Bold, italic, and underline formatting</li>
<li>Bulleted and numbered lists</li>
<li>Horizontal rules as scene/chapter breaks</li>
<li>Inline title editing — the document title appears above your text</li>
</ul>

<h3>Status Bar</h3>
<p>The bottom bar provides at-a-glance information:</p>
<ul>
<li><strong>Word count</strong> — Total words in the current document</li>
<li><strong>Character count</strong> — Total characters</li>
<li><strong>Save indicator</strong> — Shows whether changes are saved or pending</li>
<li><strong>Filename</strong> — Current document name</li>
<li><strong>Battery & Wi-Fi</strong> — Device status indicators</li>
<li><strong>Session stats</strong> — Words written and time elapsed in your current writing session</li>
</ul>

<h3>Sidebars</h3>
<p>Sidebars are mutually exclusive — opening one closes any other. Available sidebars:</p>
<ul>
<li><strong>File Browser</strong> — Tree view of all your documents and folders</li>
<li><strong>Settings Panel</strong> — Full configuration interface</li>
<li><strong>Music Player</strong> — Ambient music controls</li>
<li><strong>Help & Reference</strong> — This panel</li>
<li><strong>Chapter Overview</strong> — Novel project chapter navigation</li>
<li><strong>Notes Panel</strong> — Character and place notes for your project</li>
</ul>
`,
      },
      {
        id: 'scriptorium',
        title: 'The Scriptorium',
        content: `
<h2>The Scriptorium</h2>
<p>The Scriptorium is your writer's home screen — it appears every time Minstrel Codex loads, after the boot sequence. It gives you an at-a-glance view of your writing life before you begin your session.</p>
<h3>Three Columns</h3>
<p><strong>System Status (left)</strong> — Shows the live status of your key settings: Google Drive connection, AI Editor, Spellcheck, and Music Player. Click "Open Settings →" to go directly to the settings panel.</p>
<p><strong>Writer Identity (centre)</strong> — Your Renown total, current Level and title, Words Written, Sessions, and Streak. A progress bar shows how far you are from the next level. A rotating motivational phrase sits below.</p>
<p><strong>Your Work (right)</strong> — Your most recent document in a "Continue Writing" card, followed by recent files with word counts. Quick Actions at the bottom let you start a New Novel or New File directly.</p>
<h3>Entering the Editor</h3>
<p>Click any file in the Recent Files list to open it directly in the editor. Click "Continue Writing" to resume your last document. Click "ENTER THE CODEX →" to go to the editor without opening a specific file. Use "New Novel" or "New File" to start fresh.</p>
<h3>Music from the Scriptorium</h3>
<p>The Music row in System Status has a Play button that starts ambient music directly from the Scriptorium — you don't need to enter the editor first.</p>
`,
      },
    ],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    children: [
      {
        id: 'essential-shortcuts',
        title: 'Essential Shortcuts',
        content: `
<h2>Essential Keyboard Shortcuts</h2>
<p>Minstrel Codex is designed for 100% keyboard navigation. These are the shortcuts you'll use most often.</p>

<h3>Document Commands</h3>
<table>
<tr><td><kbd>Ctrl + S</kbd></td><td>Save current document immediately</td></tr>
<tr><td><kbd>Ctrl + N</kbd></td><td>Create a new document</td></tr>
<tr><td><kbd>Ctrl + O</kbd></td><td>Open an existing document</td></tr>
<tr><td><kbd>Ctrl + Shift + S</kbd></td><td>Save As — save under a new filename</td></tr>
</table>

<h3>Editing</h3>
<table>
<tr><td><kbd>Ctrl + Z</kbd></td><td>Undo the last action</td></tr>
<tr><td><kbd>Ctrl + Shift + Z</kbd></td><td>Redo the last undone action</td></tr>
<tr><td><kbd>Ctrl + B</kbd></td><td>Toggle bold</td></tr>
<tr><td><kbd>Ctrl + I</kbd></td><td>Toggle italic</td></tr>
<tr><td><kbd>Ctrl + U</kbd></td><td>Toggle underline</td></tr>
</table>

<h3>Navigation</h3>
<table>
<tr><td><kbd>ESC</kbd></td><td>Open or close the menu bar</td></tr>
<tr><td><kbd>Ctrl + Shift + B</kbd></td><td>Toggle the file browser sidebar</td></tr>
<tr><td><kbd>Ctrl + Shift + U</kbd></td><td>Open the Writer Dashboard (also accessible from the ENTERTAINMENT menu)</td></tr>
<tr><td><kbd>Ctrl + Shift + C</kbd></td><td>Open Chronicle Ledger (unlocks at Level 6)</td></tr>
<tr><td><kbd>Ctrl + Shift + E</kbd></td><td>Toggle AI Editor panel</td></tr>
<tr><td><kbd>Ctrl + Shift + N</kbd></td><td>New Novel Wizard</td></tr>
<tr><td><kbd>Ctrl + Shift + G</kbd></td><td>Google Drive sync panel</td></tr>
<tr><td><kbd>F11</kbd></td><td>Toggle Focus mode — hides all interface chrome for distraction-free writing. Press <kbd>Esc</kbd> to exit.</td></tr>
<tr><td><kbd>Ctrl + P</kbd></td><td>Print current document</td></tr>
</table>
`,
      },
      {
        id: 'file-browser-shortcuts',
        title: 'File Browser Shortcuts',
        content: `
<h2>File Browser Keyboard Shortcuts</h2>
<p>When the file browser sidebar is open and focused, these additional shortcuts are available:</p>

<table>
<tr><td><kbd>N</kbd></td><td>Create a new file in the current folder</td></tr>
<tr><td><kbd>Shift + N</kbd></td><td>Create a new folder</td></tr>
<tr><td><kbd>Enter</kbd></td><td>Open the selected file or expand/collapse a folder</td></tr>
<tr><td><kbd>↑ / ↓</kbd></td><td>Navigate through files and folders</td></tr>
<tr><td><kbd>D</kbd></td><td>Permanently delete selected item (only inside the Deleted folder)</td></tr>
<tr><td><kbd>F2</kbd></td><td>Rename the selected file or folder</td></tr>
</table>

<h3>Drag and Drop</h3>
<p>Files and folders support native HTML5 drag-and-drop:</p>
<ul>
<li>Drag a file onto a folder to move it inside</li>
<li>Drag between items to reorder them within the same folder</li>
<li>The drop indicator shows exactly where the item will land</li>
</ul>
`,
      },
      {
        id: 'accessibility-shortcuts',
        title: 'Accessibility Shortcuts',
        content: `
<h2>Accessibility Shortcuts</h2>
<p>These shortcuts are available when accessibility features are enabled in Settings → Accessibility.</p>

<table>
<tr><td><kbd>Alt + Space</kbd></td><td>Start or stop voice dictation (requires Voice Input to be enabled)</td></tr>
<tr><td><kbd>Ctrl + Shift + T</kbd></td><td>Read the current document aloud using text-to-speech</td></tr>
</table>

<h3>Enabling Accessibility Features</h3>
<p>All accessibility features can be toggled individually from the Settings panel under the Accessibility tab. Each feature is designed to work independently, so you can enable exactly the combination that works for you.</p>
`,
      },
    ],
  },
  {
    id: 'file-management',
    title: 'File Management',
    children: [
      {
        id: 'file-browser-guide',
        title: 'The File Browser',
        content: `
<h2>The File Browser</h2>
<p>The file browser is a persistent sidebar (toggle with <kbd>Ctrl + Shift + B</kbd>) that shows all your documents organised in a tree structure.</p>

<h3>Structure</h3>
<p>Your files are organised in a virtual file system with folders and documents. The root level contains your top-level files and folders. Each file has a document icon; each folder has a yellow folder icon that opens and closes.</p>

<h3>Creating Files & Folders</h3>
<ul>
<li><strong>New File</strong> — Press <kbd>N</kbd> when the browser is focused, or use FILE → New Document from the menu bar. You'll be prompted for a filename.</li>
<li><strong>New Folder</strong> — Press <kbd>Shift + N</kbd> or use FILE → New Folder. Folders help organise related documents together.</li>
<li><strong>Create inside a folder</strong> — Right-click or navigate to a folder, then create. The new item will appear inside that folder.</li>
</ul>

<h3>Moving & Reordering</h3>
<p>Use drag-and-drop to reorganise your files:</p>
<ul>
<li>Drag a file or folder onto another folder to move it inside</li>
<li>Drag between items to change the order within a folder</li>
<li>The custom order is saved automatically via the <code>childOrder</code> property</li>
</ul>

<h3>Renaming</h3>
<p>Select a file or folder and press <kbd>F2</kbd> to rename it. The document content is preserved — only the display name and path change.</p>

<h3>Deleting</h3>
<p>Minstrel Codex uses a two-stage deletion process to protect your work:</p>
<ol>
<li><strong>Move to Deleted</strong> — When you delete a file or folder, it moves to the special "Deleted" folder. Its content is preserved.</li>
<li><strong>Permanent deletion</strong> — Inside the Deleted folder, press <kbd>D</kbd> to permanently remove an item. This clears both the tree node and the document content from IndexedDB.</li>
<li><strong>Empty Deleted</strong> — You can also empty the entire Deleted folder at once to reclaim space.</li>
</ol>

<h3>Word Counts</h3>
<p>Each file in the browser shows a live word count badge, so you can see at a glance how long each document is without opening it.</p>
`,
      },
      {
        id: 'novel-projects',
        title: 'Novel Projects',
        content: `
<h2>Novel Projects</h2>
<p>Novel Projects are a structured way to organise long-form writing. Instead of managing individual files, a Novel Project gives you a complete framework with chapters, notes, and version control.</p>

<h3>Creating a Novel Project</h3>
<p>Use FILE → New Novel Project from the menu bar. The wizard will guide you through:</p>
<ul>
<li><strong>Project name</strong> — The title of your novel or manuscript</li>
<li><strong>Initial chapters</strong> — How many chapter files to create</li>
<li><strong>Storage location</strong> — Where to save (local device or cloud)</li>
</ul>
<p>The wizard creates a folder structure with numbered chapter files, a notes subfolder, and metadata.</p>

<h3>Chapter Overview</h3>
<p>Once inside a Novel Project, the Chapter Overview sidebar shows all your chapters with word counts, making it easy to navigate and track progress across your entire manuscript.</p>

<h3>Notes Panel</h3>
<p>The Notes Panel provides dedicated space for character profiles, place descriptions, and other reference material. Notes are organised by type (Character or Place) and are scoped to the current project.</p>

<h3>Version Control</h3>
<p>Use FILE → Save Version to create a timestamped snapshot of all chapters in your project. This is a complete backup — you can restore to any previous version if needed.</p>
`,
      },
      {
        id: 'saving-documents',
        title: 'Saving & Snapshots',
        content: `
<h2>Saving & Snapshots</h2>

<h3>Auto-Save</h3>
<p>Minstrel Codex automatically saves your work every 30 seconds. The status bar shows the current save state — you'll see a small indicator that confirms when your document has been written to local storage.</p>
<p>Auto-save writes to IndexedDB, which is more reliable and has larger storage limits than traditional localStorage.</p>

<h3>Manual Save</h3>
<p>Press <kbd>Ctrl + S</kbd> at any time to force an immediate save. This is useful before closing the browser or switching documents.</p>

<h3>Save As</h3>
<p>Use FILE → Save As to save the current document under a new filename. This creates a copy — the original file remains untouched.</p>

<h3>Snapshots</h3>
<p>Snapshots are timestamped copies of your document or project. They let you return to a specific point in time if you need to recover earlier work.</p>
<ul>
<li><strong>Document snapshot</strong> — Press <kbd>Ctrl + Shift + V</kbd> to save a snapshot of the current document</li>
<li><strong>Project version</strong> — Use FILE → Save Version to snapshot all chapters in a Novel Project</li>
</ul>
<p>Snapshots are stored alongside your documents and can be accessed from the file browser.</p>
`,
      },
    ],
  },
  {
    id: 'export-print',
    title: 'Export & Print',
    children: [
      {
        id: 'exporting',
        title: 'Exporting Your Work',
        content: `
<h2>Exporting Your Work</h2>
<p>Minstrel Codex supports multiple export formats so you can take your writing anywhere.</p>

<h3>Export Formats</h3>
<ul>
<li><strong>PDF</strong> — Professional-quality PDF output with your chosen formatting. Ideal for submissions, printing, or archiving.</li>
<li><strong>Plain Text (.txt)</strong> — Maximum compatibility with any text editor or word processor. All formatting is stripped to pure text.</li>
<li><strong>Combined Document</strong> — For Novel Projects, you can combine all chapters into a single exported file, in order.</li>
</ul>

<h3>How to Export</h3>
<p>Use FILE → Export / Combine from the menu bar. The export modal lets you:</p>
<ol>
<li>Choose the format (PDF or plain text)</li>
<li>Select which files to include (single document or entire project)</li>
<li>Configure options like page size and margins</li>
<li>Download the result</li>
</ol>

<h3>Tips</h3>
<ul>
<li>Export regularly as a backup strategy alongside auto-save</li>
<li>Use PDF export for sharing with editors or beta readers</li>
<li>Use plain text export for importing into other tools like Scrivener or Google Docs</li>
</ul>
`,
      },
      {
        id: 'printing',
        title: 'Printing',
        content: `
<h2>Printing</h2>
<p>Press <kbd>Ctrl + P</kbd> or use FILE → Print Current Page to send your document to a printer.</p>

<h3>Print Formatting</h3>
<p>Minstrel Codex applies clean print styles that strip away the UI chrome (menu bar, sidebar, status bar) so only your text is printed. The editor's font and formatting are preserved.</p>

<h3>Tips for Good Print Output</h3>
<ul>
<li>Use headings (H1, H2, H3) to structure your document — they'll print with appropriate hierarchy</li>
<li>Scene breaks (horizontal rules) print as subtle dividers</li>
<li>Consider using a serif font (like Georgia or EB Garamond) for better print readability</li>
<li>For the best control over layout, use PDF export instead of direct printing</li>
</ul>
`,
      },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    children: [
      {
        id: 'voice-dictation',
        title: 'Voice Dictation',
        content: `
<h2>Voice Dictation</h2>
<p>Voice dictation lets you write by speaking. It uses your browser's built-in Web Speech API — no external service or internet connection required for supported browsers.</p>

<h3>Enabling Voice Dictation</h3>
<ol>
<li>Open Settings → Accessibility</li>
<li>Toggle "Voice Input" to on</li>
<li>Grant microphone permission when prompted by your browser</li>
</ol>

<h3>Using Voice Dictation</h3>
<p>Press <kbd>Alt + Space</kbd> to start or stop dictation. When active, a microphone indicator appears and your spoken words are transcribed directly into the editor at the cursor position.</p>

<h3>Tips for Better Dictation</h3>
<ul>
<li>Speak clearly and at a natural pace</li>
<li>Say punctuation marks: "full stop", "comma", "question mark", "new paragraph"</li>
<li>Use a quiet environment for best accuracy</li>
<li>The speech recognition language follows your Minstrel Codex language setting</li>
</ul>

<h3>Browser Compatibility</h3>
<p>Voice dictation works best in Chrome and Edge. Firefox and Safari have limited Web Speech API support. If dictation isn't available, the toggle will be greyed out in settings.</p>
`,
      },
      {
        id: 'text-to-speech',
        title: 'Text-to-Speech',
        content: `
<h2>Text-to-Speech</h2>
<p>Text-to-speech reads your document aloud, helping you catch errors, hear the rhythm of your prose, and review your work in a different modality.</p>

<h3>Enabling Text-to-Speech</h3>
<ol>
<li>Open Settings → Accessibility</li>
<li>Toggle "Text-to-Speech" to on</li>
</ol>

<h3>Usage</h3>
<p>Press <kbd>Ctrl + Shift + T</kbd> to start reading from the beginning of the document. Press again to stop. The reader uses your system's default voice for the selected language.</p>

<h3>Why Use Text-to-Speech?</h3>
<ul>
<li><strong>Proofreading</strong> — Hearing your text read aloud reveals awkward phrasing, repetition, and typos that your eyes skip over</li>
<li><strong>Rhythm check</strong> — Listen to the cadence of your sentences to improve flow</li>
<li><strong>Accessibility</strong> — Essential for writers with visual impairments or reading difficulties</li>
</ul>
`,
      },
      {
        id: 'visual-accessibility',
        title: 'Visual Accessibility',
        content: `
<h2>Visual Accessibility</h2>
<p>Minstrel Codex includes several features to make the interface comfortable for writers with different visual needs.</p>

<h3>High Contrast Mode</h3>
<p>Toggle in Settings → Accessibility. This increases the contrast between text and background colours across the entire interface, making text sharper and easier to read.</p>

<h3>Dyslexia-Friendly Font</h3>
<p>Switch to OpenDyslexic font in Settings → Accessibility. This font uses weighted bottoms and unique letter shapes to reduce the visual confusion that dyslexic readers often experience. Letters are less likely to appear to rotate, swap, or mirror.</p>

<h3>Reading Guide</h3>
<p>Enable the reading guide to display a horizontal line that follows your mouse cursor. This helps you track which line of text you're reading, reducing line-skipping — especially useful for dense text or long editing sessions.</p>

<h3>Reduced Motion</h3>
<p>If animations cause discomfort, enable "Reduced Motion" in Settings → Accessibility. This disables all transitions and animations throughout the interface.</p>

<h3>Colour Filters</h3>
<p>Apply colour correction filters for different types of colour vision deficiency:</p>
<ul>
<li><strong>Protanopia</strong> — Reduced red sensitivity</li>
<li><strong>Deuteranopia</strong> — Reduced green sensitivity</li>
<li><strong>Tritanopia</strong> — Reduced blue sensitivity</li>
</ul>
<p>These filters adjust the interface colours so that important visual distinctions remain visible.</p>
`,
      },
    ],
  },
  {
    id: 'cloud-sync',
    title: 'Cloud & Sync',
    children: [
      {
        id: 'google-drive',
        title: 'Google Drive Sync',
        content: `
<h2>Google Drive Sync</h2>
<p>Minstrel Codex can back up your writing to Google Drive. Open the Google Drive panel via <strong>Settings → Storage → Google Drive</strong> or <strong>FILE → Google Drive</strong>.</p>

<h3>Connecting Google Drive</h3>
<ol>
<li>Open Settings → Storage, or go to Profile → Sync tab.</li>
<li>Click <strong>Connect to Google Drive</strong>.</li>
<li>You will be redirected to Google's sign-in page. Sign in and grant permission.</li>
<li>Once authorised the status changes to <strong>✓ Connected</strong>.</li>
</ol>

<h3>Backup Destination</h3>
<p>The first thing to set after connecting is a backup destination — the Drive folder where your files will be saved. If you haven't set one, the panel shows a <strong>Browse &amp; select folder</strong> button.</p>
<ul>
<li>Expand <strong>Browse Drive</strong>, navigate to the folder you want, and click <strong>Use this folder as backup destination</strong>.</li>
<li>The selected folder appears under Backup Destination. Click <strong>Change</strong> to update it at any time.</li>
<li>The panel shows when the last backup ran.</li>
</ul>

<h3>Back Up Now</h3>
<p>Click <strong>↑ Back Up Now</strong> to immediately push all your local folders to the selected Drive destination. All folders visible in the File Browser are included — you can see the full list by expanding <strong>What Gets Backed Up</strong>.</p>

<h3>Auto-Save</h3>
<p>The <strong>Automatically back up changes</strong> toggle keeps Drive in sync while you write. When on, Minstrel backs up changes every few minutes in the background — you never have to think about it. Toggle it off if you prefer manual control.</p>

<h3>Browse Drive</h3>
<p>The collapsible <strong>Browse Drive</strong> section is a full file browser for your Google Drive. You can navigate folders, download files to open them in the editor, upload the current file to any folder, and create new folders. Click any folder to navigate into it; click any document to open it.</p>

<h3>Disconnecting</h3>
<p>Click <strong>Disconnect</strong> in the panel header to remove the Drive connection. Your local files are not affected. The backup destination setting is cleared, but your files on Drive remain.</p>

<h3>Privacy & Security</h3>
<ul>
<li>The connection uses Google's OAuth device flow with the <code>drive.file</code> scope — Minstrel can only access files it created, not your entire Drive.</li>
<li>You can revoke access at any time from your <a href="https://myaccount.google.com/permissions" target="_blank">Google Account permissions</a> page.</li>
</ul>
`,
      },
      {
        id: 'local-storage',
        title: 'Local Storage',
        content: `
<h2>Local Storage</h2>
<p>By default, all your documents are stored locally on your device using IndexedDB — a robust browser-based database.</p>

<h3>How It Works</h3>
<p>IndexedDB provides significantly more storage space than traditional localStorage (typically hundreds of MB vs. 5-10 MB). Your documents, file structure, preferences, and writing statistics are all stored in a dedicated database called <code>minstrel-codex</code>.</p>

<h3>Data Safety</h3>
<ul>
<li><strong>Auto-save</strong> protects against accidental data loss during writing</li>
<li><strong>Snapshots</strong> let you restore previous versions</li>
<li><strong>Export</strong> creates external backups in PDF or text format</li>
<li><strong>Google Drive sync</strong> provides cloud redundancy</li>
</ul>

<h3>Clearing Data</h3>
<p>Your data persists until you explicitly clear it. Clearing your browser's site data will remove all documents. To protect against this:</p>
<ul>
<li>Export important work regularly</li>
<li>Enable Google Drive sync for automatic cloud backup</li>
<li>Use project versions for milestone snapshots</li>
</ul>
`,
      },
    ],
  },
  {
    id: 'writing-tools',
    title: 'Writing Tools',
    children: [
      {
        id: 'formatting',
        title: 'Text Formatting',
        content: `
<h2>Text Formatting</h2>
<p>Minstrel Codex supports rich text formatting to help structure your writing. The formatting toolbar appears above the editor when text is selected.</p>

<h3>Available Formats</h3>
<table>
<tr><td><strong>Bold</strong></td><td><kbd>Ctrl + B</kbd></td><td>Emphasis for important words or phrases</td></tr>
<tr><td><em>Italic</em></td><td><kbd>Ctrl + I</kbd></td><td>Titles, thoughts, or subtle emphasis</td></tr>
<tr><td><u>Underline</u></td><td><kbd>Ctrl + U</kbd></td><td>Additional emphasis (use sparingly in manuscripts)</td></tr>
</table>

<h3>Headings</h3>
<p>Use headings to structure your document:</p>
<ul>
<li><strong>H1</strong> — Document or chapter title (usually one per file)</li>
<li><strong>H2</strong> — Major sections within a chapter</li>
<li><strong>H3</strong> — Sub-sections or scene labels</li>
</ul>

<h3>Lists</h3>
<ul>
<li><strong>Bullet lists</strong> — For unordered items, notes, or brainstorming</li>
<li><strong>Numbered lists</strong> — For sequences, outlines, or ranked items</li>
</ul>

<h3>Scene Breaks</h3>
<p>Insert a horizontal rule as a scene break using EDIT → Insert Scene Break. This appears as a subtle divider in the editor and prints cleanly.</p>
`,
      },
      {
        id: 'music-player',
        title: 'Ambient Music Player',
        content: `
<h2>Ambient Music Player</h2>
<p>The built-in music player provides ambient background music to help you focus while writing. Click <strong>ENTERTAINMENT</strong> in the menu bar and choose "Open Music Player…" to open the player sidebar.</p>

<h3>Controls</h3>
<ul>
<li><strong>Play / Pause</strong> — Start or stop the current track</li>
<li><strong>Skip Forward / Back</strong> — Move between tracks in the playlist</li>
<li><strong>Volume</strong> — Adjust the volume slider to your preference</li>
</ul>

<h3>Music Library</h3>
<p>Tracks are stored locally in a dedicated IndexedDB database (<code>pw-music-db</code>) so they play without an internet connection once loaded. The player supports ambient, lo-fi, and classical genres designed to enhance concentration without distraction.</p>

<h3>Tips</h3>
<ul>
<li>Keep the volume low — ambient music works best as subtle background texture</li>
<li>Try different genres for different types of writing (action scenes vs. quiet reflection)</li>
<li>Music continues playing even when you switch between documents or open other sidebars</li>
</ul>
`,
      },
      {
        id: 'manuscript-stats',
        title: 'Manuscript Statistics',
        content: `
<h2>Manuscript Statistics</h2>
<p>Track your writing progress with detailed statistics available from the status bar and the manuscript stats modal.</p>

<h3>Live Stats</h3>
<p>The status bar shows real-time counts for the current document:</p>
<ul>
<li><strong>Words</strong> — Total word count</li>
<li><strong>Characters</strong> — Total character count (with and without spaces)</li>
<li><strong>Reading time</strong> — Estimated time to read at average reading speed</li>
</ul>

<h3>Session Tracking</h3>
<p>Minstrel Codex automatically tracks your writing sessions. A session begins when you start typing and ends after 2 minutes of inactivity. Each session records:</p>
<ul>
<li>Words written during the session</li>
<li>Duration</li>
<li>XP earned (see Renown system)</li>
</ul>

<h3>Daily Writing Stats</h3>
<p>Your daily word counts are logged to help you maintain writing habits. These feed into the streak and Renown systems.</p>
`,
      },
      {
        id: 'ai-editor',
        title: 'AI Editorial Feedback',
        content: `
<h2>AI Editorial Feedback</h2>
<p>The AI Editor provides on-demand editorial feedback on your writing. It never interrupts your flow — it only runs when you explicitly request it. Powered by your choice of AI provider: Claude (Anthropic), OpenAI, Gemini, or a local Ollama model.</p>
<h3>Enabling the AI Editor</h3>
<ol>
  <li>Open your Profile (click your name in the nav bar) → Providers tab</li>
  <li>Toggle "AI Editorial Feedback" to on</li>
  <li>Add an API key for at least one provider (Claude, OpenAI, Gemini, or Ollama)</li>
  <li>The ✦ AI EDITOR indicator appears in the nav bar when enabled</li>
</ol>
<h3>Using the AI Editor</h3>
<p>Click the ✦ AI EDITOR pill in the nav bar, or press <kbd>Ctrl+Shift+E</kbd>, or right-click selected text and choose "Consult Editor". The Editor's Counsel panel opens on the right side of the screen.</p>
<p>Choose your scope — Selection, Scene, or Document — then click "Request Editorial Feedback". The AI analyses your writing across seven dimensions: clarity, pacing, voice, structure, tension, dialogue, and prose style.</p>
<h3>Providers</h3>
<ul>
  <li><strong>Claude (Anthropic)</strong> — Recommended. Strong literary sensibility and nuanced prose feedback.</li>
  <li><strong>OpenAI</strong> — GPT-4 class models. Reliable and widely used.</li>
  <li><strong>Gemini</strong> — Google's model. Good for longer documents.</li>
  <li><strong>Ollama</strong> — Run a local model entirely offline. No API key required, no data leaves your device.</li>
</ul>
<p>API keys are stored locally on your device and never shared. You can add multiple providers and the editor will automatically fall back to the next available provider if one fails.</p>
`,
      },
      {
        id: 'editor-module',
        title: 'The Editor Module',
        content: `
<h2>The Editor Module</h2>
<p>The Editor Module is an optional AI editorial feedback companion. It gives you the kind of thoughtful, constructive feedback a professional editor would give — not a grammar checker, not autocomplete. It only runs when you ask for it and leaves zero trace in the UI when disabled.</p>

<h3>Enabling the Module</h3>
<p>Open your <strong>Profile → Providers</strong> tab. The "AI Editorial Feedback" toggle is at the top — enable it there. You'll also need to add at least one AI provider key on the same page.</p>

<h3>Three Ways to Request Feedback</h3>
<ol>
<li><strong>Select text</strong> — Highlight any passage in the editor. A small floating "✦ Consult Editor" button appears just above your selection. Click it to review just that passage.</li>
<li><strong>Right-click selected text</strong> — When the Editor Module is enabled, right-clicking while text is selected opens the AI editor context menu with "✦ Consult Editor — Selection" and "✦ Consult Editor — Full Document". Right-clicking without a selection shows the browser's native menu instead, including spellcheck suggestions for any underlined word.</li>
<li><strong>Keyboard shortcut</strong> — Press <kbd>Ctrl+Shift+E</kbd> to immediately open the Editor Panel for a full document review.</li>
</ol>

<h3>Status Bar Indicator</h3>
<p>When the Editor Module is enabled, a <strong>✦ AI EDITOR</strong> button appears in the top navigation bar (teal, boxed, to the left of your profile avatar). Clicking it opens the Editor Panel for a full document review. The button disappears automatically if you disable the Editor Module in Settings.</p>

<h3>The Context Panel</h3>
<p>Before requesting feedback you can optionally provide context to guide the editor:</p>
<ul>
<li><strong>Scene purpose</strong> — What is this scene trying to achieve?</li>
<li><strong>POV character</strong> — Whose perspective is this written from?</li>
<li><strong>Emotional goal</strong> — How should the reader feel after this scene?</li>
<li><strong>Specific concerns</strong> — Anything particular you want the editor to focus on.</li>
</ul>
<p>Genre, audience, and premise are auto-populated from your novel project settings if available.</p>

<h3>Scope-Based Feedback</h3>
<p>The depth and structure of feedback scales with what you're asking it to review:</p>
<ul>
<li><strong>Selection</strong> — A highlighted passage (typically 1–3 paragraphs). Returns 2 focused observations and 2 top suggestions. Fast and targeted.</li>
<li><strong>Scene</strong> — A scene or page (roughly 300–1,000 words). Returns specific strengths, 3–4 labelled observations (e.g. "Pacing", "Dialogue", "Clarity"), and 3 suggestions.</li>
<li><strong>Document</strong> — A full chapter or longer. Returns the full editorial review across named dimensions: Strengths, Clarity & Language, Pacing & Tension, Dialogue, Character & Consistency, Emotional Impact, Narrative Purpose, and Top Suggestions.</li>
</ul>

<h3>Inline Examples</h3>
<p>Every observation includes a brief inline example — not a rewrite, but a marginal note showing one sentence or phrase from the text handled differently. The aim is to illustrate the principle, not replace your voice.</p>

<h3>Tone</h3>
<p>The editor speaks directly but kindly — like a professional human editor, not a bot. It won't rewrite your work. It won't correct grammar pedantically. The goal is insight, not interference. Context fields (genre, audience, scene purpose) actively shape the feedback — a thriller and a literary novel should get different observations on the same passage.</p>

<h3>Spellcheck</h3>
<p>The editor includes browser-native spellcheck, which underlines misspelled words as you type using your system's built-in dictionary. It is enabled by default and can be toggled off in <strong>Settings → Language → Spellcheck</strong>. Right-clicking an underlined word shows spelling suggestions from your browser.</p>
<p>Spellcheck uses the language set in <strong>Settings → Language</strong> to select the correct dictionary — for example, selecting <em>English (UK)</em> enables UK spelling, and <em>Afrikaans</em> enables Afrikaans dictionary support. Changing the language in Settings updates the editor immediately without a reload.</p>
`,
      },
      {
        id: 'ai-providers',
        title: 'AI Providers',
        content: `
<h2>AI Providers</h2>
<p>The Editor Module uses your own AI provider key. You choose which AI service to use — Minstrel Codex never provides or resells AI access.</p>

<h3>Before you paste a key: how API billing works</h3>
<p>A quick heads-up so there are no surprises. Provider API keys are <strong>separate from subscriptions</strong> like Claude.ai Pro or ChatGPT Plus. Those subscriptions give you access to the chat interfaces — they don't cover API usage. API calls are billed independently, based on the amount of text processed.</p>
<p>In practice, editorial feedback is inexpensive. A single session reviewing a 1,000-word scene costs a fraction of a cent. A $5–10 credit top-up on any paid provider will cover hundreds of editing sessions.</p>
<p><strong>If you'd rather not add a credit card at all</strong>, Gemini and Mistral both have genuinely free API tiers — no billing required to get started. Ollama is completely free and runs locally on your machine.</p>

<h3>Supported Providers</h3>
<table>
<tr><td><strong>Claude (Anthropic)</strong></td><td>Recommended for literary feedback — nuanced, context-aware, excellent for long-form prose. Get a key at <strong>console.anthropic.com → API Keys</strong>. Requires a separate credit balance at console.anthropic.com/billing (not covered by a Claude.ai subscription).</td></tr>
<tr><td><strong>ChatGPT (OpenAI)</strong></td><td>Widely used, strong general editorial feedback. Get a key at <strong>platform.openai.com → API Keys</strong>. Requires a separate credit balance (not covered by a ChatGPT Plus subscription).</td></tr>
<tr><td><strong>Gemini (Google)</strong></td><td>Fast and capable, good for shorter selections. Get a free key at <strong>aistudio.google.com → Get API Key</strong>. Has a free tier — no billing required to start.</td></tr>
<tr><td><strong>Mistral</strong></td><td>Efficient and precise, good value for editorial work. Get a free key at <strong>console.mistral.ai → API Keys</strong>. Has a free tier — no billing required to start.</td></tr>
<tr><td><strong>Ollama (local)</strong></td><td>Fully offline — no API key, no cost, no data leaving your machine. Requires Ollama installed and running locally at http://localhost:11434.</td></tr>
</table>

<h3>Where to start</h3>
<p>If you're not sure which provider to use: <strong>Gemini or Mistral</strong> are the easiest entry points — free tier, no credit card, just create an account and generate a key. If you want the best literary feedback and are happy to add a small credit balance, Claude is the recommendation.</p>

<h3>Adding Keys</h3>
<p>Go to <strong>Profile → Providers</strong>. For each cloud provider, paste your API key into the input field and click Save. For Ollama, enter the base URL and the model name you have pulled (e.g. <code>mistral</code>, <code>llama3</code>).</p>
<p>When you save the first key, that provider is automatically set as the active provider. You don't need to click "Set as active" unless you want to switch to a different provider.</p>

<h3>Automatic Fallback</h3>
<p>If you have keys saved for more than one provider, the Editor Module will automatically try the next available provider if the active one fails — whether due to an expired key, quota limit, or network issue. It tries your active provider first, then the others in order, silently. You'll only see an error if every saved provider has been tried and all failed.</p>

<h3>Switching Providers</h3>
<p>You can add keys for multiple providers and switch between them at any time using the "Set as active" button in Profile → Providers. The active provider is shown with a teal dot and "Active" label, and is also shown in the Editor Panel footer.</p>

<h3>Security</h3>
<p>API keys are stored in your browser's localStorage. If you are signed in to Minstrel Codex, keys are also synced to your encrypted profile in Supabase. Keys are never logged, never sent to Minstrel servers, and are only used to make the editorial feedback request directly from your browser to the provider's API.</p>

<h3>Ollama: Fully Offline Writing Feedback</h3>
<p>If you install Ollama on your computer, you can get editorial feedback with no internet connection and no API costs. Run <code>ollama pull mistral</code> (or any model you prefer) and enter the model name in Profile → Providers. The Editor Module will route all requests through your local Ollama instance.</p>
`,
      },
    ],
  },
  {
    id: 'renown-system',
    title: 'Renown & Progression',
    children: [
      {
        id: 'renown-overview',
        title: 'The Renown System',
        content: `
<h2>The Renown System</h2>
<p>Renown is Minstrel Codex's writer progression system — a record of your craft, built word by word. It rewards showing up consistently rather than writing perfectly. Renown never resets.</p>

<h3>Song Complete</h3>
<p>After each writing session a Song Complete screen appears showing your words written, time spent, Renown earned, and current streak. This is your session reward — every session counts, even short ones.</p>

<h3>How Renown Is Earned</h3>
<ul>
<li>Words written: +0.5 Renown per word (base rate, counted on session end)</li>
<li>Session ≥ 250 words: +25 bonus Renown</li>
<li>Session ≥ 500 words: +75 bonus Renown</li>
<li>Session ≥ 1,000 words: +200 bonus Renown</li>
<li>Chapter completed (sprint ended): +50 Renown</li>
<li>Daily streak maintained: +10 Renown × streak day (Day 3 = +30, Day 7 = +70)</li>
<li>First session of the day: +15 Renown</li>
<li>Personal best (most words in a session): +100 Renown (once per new record)</li>
<li>Novel completed: +1,000 Renown</li>
<li>Chronicle unlocked: +50 bonus Renown</li>
</ul>

<h3>Streak Multiplier</h3>
<p>An active streak multiplies all word Renown earned in a session:</p>
<ul>
<li>0 days — 1.0× (no multiplier)</li>
<li>3–6 days — 1.2× — On a Roll</li>
<li>7–13 days — 1.5× — Finding the Rhythm</li>
<li>14–29 days — 1.75× — The Dedicated Scribe</li>
<li>30+ days — 2.0× — Legend of the Page</li>
</ul>
`,
      },
      {
        id: 'levels',
        title: 'Levels & Titles',
        content: `
<h2>Levels &amp; Titles</h2>
<p>You begin as an Apprentice Scribe and rise through 12 levels as you accumulate Renown. Levels never go backwards. Each level unlocks new features and is displayed on your Song Complete screen. From Level 3 onward your level title appears as a subtle badge in the status bar.</p>

<h3>The 12 Levels</h3>
<table>
<tr><td><strong>Lv 1 — Apprentice Scribe</strong> — 0 Renown</td><td>Unlocks: Song Complete screen, basic stats</td></tr>
<tr><td><strong>Lv 2 — Wandering Scribe</strong> — 1,000 Renown</td><td>Unlocks: Streak tracking, daily Renown display</td></tr>
<tr><td><strong>Lv 3 — Keeper of Tales</strong> — 3,000 Renown</td><td>Unlocks: First Chronicles visible</td></tr>
<tr><td><strong>Lv 4 — Journeyman Bard</strong> — 6,000 Renown</td><td>Unlocks: Session history chart</td></tr>
<tr><td><strong>Lv 5 — Wordsmith</strong> — 10,000 Renown</td><td>Unlocks: Pace predictions in stats panel, Quill's Rest tokens</td></tr>
<tr><td><strong>Lv 6 — Chronicler</strong> — 16,000 Renown</td><td>Unlocks: Full Chronicle Ledger (Ctrl+Shift+C)</td></tr>
<tr><td><strong>Lv 7 — Storyteller</strong> — 24,000 Renown</td><td>Unlocks: Shareable milestone cards</td></tr>
<tr><td><strong>Lv 8 — Master of Words</strong> — 34,000 Renown</td><td>Unlocks: Custom streak badge</td></tr>
<tr><td><strong>Lv 9 — Voice of Ages</strong> — 46,000 Renown</td><td>Unlocks: Legacy stats (all-time totals)</td></tr>
<tr><td><strong>Lv 10 — The Devoted</strong> — 60,000 Renown</td><td>Unlocks: Dedicated Scribe theme</td></tr>
<tr><td><strong>Lv 11 — Grand Bard</strong> — 80,000 Renown</td><td>Unlocks: Hall of Works (completed novels list)</td></tr>
<tr><td><strong>Lv 12 — Legend of the Page</strong> — 100,000 Renown</td><td>Unlocks: All features. Permanent gold streak badge.</td></tr>
</table>
<p>Level titles display on the Song Complete screen below the XP progress bar. The badge appears in the status bar from Level 3 (Keeper of Tales) onward. Before that it is hidden — the writer discovers it organically.</p>
`,
      },
      {
        id: 'streaks',
        title: 'Writing Streaks',
        content: `
<h2>Writing Streaks</h2>
<p>Streaks track how many consecutive days you have written. They are designed to reward consistency without creating anxiety.</p>

<h3>Streak Rules</h3>
<ul>
<li>A streak day is earned by completing any session with ≥ 50 words</li>
<li>A streak breaks if no qualifying session is recorded within 48 hours of the previous session (midnight-to-midnight with a one-day grace — late-night writers won't lose their streak at midnight)</li>
<li>Your streak multiplier applies to all word Renown for the entire session</li>
<li>Your streak appears as 🔥 [days] in the status bar from 3 days onward</li>
</ul>

<h3>Quill's Rest (Streak Freeze)</h3>
<p>At Level 5 (Wordsmith) you earn one Quill's Rest token per month — a streak freeze that protects against a single missed day. Maximum 2 tokens held at once.</p>

<h3>Streak Milestones</h3>
<p>Reaching these streak lengths triggers a milestone overlay and unlocks a Chronicle:</p>
<p>3 days · 7 days · 14 days · 30 days · 60 days · 90 days · 180 days · 365 days</p>

<h3>Streak Multiplier Table</h3>
<ul>
<li>0 days — 1.0× (no multiplier)</li>
<li>3–6 days — 1.2× — On a Roll</li>
<li>7–13 days — 1.5× — Finding the Rhythm</li>
<li>14–29 days — 1.75× — The Dedicated Scribe</li>
<li>30+ days — 2.0× — Legend of the Page</li>
</ul>
`,
      },
      {
        id: 'chronicles',
        title: 'Chronicles',
        content: `
<h2>Chronicles</h2>
<p>Chronicles are achievements earned by reaching milestones in your writing. Each Chronicle uses the language of an ancient record-keeper cataloguing a bard's deeds. Unlocking any Chronicle awards +50 bonus Renown on top of the Chronicle's own reward.</p>

<p>From Level 3 (Keeper of Tales) Chronicles appear in your Chronicle Ledger — earned ones show their name, description, and date earned; locked ones show their name and a hint. Some Chronicles are hidden and only reveal themselves when earned.</p>

<h3>Chronicle Ledger</h3>
<p>Unlocks at Level 6 (Chronicler). Access via Ctrl+Shift+C.<br/>
Contains: The Bard's Legend (lifetime stats) · Chronicles grid · This Week chart · Hall of Works (unlocks at Level 11)</p>

<h3>Writing Consistency Chronicles</h3>
<ul>
<li><strong>The First Inkmark</strong> — Complete your first writing session — +50 Renown</li>
<li><strong>Three Days Hence</strong> — Maintain a 3-day streak — +100 Renown</li>
<li><strong>The Week Unbroken</strong> — Maintain a 7-day streak — +250 Renown</li>
<li><strong>A Fortnight's Devotion</strong> — Maintain a 14-day streak — +500 Renown</li>
<li><strong>The Month of Making</strong> — Maintain a 30-day streak — +1,000 Renown</li>
<li><strong>Creature of Habit</strong> — Write on the same day of the week 10 weeks running — +400 Renown</li>
</ul>

<h3>Word Count Chronicles</h3>
<ul>
<li><strong>First Words Spoken</strong> — Write 100 words total (lifetime) — +50 Renown</li>
<li><strong>The Opening Chapter</strong> — Write 1,000 words total — +100 Renown</li>
<li><strong>Into the Story</strong> — Write 10,000 words total — +200 Renown</li>
<li><strong>The First Act</strong> — Write 25,000 words total — +400 Renown</li>
<li><strong>The Middle Distance</strong> — Write 50,000 words total — +600 Renown</li>
<li><strong>NaNoWriMo Spirit</strong> — Write 50,000 words in a single month — +800 Renown</li>
<li><strong>The Full Manuscript</strong> — Write 80,000 words total — +1,000 Renown</li>
<li><strong>Prolific Voice</strong> — Write 200,000 words total (lifetime) — +2,000 Renown</li>
</ul>

<h3>Session Performance Chronicles</h3>
<ul>
<li><strong>A Good Morning's Work</strong> — Write 500 words in a single session — +75 Renown</li>
<li><strong>The Long Watch</strong> — Write 1,000 words in a single session — +150 Renown</li>
<li><strong>The Unbroken Flow</strong> — Write 2,000 words in a single session — +300 Renown</li>
<li><strong>The Epic Session</strong> — Write 5,000 words in a single session — +750 Renown</li>
<li><strong>Swift of Quill</strong> — Complete a sprint with 100+ words in 15 minutes — +100 Renown</li>
<li><strong>The Marathon Scribe</strong> — Write for 3+ hours in a single day — +200 Renown</li>
</ul>

<h3>Project Milestone Chronicles</h3>
<ul>
<li><strong>A Chapter Sung</strong> — Complete your first chapter (sprint ended) — +100 Renown</li>
<li><strong>Ten Songs Recorded</strong> — Complete 10 chapters across any projects — +300 Renown</li>
<li><strong>The First Novel</strong> — Reach 80,000 words in a single project — +2,000 Renown</li>
<li><strong>The Prolific Bard</strong> — Complete 3 novels — +3,000 Renown</li>
<li><strong>A World of Stories</strong> — Have 5 active projects — +200 Renown</li>
<li><strong>Keeper of Many Tales</strong> — Complete 100 chapters total — +1,000 Renown</li>
</ul>

<h3>Hidden Chronicles</h3>
<p>There are at least 6 hidden Chronicles that reward unusual habits, odd hours, and quiet dedication. They will not appear in your Chronicle Ledger until earned. Hints: some involve the clock, some involve offline writing, some involve the Typing Challenge.</p>

<h3>Typing Challenge &amp; Chronicles</h3>
<p>The Typing Challenge in Settings &gt; System tracks your WPM. Two Chronicles are tied to it:</p>
<ul>
<li>Swift of Quill — reach 60 WPM in a sprint</li>
<li>One hidden Chronicle for reaching 80 WPM</li>
</ul>
`,
      },
      {
        id: 'glossary',
        title: 'Minstrel Codex Glossary',
        content: `
<h2>Minstrel Codex Glossary</h2>
<p>The app uses consistent lore language throughout. Here is what each term means:</p>
<ul>
<li><strong>Bard</strong> — You, the writer</li>
<li><strong>Song</strong> — A writing session</li>
<li><strong>Canto</strong> — A chapter</li>
<li><strong>The Work / The Chronicle</strong> — A novel or project</li>
<li><strong>Renown</strong> — XP / Experience Points</li>
<li><strong>Chronicle</strong> — An achievement</li>
<li><strong>Ascension</strong> — Levelling up</li>
<li><strong>Quill's Rest</strong> — A streak freeze token (unlocks at Level 5)</li>
<li><strong>Chronicle Ledger</strong> — The achievement and stats dashboard</li>
<li><strong>Finest Hour</strong> — A personal best (most words in a single session)</li>
<li><strong>Song Complete</strong> — The end-of-session reward screen</li>
<li><strong>Days Devoted</strong> — Your current streak count</li>
<li><strong>Bard's Legend</strong> — Your lifetime stats summary</li>
</ul>
`,
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    children: [
      {
        id: 'pin-lock',
        title: 'PIN Lock',
        content: `
<h2>PIN Lock</h2>
<p>The PIN lock secures your Minstrel Codex session so no one can access your writing when you step away from your device.</p>

<h3>Setting Up a PIN</h3>
<ol>
<li>Open Settings → Security</li>
<li>Choose a PIN length: 4 digits or 6 digits</li>
<li>Enter your chosen PIN</li>
<li>Confirm the PIN</li>
<li>Toggle PIN lock to "Enabled"</li>
</ol>

<h3>How It Works</h3>
<p>When PIN lock is enabled, Minstrel Codex locks itself when the application loads. You must enter your PIN to access the editor. This prevents casual access — if someone opens your browser or device, they'll see the lock screen, not your writing.</p>

<h3>Changing or Disabling Your PIN</h3>
<p>Return to Settings → Security to change your PIN or disable the lock entirely. You don't need to enter the current PIN to change settings (since you're already authenticated).</p>

<h3>Security Note</h3>
<p>The PIN is stored locally on your device. It provides a basic access barrier but is not cryptographic encryption. For truly sensitive content, combine the PIN lock with your device's own screen lock and disk encryption.</p>
`,
      },
    ],
  },
  {
    id: 'themes-customisation',
    title: 'Themes & Customisation',
    children: [
      {
        id: 'themes-guide',
        title: 'Theme System',
        content: `
<h2>Theme System</h2>
<p>Minstrel Codex comes with multiple themes that change the entire look and feel of the interface — background colours, text colours, accents, and atmospheric effects.</p>

<h3>Changing Themes</h3>
<p>Open Settings → Theme to browse available themes. Click any theme to apply it instantly. The theme affects:</p>
<ul>
<li>Background and surface colours</li>
<li>Text and accent colours</li>
<li>Menu bar and sidebar styling</li>
<li>Status bar appearance</li>
<li>Atmospheric background effects (for themes that include them)</li>
</ul>

<h3>Available Themes</h3>
<p>Themes range from minimal and paper-like to atmospheric and immersive. Each theme is carefully designed to provide a cohesive writing environment. Some themes include animated background effects for extra ambience.</p>

<h3>Font Customisation</h3>
<p>Independent of the theme, you can customise:</p>
<ul>
<li><strong>Editor font</strong> — Choose from a selection of writing-optimised fonts</li>
<li><strong>Font size</strong> — Increase or decrease with <kbd>Ctrl + +</kbd> and <kbd>Ctrl + -</kbd>. Font size can also be adjusted using the A− and A+ buttons in the formatting toolbar above the editor.</li>
</ul>

<h3>Language</h3>
<p>Minstrel Codex supports 30+ languages for the interface. Change your language in Settings → Language. The language setting also affects spell-check and voice dictation.</p>
`,
      },
    ],
  },
  {
    id: 'profile-account',
    title: 'Profile & Account',
    children: [
      {
        id: 'profile-overview',
        title: 'Your Profile',
        content: `
<h2>Your Profile</h2>
<p>Click your name in the nav bar to open your Profile panel. This is your account hub — sign in, manage settings, connect providers, and configure sync.</p>
<h3>Tabs</h3>
<ul>
  <li><strong>Account</strong> — Your display name, email, and sign out option. Sign in with Google or email/password to enable cloud sync across devices.</li>
  <li><strong>Preferences</strong> — Personal writing preferences synced to your account.</li>
  <li><strong>Providers</strong> — Enable the AI Editor and add API keys for Claude, OpenAI, Gemini, or Ollama.</li>
  <li><strong>Sync</strong> — Configure Google Drive sync settings and view last sync time.</li>
  <li><strong>Security</strong> — Change your password or manage authentication.</li>
  <li><strong>About</strong> — App version and credits.</li>
</ul>
<h3>Signing In</h3>
<p>Signing in is optional. Without an account, all your data is stored locally and all features work. Signing in adds cross-device sync via Google Drive and saves your preferences to the cloud.</p>
`,
      },
    ],
  },
  {
    id: 'profile-sync',
    title: 'Your Profile & Sync',
    children: [
      {
        id: 'creating-a-profile',
        title: 'Creating a Profile',
        content: `
<h2>Your Profile &amp; Account</h2>
<p>Minstrel Codex is fully functional without an account. Your documents, settings, and preferences are always saved locally on your device. An account is entirely optional — it adds cross-device sync and nothing else.</p>

<h3>Opening Your Profile</h3>
<p>Your profile is accessible from the <strong>profile button in the top right of the menu bar</strong>. When you are not signed in, this appears as a "Sign In" button. When signed in, it shows your name and initials. Clicking either opens the Profile page.</p>

<h3>Creating an Account</h3>
<p>To create an account, open your profile from the top right and choose one of the following:</p>
<ul>
<li><strong>Continue with Google</strong> — One-click sign-in using your existing Google account. No new password needed.</li>
<li><strong>Email &amp; Password</strong> — Create an account with a display name, email address, and password (minimum 8 characters). Check your email to confirm before signing in.</li>
</ul>

<h3>What Syncs</h3>
<p>When signed in, the following data syncs automatically across devices:</p>
<ul>
<li>Theme, font, font size, language, accessibility settings</li>
<li>File structure and all documents</li>
<li>Project settings, renown &amp; level, streaks, chronicles</li>
<li>Music preferences and writing goal</li>
</ul>
<p>Sync is additive — signing in on a new device <strong>merges</strong> cloud and local data. Nothing is ever deleted from your local device.</p>

<h3>Privacy</h3>
<p>Your writing is stored on your device first. When sync is enabled, documents are encrypted in transit and stored securely on Supabase infrastructure. You can sign out or delete your account at any time from the Profile page.</p>
`,
      },
      {
        id: 'sync-settings',
        title: 'Sync &amp; Cross-Device',
        content: `
<h2>Cross-Device Sync</h2>
<p>When you are signed in, Minstrel Codex automatically syncs your settings and documents in the background. Changes are pushed within two seconds of being made.</p>

<h3>Offline Behaviour</h3>
<p>If you go offline, all changes are saved locally and queued for sync. When your connection returns, any pending changes are pushed automatically. You will never lose work due to connectivity issues.</p>

<h3>Conflict Resolution</h3>
<p>When you sign in on a new device, cloud and local data are <strong>merged</strong> — not replaced. For documents, the most recently modified version wins. For file structure, the union of both devices is used. Nothing is ever deleted from your local storage.</p>

<h3>Manual Sync</h3>
<p>Open your profile from the top right and navigate to the <strong>Sync</strong> tab. Click <strong>Sync Now</strong> to trigger an immediate push of all local data to the cloud.</p>

<h3>Google Drive</h3>
<p>Google Drive sync is a separate feature for file backup, configured in <strong>Settings → Storage</strong>. It works independently of your Minstrel account sync.</p>
`,
      },
    ],
  },
];

// ── Flat lookup helper ──────────────────────────────────────────────
function flattenPages(nodes: HelpNode[], result: Map<string, HelpPage> = new Map()): Map<string, HelpPage> {
  for (const node of nodes) {
    if (isHelpFolder(node)) {
      flattenPages(node.children, result);
    } else {
      result.set(node.id, node);
    }
  }
  return result;
}

let _cache: Map<string, HelpPage> | null = null;

export function getHelpPage(id: string): HelpPage | undefined {
  if (!_cache) _cache = flattenPages(HELP_TREE);
  return _cache.get(id);
}
