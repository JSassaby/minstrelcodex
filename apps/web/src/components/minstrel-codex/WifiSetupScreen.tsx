import { useState, useEffect, useRef, useCallback } from 'react';

interface WifiNetwork {
  ssid: string;
  signal: number;
  secured: boolean;
}

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

const API = 'http://localhost:3001';

const uiFont = "'Space Grotesk', sans-serif";
const serifFont = "Georgia, 'Times New Roman', serif";

const CARD: React.CSSProperties = {
  width: '100%',
  maxWidth: '480px',
  background: '#faf9f6',
  padding: '48px',
  boxSizing: 'border-box',
};

function SignalBars({ signal }: { signal: number }) {
  const bars = signal > -55 ? 4 : signal > -65 ? 3 : signal > -75 ? 2 : signal > -85 ? 1 : 0;
  return (
    <span style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '16px' }}>
      {[0, 1, 2, 3].map(i => (
        <span
          key={i}
          style={{
            width: '4px',
            height: `${5 + i * 3}px`,
            background: i < bars ? '#2a2a2a' : '#d0cdc8',
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  );
}

export default function WifiSetupScreen({ onComplete, onSkip }: Props) {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [password, setPassword] = useState('');
  const [connectState, setConnectState] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [connectError, setConnectError] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);

  const scan = useCallback(async () => {
    setScanning(true);
    setNetworks([]);
    try {
      const res = await fetch(`${API}/wifi/scan`);
      const data: WifiNetwork[] = await res.json();
      // Sort by signal strength descending
      setNetworks(data.sort((a, b) => b.signal - a.signal));
      setSelectedIdx(0);
    } catch {
      setNetworks([]);
    }
    setScanning(false);
  }, []);

  useEffect(() => { scan(); }, [scan]);

  const selectedNetwork = networks[selectedIdx] ?? null;

  const connect = useCallback(async () => {
    if (!selectedNetwork) return;
    setConnectState('connecting');
    setConnectError('');
    try {
      const body: Record<string, string> = { ssid: selectedNetwork.ssid };
      if (selectedNetwork.secured) body.password = password;
      const res = await fetch(`${API}/wifi/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setConnectState('success');
        setTimeout(() => onComplete(), 1000);
      } else {
        setConnectState('error');
        setConnectError(data.error || 'Connection failed');
      }
    } catch {
      setConnectState('error');
      setConnectError("Couldn't reach network API");
    }
  }, [selectedNetwork, password, onComplete]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (connectState === 'connecting' || connectState === 'success') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(prev => Math.min(prev + 1, networks.length - 1));
        setPassword(''); setConnectState('idle');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(prev => Math.max(prev - 1, 0));
        setPassword(''); setConnectState('idle');
      } else if (e.key === 'Enter') {
        if (document.activeElement === passwordRef.current) {
          connect();
        } else if (selectedNetwork && selectedNetwork.secured) {
          passwordRef.current?.focus();
        } else if (selectedNetwork) {
          connect();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [networks, selectedNetwork, connect, connectState]);

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
        {/* Branding */}
        <div style={{ fontFamily: uiFont, fontSize: '11px', fontWeight: '600', letterSpacing: '0.15em', color: '#00c47a', marginBottom: '32px', textTransform: 'uppercase' }}>
          Minstrel Codex
        </div>

        {/* Heading */}
        <div style={{ fontFamily: serifFont, fontSize: '26px', fontWeight: '400', color: '#1a1a1a', marginBottom: '6px' }}>
          Let's get connected
        </div>
        <div style={{ fontFamily: uiFont, fontSize: '13px', color: '#999', marginBottom: '28px' }}>
          Select your Wi-Fi network to get started
        </div>

        {/* Network list */}
        {scanning ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#aaa', fontSize: '14px', fontFamily: uiFont }}>
            Scanning for networks...
          </div>
        ) : networks.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: uiFont }}>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '12px' }}>No networks found.</div>
            <button onClick={scan} style={{ background: 'none', border: 'none', color: '#00c47a', cursor: 'pointer', fontSize: '13px', fontFamily: uiFont, textDecoration: 'underline' }}>
              Retry
            </button>
          </div>
        ) : (
          <div style={{ border: '1px solid #e0ddd8', overflow: 'hidden', marginBottom: '8px' }}>
            {networks.map((net, i) => {
              const isSelected = i === selectedIdx;
              return (
                <div key={net.ssid}>
                  {/* Network row */}
                  <div
                    onClick={() => { setSelectedIdx(i); setPassword(''); setConnectState('idle'); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '11px 14px',
                      background: isSelected ? '#1a1a1a' : '#faf9f6',
                      color: isSelected ? '#f0f0ee' : '#2a2a2a',
                      cursor: 'pointer',
                      borderBottom: '1px solid #e8e5e0',
                    }}
                  >
                    <SignalBars signal={net.signal} />
                    <span style={{ flex: 1, fontSize: '14px', fontFamily: uiFont }}>{net.ssid}</span>
                    {net.secured && <span style={{ fontSize: '11px', opacity: 0.5 }}>🔒</span>}
                  </div>

                  {/* Inline panel for selected network */}
                  {isSelected && connectState !== 'success' && (
                    <div style={{ background: '#f0ede8', padding: '12px 14px', borderBottom: '1px solid #e8e5e0' }}>
                      {connectState === 'error' && (
                        <div style={{ fontFamily: uiFont, fontSize: '12px', color: '#c0392b', marginBottom: '8px' }}>
                          Couldn't connect — {connectError || 'check your password'}
                        </div>
                      )}
                      {connectState === 'connecting' ? (
                        <div style={{ fontFamily: uiFont, fontSize: '13px', color: '#555' }}>
                          Connecting to {net.ssid}...
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {net.secured && (
                            <input
                              ref={passwordRef}
                              type="password"
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="Password"
                              autoFocus
                              style={{
                                flex: 1, background: '#fff', border: '1px solid #d0cdc8',
                                padding: '8px 12px', fontSize: '14px', outline: 'none',
                                fontFamily: uiFont, color: '#1a1a1a',
                              }}
                              onKeyDown={e => { if (e.key === 'Enter') connect(); }}
                            />
                          )}
                          <button
                            onClick={connect}
                            style={{
                              background: '#00c47a', border: 'none', color: '#111',
                              padding: '8px 18px', fontSize: '13px', fontWeight: '700',
                              cursor: 'pointer', fontFamily: uiFont,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Connect
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {isSelected && connectState === 'success' && (
                    <div style={{ background: '#f0ede8', padding: '10px 14px', borderBottom: '1px solid #e8e5e0' }}>
                      <span style={{ fontFamily: uiFont, fontSize: '13px', color: '#00c47a', fontWeight: '600' }}>Connected ✓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Rescan */}
        {!scanning && networks.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <button
              onClick={() => { setPassword(''); setConnectState('idle'); scan(); }}
              style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '12px', fontFamily: uiFont, padding: 0 }}
            >
              ↻ Rescan
            </button>
          </div>
        )}

        {/* Skip */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onSkip}
            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '12px', fontFamily: uiFont }}
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}
