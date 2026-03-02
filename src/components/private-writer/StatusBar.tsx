import { Wifi, BatteryMedium, BatteryLow, BatteryFull, BatteryWarning, Music, Mic, Volume2, Eye, Type, Minimize2, BookOpen } from 'lucide-react';
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
  voiceListening?: boolean;
  ttsActive?: boolean;
  a11yVoiceEnabled?: boolean;
  a11yTtsEnabled?: boolean;
  a11yHighContrast?: boolean;
  a11yDyslexiaFont?: boolean;
  a11yReducedMotion?: boolean;
  a11yReadingGuide?: boolean;
  onVoiceClick?: () => void;
}

function BatteryIcon({ level }: { level: number }) {
  const color = level < 20 ? '#e05c5c' : level < 40 ? '#f5c542' : 'var(--terminal-accent)';
  if (level < 15) return <BatteryWarning size={12} color={color} strokeWidth={1.6} />;
  if (level < 30) return <BatteryLow size={12} color={color} strokeWidth={1.6} />;
  if (level < 75) return <BatteryMedium size={12} color={color} strokeWidth={1.6} />;
  return <BatteryFull size={12} color={color} strokeWidth={1.6} />;
}

function A11yIndicator({ icon: Icon, label, enabled, pulse, onClick }: {
  icon: any; label: string; enabled: boolean; pulse?: boolean; onClick?: () => void;
}) {
  if (!enabled) return null;
  return (
    <span
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: '3px',
        cursor: onClick ? 'pointer' : 'default',
        opacity: pulse ? 0.95 : 0.6,
        animation: pulse ? 'a11y-pulse 1.5s ease-in-out infinite' : undefined,
      }}
    >
      <Icon size={11} strokeWidth={1.6} color="var(--terminal-accent)" />
    </span>
  );
}

export default function StatusBar({
  language, filename, saved, content, battery, wifiOn,
  musicPlaying, musicTrackName, onMusicClick,
  voiceListening, ttsActive,
  a11yVoiceEnabled, a11yTtsEnabled,
  a11yHighContrast, a11yDyslexiaFont, a11yReducedMotion, a11yReadingGuide,
  onVoiceClick,
}: StatusBarProps) {
  const displayName = filename ? (filename.split('/').pop() || filename) : t(language, 'status.untitled');
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;
  const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

  const hasA11yFeatures = a11yVoiceEnabled || a11yTtsEnabled || a11yHighContrast || a11yDyslexiaFont || a11yReducedMotion || a11yReadingGuide;

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

      {/* Right — system + a11y indicators */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {/* Accessibility indicators */}
        <A11yIndicator icon={Mic} label={voiceListening ? 'Voice dictation active' : 'Voice dictation enabled'} enabled={!!a11yVoiceEnabled} pulse={!!voiceListening} onClick={onVoiceClick} />
        <A11yIndicator icon={Volume2} label={ttsActive ? 'Text-to-speech active' : 'Text-to-speech enabled'} enabled={!!a11yTtsEnabled} pulse={!!ttsActive} />
        <A11yIndicator icon={Eye} label="High contrast enabled" enabled={!!a11yHighContrast} />
        <A11yIndicator icon={Type} label="Dyslexia font enabled" enabled={!!a11yDyslexiaFont} />
        <A11yIndicator icon={Minimize2} label="Reduced motion enabled" enabled={!!a11yReducedMotion} />
        <A11yIndicator icon={BookOpen} label="Reading guide enabled" enabled={!!a11yReadingGuide} />

        {/* Separator when a11y features are active */}
        {hasA11yFeatures && (
          <span style={{ width: '1px', height: '10px', background: 'var(--terminal-border)', opacity: 0.5 }} />
        )}

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
