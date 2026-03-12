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
<li><strong>Explore the menu bar</strong> — The top menu (FILE, EDIT, SETTINGS, MUSIC, HELP) gives you access to every feature. Press <kbd>ESC</kbd> to open it with your keyboard.</li>
</ol>

<h3>Philosophy</h3>
<p>Minstrel Codex is designed around three principles:</p>
<ul>
<li><strong>Distraction-free</strong> — No social feeds, no notifications, no clutter. Just you and your words.</li>
<li><strong>Local-first</strong> — Your documents live on your device. Cloud sync is optional and always under your control.</li>
<li><strong>Accessible</strong> — Voice dictation, text-to-speech, dyslexia-friendly fonts, high contrast modes, and full keyboard navigation are built in from day one.</li>
</ul>

<h3>Interface Overview</h3>
<p>The interface is composed of four zones:</p>
<ul>
<li><strong>Menu Bar</strong> (top) — Access all commands, settings, and tools.</li>
<li><strong>Sidebar</strong> (left) — File browser, help, notes, and chapter overview panels live here. Only one sidebar can be open at a time.</li>
<li><strong>Editor</strong> (centre) — Your writing canvas. Supports rich text formatting, headings, and scene breaks.</li>
<li><strong>Status Bar</strong> (bottom) — Shows word count, save status, battery, Wi-Fi, and your current writing session stats. When the Editor Module is enabled, a <strong>✦ EDITOR</strong> indicator appears here — click it to open the Editor Panel.</li>
<li><strong>Editor Panel</strong> (right) — Optional AI editorial feedback panel. Opens alongside the editor when you request feedback. Enable it in Settings → System.</li>
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
<li><strong>FILE</strong> — Create, open, save, export, and manage your documents and novel projects. Access the file browser, Google Drive sync, and version snapshots.</li>
<li><strong>EDIT</strong> — Undo, redo, find and replace, insert scene breaks, and access formatting tools.</li>
<li><strong>SETTINGS</strong> — Opens the settings panel where you can customise themes, fonts, language, accessibility, security, and storage options.</li>
<li><strong>MUSIC</strong> — Opens the ambient music player sidebar for background writing music.</li>
<li><strong>HELP</strong> — Opens this help panel.</li>
</ul>

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
<tr><td><kbd>Ctrl + Shift + U</kbd></td><td>Open the Writer Dashboard</td></tr>
<tr><td><kbd>F11</kbd></td><td>Toggle fullscreen / focus mode</td></tr>
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
<p>Minstrel Codex can sync your entire file structure to Google Drive, giving you cloud backup and seamless access from any device running Minstrel — whether it's the web app, desktop, or Pi edition.</p>

<h3>Connecting Google Drive</h3>
<ol>
<li>Open <strong>Settings → Storage</strong>, or select <strong>FILE → Google Drive</strong> from the menu bar.</li>
<li>Click <strong>Connect to Google Drive</strong>. A device pairing screen will appear with a code and a link.</li>
<li>Open the link on any device, sign in to your Google account, and enter the code.</li>
<li>Once authorised, the status will change to <strong>✓ Connected</strong>. Sync begins automatically.</li>
</ol>

<h3>The "Minstrel" Folder</h3>
<p>All synced files live inside a single folder called <strong>Minstrel</strong> at the root of your Google Drive. This folder is created automatically when you first connect.</p>
<ul>
<li>Every version of Minstrel Codex (web, desktop, Pi) uses the <strong>same "Minstrel" folder</strong>, so your work follows you across devices.</li>
<li>The complete folder hierarchy from your file browser is preserved — Novel Projects, chapters, notes, and subfolders all appear on Drive exactly as they do locally.</li>
<li>If the folder already exists (e.g. from a previous device), Minstrel finds it instead of creating a duplicate.</li>
</ul>

<h3>How Sync Works</h3>
<ul>
<li><strong>Automatic bidirectional sync</strong> — Every 2 minutes, Minstrel pulls new/updated files from Drive and pushes any local changes. A full sync also runs when the app starts.</li>
<li><strong>Conflict resolution</strong> — If the same file was edited on two devices, the newer version wins. The older version is not lost — it remains in your Drive's version history.</li>
<li><strong>Offline resilience</strong> — If you go offline, changes queue locally and sync when connectivity returns.</li>
</ul>

<h3>Deleting Files</h3>
<p>When you permanently delete a file or folder locally (from the Deleted folder), it is also <strong>trashed on Google Drive</strong> during the next sync cycle. Trashed files can still be recovered from Google Drive's Trash for 30 days.</p>

