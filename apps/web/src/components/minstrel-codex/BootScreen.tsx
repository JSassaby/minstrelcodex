import { useEffect, useRef, useState } from 'react';
import { t } from '@/lib/languages';
import minstrelLogo from '@/assets/minstrel-logo-lockup.svg';

interface BootScreenProps {
  language: string;
  onComplete: () => void;
}

export default function BootScreen({ language, onComplete }: BootScreenProps) {
  const [lines, setLines] = useState<string[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  const bootMessages = [
    t(language, 'boot.bios'),
    t(language, 'boot.copyright'),
    '',
    t(language, 'boot.init'),
    t(language, 'boot.kernel'),
    t(language, 'boot.fs'),
    t(language, 'boot.processor'),
    t(language, 'boot.storage'),
    t(language, 'boot.network'),
    '',
    t(language, 'boot.ready'),
  ];

  useEffect(() => {
    // Pause on the logo/title for 2.5s before boot messages begin
    const pauseTimer = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < bootMessages.length) {
          setLines(prev => [...prev, bootMessages[i]]);
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => onComplete(), 500);
        }
      }, 100);
      // store for cleanup
      cleanupRef.current = () => clearInterval(interval);
    }, 2500);
    return () => {
      clearTimeout(pauseTimer);
      cleanupRef.current?.();
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--terminal-bg)',
        color: 'var(--terminal-text)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: 'var(--font-display)',
        fontSize: '18px',
      }}
    >
      <img
        src={minstrelLogo}
        alt="Minstrel"
        style={{
          width: '480px',
          maxWidth: '80vw',
          height: 'auto',
          objectFit: 'contain',
          marginBottom: '32px',
          filter: 'drop-shadow(0 0 12px var(--terminal-glow))',
        }}
      />
      <div>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              margin: '4px 0',
              opacity: 0,
              animation: 'fadeIn 0.3s forwards',
              animationDelay: `${i * 0.05}s`,
              minHeight: '1.2em',
            }}
          >
            {line || '\u00A0'}
          </div>
        ))}
      </div>
    </div>
  );
}
