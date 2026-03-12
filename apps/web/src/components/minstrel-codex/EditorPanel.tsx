import { useState, useEffect, useCallback } from 'react';
import { DESIGN_TOKENS as DT } from '@minstrelcodex/core';
import {
  consultEditor,
  getActiveProvider,
  getProviderKey,
  getActiveModel,
  getOllamaModel,
  PROVIDERS,
} from '@/lib/editorProviders';
import type { EditorialFeedback, EditorialContext } from '@/lib/editorProviders';

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

interface EditorPanelProps {
  visible: boolean;
  text: string;
  scope: 'selection' | 'scene' | 'document';
  onClose: () => void;
  onOpenProviders: () => void;
}

type Phase = 'setup' | 'loading' | 'feedback' | 'error';

function wordCount(text: string): number {
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain ? plain.split(' ').filter(w => w.length > 0).length : 0;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '10px', fontFamily: uiFont, fontWeight: 600,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: '#4ecdc4', marginBottom: '8px', marginTop: '20px',
    }}>
      {children}
    </div>
  );
}

function CollapsibleSection({ title, icon = '◈', children, defaultOpen = true }: {
  title: string; icon?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
          background: 'transparent', border: 'none', padding: '0 0 6px 0',
          cursor: 'pointer', textAlign: 'left',
          borderBottom: '1px solid #1a2540',
        }}
      >
        <span style={{ color: '#4ecdc4', fontSize: '10px' }}>{icon}</span>
        <span style={{
          fontSize: '10px', fontFamily: uiFont, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4ecdc4', flex: 1,
        }}>{title}</span>
        <span style={{ color: '#555', fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ paddingTop: '10px' }}>{children}</div>}
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '13px', fontFamily: uiFont, color: '#c8c8c8',
      lineHeight: 1.65, margin: '0 0 8px 0',
    }}>{children}</p>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: '13px', fontFamily: uiFont, color: '#c8c8c8', lineHeight: 1.6, marginBottom: '4px' }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function hasProviderKey(): boolean {
  const provider = getActiveProvider();
  if (provider === 'ollama') return !!getOllamaModel();
  return !!getProviderKey(provider);
}