<h3>Manual Sync</h3>
<p>You can trigger a sync at any time by clicking the sync status indicator in the status bar, or via <strong>FILE → Sync Now</strong>.</p>

<h3>Disconnecting</h3>
<p>To disconnect from Google Drive, go to <strong>Settings → Storage</strong> and click <strong>Disconnect</strong>. Your local files remain untouched — only the cloud sync stops. The "Minstrel" folder and its contents remain on your Drive.</p>

<h3>Privacy & Security</h3>
<ul>
<li>Minstrel Codex only accesses the <strong>Minstrel</strong> folder in your Drive — it cannot read or modify any other files.</li>
<li>The connection uses Google's secure OAuth flow with the <code>drive.file</code> scope, which limits access to files created by the app.</li>
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
<p>The built-in music player provides ambient background music to help you focus while writing. Click MUSIC in the menu bar to open the player sidebar.</p>

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
        id: 'editor-module',
        title: 'The Editor Module',
        content: `
<h2>The Editor Module</h2>
<p>The Editor Module is an optional AI editorial feedback companion. It gives you the kind of thoughtful, constructive feedback a professional editor would give — not a grammar checker, not autocomplete. It only runs when you ask for it and leaves zero trace in the UI when disabled.</p>

<h3>Enabling the Module</h3>
<p>Go to <strong>Settings → System → Editor Module</strong> and toggle "AI Editorial Feedback" on. You'll also need to add at least one AI provider key in <strong>Profile → Providers</strong>.</p>

<h3>Three Ways to Request Feedback</h3>
<ol>
<li><strong>Select text</strong> — Highlight any passage in the editor. A small floating "✦ Consult Editor" button appears just above your selection. Click it to review just that passage.</li>
<li><strong>Right-click</strong> — Right-click anywhere in the editor area to open the context menu. When the Editor Module is enabled, you'll see "✦ Consult Editor — Selection" (only if text is selected) and "✦ Consult Editor — Full Document".</li>
<li><strong>Keyboard shortcut</strong> — Press <kbd>Ctrl+Shift+E</kbd> to immediately open the Editor Panel for a full document review.</li>
</ol>

<h3>Status Bar Indicator</h3>
<p>When the Editor Module is enabled, a subtle <strong>✦ EDITOR</strong> indicator appears in the status bar (teal, right side). Clicking it opens the Editor Panel for a full document review.</p>

<h3>The Context Panel</h3>
<p>Before requesting feedback you can optionally provide context to guide the editor:</p>
<ul>
<li><strong>Scene purpose</strong> — What is this scene trying to achieve?</li>
<li><strong>POV character</strong> — Whose perspective is this written from?</li>
<li><strong>Emotional goal</strong> — How should the reader feel after this scene?</li>
<li><strong>Specific concerns</strong> — Anything particular you want the editor to focus on.</li>
</ul>
<p>Genre, audience, and premise are auto-populated from your novel project settings if available.</p>

<h3>Feedback Sections</h3>
<p>Editorial feedback is organised into collapsible sections:</p>
<ul>
<li><strong>✦ Strengths</strong> — 2–4 specific things that are working well</li>
<li><strong>Clarity & Language</strong> — How clearly ideas are communicated</li>
<li><strong>Pacing & Tension</strong> — The rhythm and momentum of the prose</li>
<li><strong>Dialogue</strong> — Only shown when dialogue is present in the text</li>
<li><strong>Character & Consistency</strong> — Character voice and behaviour</li>
<li><strong>Emotional Impact</strong> — Whether the scene achieves its emotional intent</li>
<li><strong>Narrative Purpose</strong> — How well the scene serves the larger story</li>
<li><strong>✦ Top Suggestions</strong> — The 3 most important actionable changes</li>
<li><strong>✦ Example Rewrite</strong> — Optional: a rewritten opening paragraph showing suggestions applied (opt-in per request)</li>
</ul>

<h3>Tone</h3>
<p>The editor speaks directly but kindly — like a professional human editor, not a bot. It won't rewrite your work unless you ask for the example rewrite. It won't correct grammar pedantically. The goal is insight, not interference.</p>
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
<li><strong>Font size</strong> — Increase or decrease with <kbd>Ctrl + +</kbd> and <kbd>Ctrl + -</kbd></li>
</ul>

<h3>Language</h3>
<p>Minstrel Codex supports 30+ languages for the interface. Change your language in Settings → Language. The language setting also affects spell-check and voice dictation.</p>
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
