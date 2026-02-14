import { ReactNode } from 'react';

interface ModalShellProps {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export default function ModalShell({ visible, title, children, onClose }: ModalShellProps) {
  if (!visible) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1999,
        }}
      />
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--terminal-bg)',
          border: '2px solid var(--terminal-text)',
          padding: '24px',
          minWidth: '400px',
          maxWidth: '600px',
          maxHeight: '70vh',
          overflowY: 'auto',
          zIndex: 2000,
          boxShadow: '0 0 30px var(--terminal-glow)',
          color: 'var(--terminal-text)',
          fontFamily: "'Courier Prime', 'Courier New', monospace",
        }}
      >
        <div
          style={{
            fontSize: '20px',
            marginBottom: '16px',
            textAlign: 'center',
            borderBottom: '1px solid var(--terminal-text)',
            paddingBottom: '8px',
          }}
        >
          {title}
        </div>
        {children}
      </div>
    </>
  );
}

interface ModalButtonProps {
  label: string;
  focused?: boolean;
  onClick: () => void;
  selected?: boolean;
}

export function ModalButton({ label, focused, onClick, selected }: ModalButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 24px',
        background: focused ? 'var(--terminal-text)' : 'var(--terminal-bg)',
        color: focused ? 'var(--terminal-bg)' : 'var(--terminal-text)',
        border: selected ? '2px solid var(--terminal-text)' : '1px solid var(--terminal-text)',
        fontWeight: selected ? 'bold' : 'normal',
        cursor: 'pointer',
        fontFamily: "'Courier Prime', 'Courier New', monospace",
        fontSize: '14px',
      }}
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
        background: 'var(--terminal-bg)',
        border: '1px solid var(--terminal-text)',
        color: 'var(--terminal-text)',
        padding: '8px',
        fontFamily: "'Courier Prime', 'Courier New', monospace",
        fontSize: '16px',
        outline: 'none',
        ...extraStyle,
      }}
    />
  );
}
