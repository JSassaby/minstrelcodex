import { useState, useEffect, useRef } from 'react';

interface Props {
  onComplete: (title: string, chapterCount: number) => void;
  onSkip: () => void;
}

const uiFont = "'Space Grotesk', sans-serif";
const serifFont = "Georgia, 'Times New Roman', serif";

const CARD: React.CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  background: '#faf9f6',
  padding: '48px',
  boxShadow: '0 4px 40px rgba(0,0,0,0.55), 0 1px 6px rgba(0,0,0,0.35)',
  borderRadius: '2px',
  boxSizing: 'border-box',
};

const PRIMARY_BTN: React.CSSProperties = {
  background: '#00c47a',
  border: 'none',
  color: '#111',
  padding: '12px 28px',
  fontSize: '14px',
  fontWeight: '700',
  cursor: 'pointer',
  borderRadius: '3px',
  fontFamily: uiFont,
};

const SKIP_BTN: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: '12px',
  fontFamily: uiFont,
};

const UNDERLINE_INPUT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  border: 'none',
  borderBottom: '2px solid #d0cdc8',
  background: 'transparent',
  outline: 'none',
  fontFamily: serifFont,
  fontSize: '22px',
  color: '#1a1a1a',
  padding: '8px 0',
  marginBottom: '40px',
};

export default function FirstBootWizard({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [chapterInput, setChapterInput] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const chapterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) titleRef.current?.focus();
    else setTimeout(() => chapterRef.current?.focus(), 0);
  }, [step]);

  const goStep2 = () => {
    if (!title.trim()) { titleRef.current?.focus(); return; }
    setStep(2);
  };

  const handleCreate = () => {
    const raw = parseInt(chapterInput, 10);
    const count = isNaN(raw) || raw < 1 ? 1 : Math.min(raw, 100);
    onComplete(title.trim(), count);
  };

  // Enter to advance in step 1 (captured globally so it works anywhere on the card)
  useEffect(() => {
    if (step !== 1) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement !== chapterRef.current) {
        e.preventDefault();
        goStep2();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, title]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#1c1c1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 9000,
      }}
    >
      <div style={CARD}>
        {/* Branding + step indicator */}
        <div style={{ fontFamily: uiFont, fontSize: '11px', fontWeight: '600', letterSpacing: '0.15em', color: '#00c47a', marginBottom: '32px', textTransform: 'uppercase' }}>
          Minstrel Codex · {step} of 2
        </div>

        {step === 1 ? (
          <>
            <div style={{ fontFamily: serifFont, fontSize: '26px', fontWeight: '400', color: '#1a1a1a', marginBottom: '6px' }}>
              What are you writing?
            </div>
            <div style={{ fontFamily: uiFont, fontSize: '13px', color: '#999', marginBottom: '32px' }}>
              Give your novel a name.
            </div>

            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="My Novel"
              style={UNDERLINE_INPUT}
              onKeyDown={e => { if (e.key === 'Enter') goStep2(); }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={goStep2} style={PRIMARY_BTN}>Next →</button>
              <button onClick={onSkip} style={SKIP_BTN}>Skip — take me to the editor →</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: serifFont, fontSize: '26px', fontWeight: '400', color: '#1a1a1a', marginBottom: '6px' }}>
              Set up your chapters
            </div>
            <div style={{ fontFamily: uiFont, fontSize: '13px', color: '#999', marginBottom: '4px' }}>
              How many chapters are you planning?
            </div>
            <div style={{ fontFamily: uiFont, fontSize: '12px', color: '#bbb', marginBottom: '28px' }}>
              We'll create them for you. You can always add more.
            </div>

            <input
              ref={chapterRef}
              type="number"
              value={chapterInput}
              onChange={e => setChapterInput(e.target.value)}
              placeholder="e.g. 24"
              min={1}
              max={100}
              style={{ ...UNDERLINE_INPUT, width: '160px' }}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={handleCreate} style={PRIMARY_BTN}>Create my novel →</button>
              <button onClick={onSkip} style={SKIP_BTN}>Skip — start with a blank page →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
