import { X, HelpCircle, Keyboard, FileText, Mic, Volume2, Eye, BookOpen, Settings, Music, FolderOpen, Printer, PenTool } from 'lucide-react';

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

interface HelpPanelProps {
  visible: boolean;
  onClose: () => void;
}

interface HelpSection {
  title: string;
  icon: React.ReactNode;
  items: { label: string; detail: string }[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    title: 'Getting Started',
    icon: <PenTool size={14} strokeWidth={1.8} />,
    items: [
      { label: 'Start writing', detail: 'Click the editor area and begin typing. Your work auto-saves every 30 seconds.' },
      { label: 'Menu bar', detail: 'Use the top menu (FILE, EDIT, NETWORK) or press ESC to navigate with keyboard.' },
      { label: 'Settings', detail: 'Click SETTINGS in the menu bar to customise theme, language, accessibility, and more.' },
    ],
  },
  {
    title: 'Keyboard Shortcuts',
    icon: <Keyboard size={14} strokeWidth={1.8} />,
    items: [
      { label: 'Ctrl + S', detail: 'Save current document' },
      { label: 'Ctrl + N', detail: 'New document' },
      { label: 'Ctrl + O', detail: 'Open document' },
      { label: 'Ctrl + Z', detail: 'Undo' },
      { label: 'Ctrl + Shift + Z', detail: 'Redo' },
      { label: 'Ctrl + B / I / U', detail: 'Bold / Italic / Underline' },
      { label: 'Ctrl + P', detail: 'Print current page' },
      { label: 'Ctrl + Shift + B', detail: 'Toggle file browser' },
      { label: 'ESC', detail: 'Open / close menu bar' },
      { label: 'F11', detail: 'Toggle fullscreen' },
    ],
  },
  {
    title: 'File Management',
    icon: <FolderOpen size={14} strokeWidth={1.8} />,
    items: [
      { label: 'File Browser', detail: 'Press Ctrl+Shift+B or use FILE → File Browser to open the sidebar. Create folders, move, rename, and organise files.' },
      { label: 'Novel Projects', detail: 'Use FILE → New Novel Project to create a structured project with chapters, notes, and version control.' },
      { label: 'Save Version', detail: 'Snapshot your current chapters into a versioned backup via FILE → Save Version.' },
      { label: 'Export', detail: 'Use FILE → Export / Combine to export your work as PDF, plain text, or combined multi-file documents.' },
    ],
  },
  {
    title: 'Documents & Saving',
    icon: <FileText size={14} strokeWidth={1.8} />,
    items: [
      { label: 'Auto-save', detail: 'Your document is automatically saved every 30 seconds to local storage.' },
      { label: 'Save As', detail: 'Use FILE → Save As to save under a different filename.' },
      { label: 'Snapshots', detail: 'Press Ctrl+Shift+V to save a timestamped snapshot of your current document.' },
      { label: 'Google Drive', detail: 'Connect via Settings → Cloud to sync your files to Google Drive.' },
    ],
  },
  {
    title: 'Accessibility',
    icon: <Eye size={14} strokeWidth={1.8} />,
    items: [
      { label: 'Voice Dictation', detail: 'Enable in Settings → Accessibility → Voice Input, then press Alt+Space to start/stop speaking.' },
      { label: 'Text-to-Speech', detail: 'Enable in Settings → Accessibility → Text-to-Speech, then press Ctrl+Shift+T to read aloud.' },
      { label: 'High Contrast', detail: 'Toggle in Settings → Accessibility for enhanced visual contrast.' },
      { label: 'Dyslexia Font', detail: 'Switch to OpenDyslexic font in Settings → Accessibility.' },
      { label: 'Reading Guide', detail: 'Enable a horizontal line that follows your cursor to help track lines of text.' },
      { label: 'Reduced Motion', detail: 'Disable animations for a calmer interface.' },
      { label: 'Colour Filters', detail: 'Apply protanopia, deuteranopia, or tritanopia colour correction filters.' },
    ],
  },
  {
    title: 'Music Player',
    icon: <Music size={14} strokeWidth={1.8} />,
    items: [
      { label: 'Open Player', detail: 'Click MUSIC in the menu bar to open the ambient music sidebar.' },
      { label: 'Controls', detail: 'Play/pause, skip tracks, and adjust volume. Music plays in the background while you write.' },
    ],
  },
  {
    title: 'Printing & Export',
    icon: <Printer size={14} strokeWidth={1.8} />,
    items: [
      { label: 'Print', detail: 'Press Ctrl+P or use FILE → Print Current Page to print your document.' },
      { label: 'PDF Export', detail: 'Use FILE → Export / Combine to generate a PDF of your document or entire project.' },
      { label: 'Plain Text', detail: 'Export as .txt for maximum compatibility with other editors.' },
    ],
  },
  {
    title: 'Security',
    icon: <BookOpen size={14} strokeWidth={1.8} />,
    items: [
      { label: 'PIN Lock', detail: 'Set up a 4 or 6 digit PIN in Settings → Security to lock Minstrel Codex when idle.' },
    ],
  },
];

export default function HelpPanel({ visible, onClose }: HelpPanelProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        width: '360px',
        height: '100%',
        background: 'var(--terminal-bg)',
        borderRight: '1px solid var(--terminal-border)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: uiFont,
        color: 'var(--terminal-text)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--terminal-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle size={16} strokeWidth={1.8} style={{ color: 'var(--terminal-accent)' }} />
          <span style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.04em' }}>
            HELP & REFERENCE
          </span>
        </div>
        <div
          onClick={onClose}
          style={{
            cursor: 'pointer',
            opacity: 0.5,
            padding: '4px',
            borderRadius: '4px',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
        >
          <X size={14} strokeWidth={2} />
        </div>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
        }}
      >
        {HELP_SECTIONS.map((section, si) => (
          <details
            key={si}
            open={si === 0 || si === 1}
            style={{ marginBottom: '6px' }}
          >
            <summary
              style={{
                cursor: 'pointer',
                padding: '10px 12px',
                background: 'var(--terminal-surface)',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.03em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                listStyle: 'none',
                userSelect: 'none',
                border: '1px solid var(--terminal-border)',
              }}
            >
              <span style={{ color: 'var(--terminal-accent)', display: 'flex', alignItems: 'center' }}>
                {section.icon}
              </span>
              {section.title}
            </summary>
            <div style={{ padding: '6px 8px 2px 8px' }}>
              {section.items.map((item, ii) => (
                <div
                  key={ii}
                  style={{
                    padding: '8px 10px',
                    marginBottom: '4px',
                    borderRadius: '8px',
                    background: 'transparent',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--terminal-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    fontSize: '11.5px',
                    fontWeight: '600',
                    marginBottom: '2px',
                    color: 'var(--terminal-accent)',
                    letterSpacing: '0.02em',
                  }}>
                    {item.label}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    opacity: 0.7,
                    lineHeight: 1.5,
                  }}>
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}

        {/* Footer note */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: '10px',
          background: 'var(--terminal-surface)',
          border: '1px solid var(--terminal-border)',
          fontSize: '10.5px',
          opacity: 0.6,
          lineHeight: 1.6,
          textAlign: 'center',
        }}>
          Minstrel Codex — a distraction-free writing environment.
          <br />
          This guide updates as new features are added.
        </div>
      </div>
    </div>
  );
}
