import { Wifi, BatteryMedium, BatteryLow, BatteryFull, BatteryWarning, Music } from 'lucide-react';
import { t } from '@/lib/languages';

interface StatusBarProps {
  language: string;
  filename: string;
  saved: boolean;
  content: string;
  battery: number;
  wifiOn: boolean;
  musicPlaying?: boolean;
  musicTrackName?: string;
  onMusicClick?: () => void;
}

function BatteryIcon({ level }: { level: number }) {
  const color = level < 20 ? '#e05c5c' : level < 40 ? '#f5c542' : 'var(--terminal-accent)';
  if (level < 15) return <BatteryWarning size={12} color={color} strokeWidth={1.6} />;
  if (level < 30) return <BatteryLow size={12} color={color} strokeWidth={1.6} />;
  if (level < 75) return <BatteryMedium size={12} color={color} strokeWidth={1.6} />;
  return <BatteryFull size={12} color={color} strokeWidth={1.6} />;
}

export default function StatusBar({ language, filename, saved, content, battery, wifiOn, musicPlaying, musicTrackName, onMusicClick }: StatusBarProps) {
  const displayName = filename ? (filename.split('/').pop() || filename) : t(language, 'status.untitled');
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;
  const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

  return (
    <div
      style={{
        backgroundColor: 'var(--terminal-bg)',
        borderTop: '1px solid var(--terminal-border)',
        padding: '4px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '10px',
        fontFamily: uiFont,
        letterSpacing: '0.03em',
        color: 'var(--terminal-text)',
        opacity: 0.6,
        flexShrink: 0,
      }}
    >
      {/* Left — file info */}
      <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
        <span style={{ fontWeight: '500', opacity: 0.9 }}>
          {displayName}{!saved ? ' ·' : ''}
        </span>
        <span>{words.toLocaleString()} {t(language, 'status.words')}</span>
        <span>{chars.toLocaleString()} {t(language, 'status.chars')}</span>
      </div>

      {/* Right — system indicators */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {musicPlaying && (
          <span
            onClick={onMusicClick}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: 0.8 }}
            title={musicTrackName || 'Music playing'}
          >
            <Music size={11} strokeWidth={1.6} color="var(--terminal-accent)" />
          </span>
        )}
        {wifiOn && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Wifi size={11} strokeWidth={1.6} style={{ opacity: 0.8 }} />
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <BatteryIcon level={battery} />
          <span>{battery}%</span>
        </span>
      </div>
    </div>
  );
}
