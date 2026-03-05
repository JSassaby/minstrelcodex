import { useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Repeat, Plus, Trash2, Music } from 'lucide-react';
import type { MusicTrack } from '@/hooks/useMusicPlayer';

interface MusicPlayerProps {
  visible: boolean;
  tracks: MusicTrack[];
  currentTrackId: string | null;
  playing: boolean;
  volume: number;
  loop: boolean;
  onPlay: (trackId: string) => void;
  onTogglePlayPause: () => void;
  onSetVolume: (v: number) => void;
  onSetLoop: (v: boolean) => void;
  onAddFile: (file: File) => void;
  onRemoveTrack: (trackId: string) => void;
  onClose: () => void;
}

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

const CATEGORY_LABELS: Record<string, string> = {
  ambient: '🎧 Ambient Noise',
  focus: '🎵 Focus Music',
  nature: '🌿 Nature Sounds',
  user: '📁 My Library',
};

const CATEGORY_ORDER = ['ambient', 'focus', 'nature', 'user'];

export default function MusicPlayer({
  visible, tracks, currentTrackId, playing, volume, loop,
  onPlay, onTogglePlayPause, onSetVolume, onSetLoop, onAddFile, onRemoveTrack, onClose,
}: MusicPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!visible) return null;

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = tracks.filter(t => t.category === cat);
    if (items.length > 0 || cat === 'user') acc[cat] = items;
    return acc;
  }, {} as Record<string, MusicTrack[]>);

  const currentTrack = tracks.find(t => t.id === currentTrackId);

  return (
    <div
      style={{
        width: '340px',
        minWidth: '340px',
        height: '100%',
        background: 'var(--terminal-bg)',
        borderRight: '1px solid var(--terminal-border)',
        color: 'var(--terminal-text)',
        fontFamily: uiFont,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        background: 'var(--terminal-surface)',
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: uiFont, opacity: 0.65, display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Music size={13} strokeWidth={1.8} /> Focus Music
        </span>
        <button
          onClick={onClose}
          title="Close"
          style={{
            background: 'transparent',
            border: '1px solid var(--terminal-border)',
            borderRadius: '6px',
            color: 'var(--terminal-text)',
            opacity: 0.45,
            cursor: 'pointer',
            width: '22px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            lineHeight: 1,
            fontFamily: uiFont,
            transition: 'opacity 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-accent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.45'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-border)'; }}
        >
          ✕
        </button>
      </div>

      {/* Now playing bar */}
      {currentTrack && (
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--terminal-border)',
          background: 'var(--terminal-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0,
        }}>
          <button
            onClick={onTogglePlayPause}
            style={{
              background: 'var(--terminal-accent)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--terminal-bg)',
              flexShrink: 0,
            }}
          >
            {playing ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.name}
            </div>
            <div style={{ fontSize: '10px', opacity: 0.5 }}>
              {playing ? 'Playing' : 'Paused'}
            </div>
          </div>
          <button
            onClick={() => onSetLoop(!loop)}
            title={loop ? 'Loop: On' : 'Loop: Off'}
            style={{
              background: 'transparent',
              border: '1px solid var(--terminal-border)',
              borderRadius: '6px',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: loop ? 'var(--terminal-accent)' : 'var(--terminal-text)',
              opacity: loop ? 1 : 0.4,
              transition: 'all 0.15s',
            }}
          >
            <Repeat size={12} />
          </button>
        </div>
      )}

      {/* Volume control */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
      }}>
        <button
          onClick={() => onSetVolume(volume > 0 ? 0 : 0.5)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--terminal-text)',
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            padding: 0,
          }}
        >
          {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={e => onSetVolume(parseFloat(e.target.value))}
          style={{
            flex: 1,
            height: '4px',
            accentColor: 'var(--terminal-accent)',
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: '10px', opacity: 0.5, width: '28px', textAlign: 'right' }}>
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* Track list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {CATEGORY_ORDER.map(cat => {
          const items = grouped[cat];
          if (!items) return null;
          return (
            <div key={cat} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.45, padding: '4px 8px', marginBottom: '4px' }}>
                {CATEGORY_LABELS[cat]}
              </div>
              {items.length === 0 && cat === 'user' && (
                <div style={{ fontSize: '11px', opacity: 0.35, padding: '8px', fontStyle: 'italic' }}>
                  No custom tracks yet. Click + to add.
                </div>
              )}
              {items.map(track => {
                const isActive = track.id === currentTrackId;
                const isPlaying = isActive && playing;
                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      if (isActive) onTogglePlayPause();
                      else onPlay(track.id);
                    }}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: isActive ? 'var(--terminal-surface)' : 'transparent',
                      border: isActive ? '1px solid var(--terminal-accent)' : '1px solid transparent',
                      transition: 'all 0.12s',
                      marginBottom: '2px',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--terminal-surface)';
                    }}
                    onMouseLeave={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <span style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: isActive ? 'var(--terminal-accent)' : 'var(--terminal-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: isActive ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                      transition: 'all 0.15s',
                    }}>
                      {isPlaying ? <Pause size={10} /> : <Play size={10} style={{ marginLeft: '1px' }} />}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: '13px',
                      fontWeight: isActive ? '600' : '400',
                      color: isActive ? 'var(--terminal-accent)' : 'var(--terminal-text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {track.name}
                    </span>
                    {track.category === 'user' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTrack(track.id);
                        }}
                        title="Remove"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--terminal-text)',
                          opacity: 0.3,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.3'; }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Add track button */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--terminal-border)',
        flexShrink: 0,
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onAddFile(file);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px dashed var(--terminal-border)',
            background: 'transparent',
            color: 'var(--terminal-text)',
            opacity: 0.6,
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: uiFont,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.opacity = '1';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-accent)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.opacity = '0.6';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-border)';
          }}
        >
          <Plus size={14} /> Add Music File
        </button>
      </div>
    </div>
  );
}
