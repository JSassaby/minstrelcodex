import { useEffect, useState } from 'react';
import { t } from '@/lib/languages';
import minstrelLogo from '@/assets/minstrel-logo.png';

interface BootScreenProps {
  language: string;
  onComplete: () => void;
}

export default function BootScreen({ language, onComplete }: BootScreenProps) {
  const [lines, setLines] = useState<string[]>([]);

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
    return () => clearInterval(interval);
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
      <div
        style={{
          fontSize: '32px',
          marginBottom: '20px',
          textShadow: '0 0 10px var(--terminal-glow)',
        }}
      >
        PRIVATE WRITER SYSTEM
      </div>
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
