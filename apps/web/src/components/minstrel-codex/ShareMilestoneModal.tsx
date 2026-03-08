import { useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import ShareableCard, { type ShareableCardData } from './ShareableCard';

interface ShareMilestoneModalProps {
  visible: boolean;
  data: ShareableCardData;
  onClose: () => void;
}

export default function ShareMilestoneModal({ visible, data, onClose }: ShareMilestoneModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const captureCard = useCallback(async () => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
    });
    return canvas;
  }, []);

  const handleDownload = useCallback(async () => {
    setSaving(true);
    try {
      const canvas = await captureCard();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `minstrel-${data.type}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setSaving(false);
    }
  }, [captureCard, data.type]);

  const handleCopy = useCallback(async () => {
    setSaving(true);
    try {
      const canvas = await captureCard();
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
        } catch {
          // Fallback: download instead
          const link = document.createElement('a');
          link.download = `minstrel-${data.type}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      }, 'image/png');
    } finally {
      setSaving(false);
    }
  }, [captureCard, data.type]);

  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      handleDownload();
      return;
    }
    setSaving(true);
    try {
      const canvas = await captureCard();
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `minstrel-${data.type}.png`, { type: 'image/png' });
        try {
          await navigator.share({
            title: 'Minstrel Codex',
            text: `Check out my writing milestone!`,
            files: [file],
          });
        } catch {
          // User cancelled share
        }
      }, 'image/png');
    } finally {
      setSaving(false);
    }
  }, [captureCard, data.type, handleDownload]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.9)',
        fontFamily: "var(--font-ui, 'Space Grotesk', sans-serif)",
        color: 'var(--terminal-text)',
      }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        {/* Card preview */}
        <div style={{
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 0 40px rgba(99, 179, 237, 0.1)',
        }}>
          <ShareableCard ref={cardRef} data={data} />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <ActionButton onClick={handleDownload} disabled={saving} label="↓ DOWNLOAD" />
          <ActionButton onClick={handleCopy} disabled={saving} label="⧉ COPY" />
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <ActionButton onClick={handleShare} disabled={saving} label="⇗ SHARE" />
          )}
          <ActionButton onClick={onClose} disabled={false} label="✕ CLOSE" secondary />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ onClick, disabled, label, secondary }: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 20px',
        border: `1px solid ${secondary ? 'var(--terminal-border)' : 'var(--terminal-text)'}`,
        background: 'transparent',
        color: secondary ? 'var(--terminal-muted, var(--terminal-text))' : 'var(--terminal-text)',
        cursor: disabled ? 'wait' : 'pointer',
        fontFamily: 'inherit',
        fontSize: '12px',
        letterSpacing: '0.1em',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.2s, color 0.2s',
      }}
      onMouseEnter={e => {
        if (!disabled && !secondary) {
          e.currentTarget.style.background = 'var(--terminal-accent)';
          e.currentTarget.style.color = 'var(--terminal-bg)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = secondary ? 'var(--terminal-muted, var(--terminal-text))' : 'var(--terminal-text)';
      }}
    >
      {label}
    </button>
  );
}