export default function EditorPanel({ visible, text, scope, onClose, onOpenProviders }: EditorPanelProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [feedback, setFeedback] = useState<EditorialFeedback | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [includeRewrite, setIncludeRewrite] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [context, setContext] = useState<EditorialContext>({});
  const [copied, setCopied] = useState(false);

  // Reset phase when panel opens with new text
  useEffect(() => {
    if (visible) {
      setPhase('setup');
      setFeedback(null);
      setErrorMsg('');
      setIncludeRewrite(false);
    }
  }, [visible, text]);

  // Load project settings context
  useEffect(() => {
    if (!visible) return;
    try {
      const projectKey = Object.keys(localStorage).find(k => k.startsWith('minstrel-project-settings:'));
      if (projectKey) {
        const settings = JSON.parse(localStorage.getItem(projectKey) || '{}');
        setContext(prev => ({
          genre: settings.genre || prev.genre || '',
          audience: settings.audience || prev.audience || '',
          premise: settings.premise || prev.premise || '',
          scenePurpose: prev.scenePurpose || '',
          povCharacter: prev.povCharacter || '',
          emotionalGoal: prev.emotionalGoal || '',
          specificConcerns: prev.specificConcerns || '',
        }));
      }
    } catch {
      // silent
    }
  }, [visible]);

  // ESC to close
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  const handleRequest = useCallback(async () => {
    if (!hasProviderKey()) { onOpenProviders(); return; }
    setPhase('loading');
    try {
      const result = await consultEditor({
        text: stripHtml(text),
        context,
        includeRewrite,
        scope,
      });
      setFeedback(result);
      setPhase('feedback');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }, [text, context, includeRewrite, scope, onOpenProviders]);

  const handleCopy = useCallback(() => {
    if (!feedback) return;
    const lines: string[] = [];
    lines.push('EDITORIAL FEEDBACK');
    lines.push('');
    lines.push('STRENGTHS');
    (feedback.strengths ?? []).forEach(s => lines.push('• ' + s));
    lines.push('');
    lines.push('CLARITY & LANGUAGE');
    lines.push(feedback.clarity?.observation ?? '');
    (feedback.clarity?.suggestions ?? []).forEach(s => lines.push('• ' + s));
    lines.push('');
    lines.push('PACING & TENSION');
    lines.push(feedback.pacing?.observation ?? '');
    (feedback.pacing?.suggestions ?? []).forEach(s => lines.push('• ' + s));
    if (feedback.dialogue) {
      lines.push('');
      lines.push('DIALOGUE');
      lines.push(feedback.dialogue?.observation ?? '');
      (feedback.dialogue?.suggestions ?? []).forEach(s => lines.push('• ' + s));
    }
    lines.push('');
    lines.push('CHARACTER & CONSISTENCY');
    lines.push(feedback.character?.observation ?? '');
    (feedback.character?.suggestions ?? []).forEach(s => lines.push('• ' + s));
    lines.push('');
    lines.push('EMOTIONAL IMPACT');
    lines.push(feedback.emotionalImpact?.observation ?? '');
    (feedback.emotionalImpact?.suggestions ?? []).forEach(s => lines.push('• ' + s));
    lines.push('');
    lines.push('NARRATIVE PURPOSE');
    lines.push(feedback.narrativePurpose?.observation ?? '');
    (feedback.narrativePurpose?.suggestions ?? []).forEach(s => lines.push('• ' + s));
    lines.push('');
    lines.push('TOP SUGGESTIONS');
    (feedback.topSuggestions ?? []).forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    if (feedback.rewrite) {
      lines.push('');
      lines.push('EXAMPLE REWRITE');
      lines.push(feedback.rewrite);
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [feedback]);

  if (!visible) return null;

  const provider = getActiveProvider();
  const providerLabel = PROVIDERS[provider].label;
  const model = provider === 'ollama' ? getOllamaModel() : getActiveModel(provider);
  const scopeLabel = scope === 'selection' ? 'Selection' : scope === 'scene' ? 'Scene' : 'Document';
  const plainText = stripHtml(text);
  const words = wordCount(text);
  const preview = plainText.slice(0, 200) + (plainText.length > 200 ? '…' : '');

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0a0f1a', border: '1px solid #2a3550',
    borderRadius: 0, color: '#c8c8c8', fontFamily: uiFont, fontSize: '12px',
    padding: '7px 10px', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: DT.Z_INDEX.modal - 2,
      pointerEvents: 'none',
    }}>
      <div
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: '340px',
          background: '#0a0a0a',
          borderLeft: '1px solid #1a2540',
          display: 'flex', flexDirection: 'column',
          pointerEvents: 'all',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #1a2540',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: '#0d1117',
        }}>
          <div>
            <div style={{
              fontSize: '10px', fontFamily: uiFont, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4ecdc4',
            }}>✦ The Editor's Counsel</div>
            <div style={{ fontSize: '11px', fontFamily: uiFont, color: '#555', marginTop: '2px' }}>
              {scopeLabel}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '4px 6px', fontFamily: uiFont }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c8c8c8'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#555'; }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

          {/* ── SETUP PHASE ── */}
          {(phase === 'setup' || phase === 'loading') && (
            <>
              {/* Context */}
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => setContextOpen(p => !p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                    background: 'transparent', border: '1px solid #1a2540',
                    padding: '8px 12px', cursor: 'pointer', color: '#888',
                    fontFamily: uiFont, fontSize: '11px', letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span style={{ flex: 1, textAlign: 'left' }}>Context (optional)</span>
                  <span>{contextOpen ? '▲' : '▼'}</span>
                </button>
                {contextOpen && (
                  <div style={{ border: '1px solid #1a2540', borderTop: 'none', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {context.genre && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        {context.genre && <span style={{ background: '#0d1117', border: '1px solid #1a2540', padding: '2px 8px', fontSize: '11px', color: '#888', fontFamily: uiFont }}>{context.genre}</span>}
                        {context.audience && <span style={{ background: '#0d1117', border: '1px solid #1a2540', padding: '2px 8px', fontSize: '11px', color: '#888', fontFamily: uiFont }}>{context.audience}</span>}
                      </div>
                    )}
                    <input
                      style={inputStyle}
                      placeholder="What is this scene trying to achieve?"
                      value={context.scenePurpose ?? ''}
                      onChange={e => setContext(p => ({ ...p, scenePurpose: e.target.value }))}
                    />
                    <input
                      style={inputStyle}
                      placeholder="Whose perspective?"
                      value={context.povCharacter ?? ''}
                      onChange={e => setContext(p => ({ ...p, povCharacter: e.target.value }))}
                    />
                    <input
                      style={inputStyle}
                      placeholder="How should the reader feel after this scene?"
                      value={context.emotionalGoal ?? ''}
                      onChange={e => setContext(p => ({ ...p, emotionalGoal: e.target.value }))}
                    />
                    <input
                      style={inputStyle}
                      placeholder="Anything specific you want feedback on?"
                      value={context.specificConcerns ?? ''}
                      onChange={e => setContext(p => ({ ...p, specificConcerns: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* Preview */}
              <div style={{ border: '1px solid #1a2540', padding: '10px 12px', marginBottom: '16px', background: '#080c14' }}>
                <div style={{ fontSize: '10px', fontFamily: uiFont, color: '#555', marginBottom: '6px', letterSpacing: '0.06em' }}>
                  REVIEWING: {words.toLocaleString()} WORDS
                </div>
                <div style={{ fontSize: '12px', fontFamily: 'Georgia, serif', color: '#888', lineHeight: 1.55, fontStyle: 'italic' }}>
                  {preview}
                </div>
              </div>

              {/* Include rewrite toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <button
                  onClick={() => setIncludeRewrite(p => !p)}
                  style={{
                    width: '32px', height: '18px', background: includeRewrite ? '#4ecdc4' : '#1a2540',
                    border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '2px',
                    left: includeRewrite ? '16px' : '2px',
                    width: '14px', height: '14px',
                    background: '#fff', transition: 'left 0.2s',
                    display: 'block',
                  }} />
                </button>
                <span style={{ fontSize: '12px', fontFamily: uiFont, color: '#888' }}>
                  Include example rewrite
                </span>
              </div>

              {/* Action button */}
              {hasProviderKey() ? (
                <button
                  onClick={handleRequest}
                  disabled={phase === 'loading'}
                  style={{
                    width: '100%', padding: '11px', background: phase === 'loading' ? '#2a6b68' : '#4ecdc4',
                    border: 'none', borderRadius: 0, color: '#0a0a0a',
                    fontFamily: uiFont, fontSize: '13px', fontWeight: 600,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    cursor: phase === 'loading' ? 'not-allowed' : 'pointer',
                    opacity: phase === 'loading' ? 0.7 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {phase === 'loading' ? '✦ Consulting the editor…' : '✦ Request Editorial Feedback'}
                </button>
              ) : (
                <button
                  onClick={onOpenProviders}
                  style={{
                    width: '100%', padding: '11px', background: 'transparent',
                    border: '1px solid #444', borderRadius: 0, color: '#888',
                    fontFamily: uiFont, fontSize: '13px',
                    cursor: 'pointer', letterSpacing: '0.03em',
                  }}
                >
                  Set up a provider first →
                </button>
              )}
            </>
          )}

          {/* ── FEEDBACK PHASE ── */}
          {phase === 'feedback' && feedback && (
            <>
              <CollapsibleSection title="Strengths" icon="✦">
                <Bullets items={feedback.strengths ?? []} />
              </CollapsibleSection>

              {feedback.clarity && (
                <CollapsibleSection title="Clarity & Language">
                  <Prose>{feedback.clarity.observation}</Prose>
                  <Bullets items={feedback.clarity.suggestions ?? []} />
                </CollapsibleSection>
              )}

              {feedback.pacing && (
                <CollapsibleSection title="Pacing & Tension">
                  <Prose>{feedback.pacing.observation}</Prose>
                  <Bullets items={feedback.pacing.suggestions ?? []} />
                </CollapsibleSection>
              )}

              {feedback.dialogue && (
                <CollapsibleSection title="Dialogue">
                  <Prose>{feedback.dialogue.observation}</Prose>
                  <Bullets items={feedback.dialogue.suggestions ?? []} />
                </CollapsibleSection>
              )}

              {feedback.character && (
                <CollapsibleSection title="Character & Consistency">
                  <Prose>{feedback.character.observation}</Prose>
                  <Bullets items={feedback.character.suggestions ?? []} />
                </CollapsibleSection>
              )}

              {feedback.emotionalImpact && (
                <CollapsibleSection title="Emotional Impact">
                  <Prose>{feedback.emotionalImpact.observation}</Prose>
                  <Bullets items={feedback.emotionalImpact.suggestions ?? []} />
                </CollapsibleSection>
              )}

              {feedback.narrativePurpose && (
                <CollapsibleSection title="Narrative Purpose">
                  <Prose>{feedback.narrativePurpose.observation}</Prose>
                  <Bullets items={feedback.narrativePurpose.suggestions ?? []} />
                </CollapsibleSection>
              )}

              <CollapsibleSection title="Top Suggestions" icon="✦">
                <ol style={{ margin: 0, paddingLeft: '20px' }}>
                  {(feedback.topSuggestions ?? []).map((s, i) => (
                    <li key={i} style={{ fontSize: '14px', fontFamily: uiFont, color: '#d8d8d8', lineHeight: 1.65, marginBottom: '6px' }}>
                      {s}
                    </li>
                  ))}
                </ol>
              </CollapsibleSection>

              {feedback.rewrite && (
                <CollapsibleSection title="Example Rewrite" icon="✦">
                  <Prose>Showing how the top suggestions might look applied to your opening paragraph.</Prose>
                  <div style={{
                    border: '1px solid #1a2540',
                    background: '#0d1117',
                    padding: '12px 14px',
                    fontFamily: 'Georgia, serif',
                    fontSize: '13px',
                    color: '#c8a84b',
                    fontStyle: 'italic',
                    lineHeight: 1.7,
                  }}>
                    {feedback.rewrite}
                  </div>
                </CollapsibleSection>
              )}
            </>
          )}

          {/* ── ERROR PHASE ── */}
          {phase === 'error' && (
            <div style={{ padding: '16px 0' }}>
              <div style={{ color: '#e05c5c', fontSize: '13px', fontFamily: uiFont, marginBottom: '12px', lineHeight: 1.6 }}>
                {errorMsg}
              </div>
              <div style={{ color: '#555', fontSize: '11px', fontFamily: uiFont, marginBottom: '16px' }}>
                Check your API key in Profile → Providers.
              </div>
              <button
                onClick={() => setPhase('setup')}
                style={{
                  padding: '8px 16px', background: 'transparent',
                  border: '1px solid #444', borderRadius: 0, color: '#c8c8c8',
                  fontFamily: uiFont, fontSize: '12px', cursor: 'pointer',
                }}
              >Try Again</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #1a2540',
          padding: '10px 16px',
          background: '#0d1117',
          flexShrink: 0,
        }}>
          {phase === 'feedback' && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => { setPhase('setup'); setFeedback(null); }}
                style={{
                  flex: 1, padding: '7px', background: 'transparent',
                  border: '1px solid #333', borderRadius: 0, color: '#888',
                  fontFamily: uiFont, fontSize: '11px', cursor: 'pointer', letterSpacing: '0.04em',
                }}
              >✦ New Feedback</button>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1, padding: '7px', background: 'transparent',
                  border: '1px solid #333', borderRadius: 0,
                  color: copied ? '#4ecdc4' : '#888',
                  fontFamily: uiFont, fontSize: '11px', cursor: 'pointer', letterSpacing: '0.04em',
                }}
              >{copied ? '✓ Copied' : 'Copy Feedback'}</button>
            </div>
          )}
          <div style={{ fontSize: '10px', fontFamily: uiFont, color: '#333', letterSpacing: '0.04em' }}>
            Powered by {providerLabel}{model ? ` · ${model}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
