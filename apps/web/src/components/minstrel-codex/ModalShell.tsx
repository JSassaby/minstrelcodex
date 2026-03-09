import { ReactNode, useEffect, useRef } from 'react';

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

interface ModalShellProps {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
}

export default function ModalShell({ visible, title, children, onClose, width = '520px' }: ModalShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => containerRef.current?.focus(), 50);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 1999,
        }}
      />
      {/* Panel */}
      <div
        ref={containerRef}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--terminal-bg)',
          border: '1px solid var(--terminal-border)',
          padding: '0',
          width,
          maxWidth: '92vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 2000,
          color: 'var(--terminal-text)',
          fontFamily: uiFont,
          outline: 'none',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px 16px',
          borderBottom: '1px solid var(--terminal-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--terminal-surface)',
        }}>
          <div style={{
            fontSize: '15px',
            fontWeight: '700',
            fontFamily: uiFont,
            letterSpacing: '-0.01em',
          }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--terminal-border)',
              color: 'var(--terminal-text)',
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: uiFont,
              fontSize: '12px',
              opacity: 0.6,
              transition: 'opacity 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '20px 22px' }}>
          {children}
        </div>
      </div>
    </>
  );
}

interface ModalButtonProps {
  label: string;
  focused?: boolean;
  onClick: () => void;
  selected?: boolean;
  danger?: boolean;
}

export function ModalButton({ label, focused, onClick, selected, danger }: ModalButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focused) {
      ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focused]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{
        padding: '9px 20px',
        background: focused
          ? (danger ? '#e05c5c' : 'var(--terminal-accent)')
          : 'var(--terminal-surface)',
        color: focused ? 'var(--terminal-bg)' : (danger ? '#e05c5c' : 'var(--terminal-text)'),
        border: focused
          ? `1.5px solid ${danger ? '#e05c5c' : 'var(--terminal-accent)'}`
          : `1px solid ${danger ? 'rgba(224,92,92,0.4)' : 'var(--terminal-border)'}`,
        fontWeight: focused ? '600' : '500',
        cursor: 'pointer',
        fontFamily: uiFont,
        fontSize: '13px',
        transition: 'all 0.12s',
        opacity: focused ? 1 : 0.8,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = focused ? '1' : '0.8'; }}
    >
      {label}
    </button>
  );
}

export function ModalInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  maxLength,
  type = 'text',
  style: extraStyle,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
  type?: string;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      maxLength={maxLength}
      style={{
        width: '100%',
        background: 'var(--terminal-surface)',
        border: '1px solid var(--terminal-border)',
        color: 'var(--terminal-text)',
        padding: '10px 14px',
        fontFamily: uiFont,
        fontSize: '15px',
        outline: 'none',
        transition: 'border-color 0.15s',
        boxSizing: 'border-box',
        ...extraStyle,
      }}
      onFocus={e => (e.currentTarget.style.borderColor = 'var(--terminal-accent)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'var(--terminal-border)')}
    />
  );
}
