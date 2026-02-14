import { t } from '@/lib/languages';

interface StatusBarProps {
  language: string;
  filename: string;
  saved: boolean;
  content: string;
  battery: number;
  wifiOn: boolean;
}

export default function StatusBar({ language, filename, saved, content, battery, wifiOn }: StatusBarProps) {
  const displayName = filename || t(language, 'status.untitled');
  const unsaved = saved ? '' : ' *';
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;

  return (
    <div
      style={{
        backgroundColor: 'var(--terminal-bg)',
        borderTop: '1px solid var(--terminal-text)',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        fontFamily: "'VT323', 'Courier New', monospace",
        letterSpacing: '1px',
        color: 'var(--terminal-text)',
      }}
    >
      <div style={{ display: 'flex', gap: '24px' }}>
        <span>{displayName}{unsaved}</span>
        <span>{words} {t(language, 'status.words')}</span>
        <span>{chars} {t(language, 'status.chars')}</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {wifiOn && <span title="Wi-Fi">◢◣</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{t(language, 'status.battery')}</span>
          <div
            style={{
              display: 'inline-block',
              width: '24px',
              height: '12px',
              border: '2px solid var(--terminal-text)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '2px',
                top: '2px',
                height: 'calc(100% - 4px)',
                width: `${battery}%`,
                background: 'var(--terminal-text)',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <span>{battery}%</span>
        </div>
      </div>
    </div>
  );
}
