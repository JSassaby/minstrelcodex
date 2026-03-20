import { useState } from 'react';
import { DESIGN_TOKENS as DT } from '@minstrelcodex/core';
import minstrelLogo from '../../assets/minstrel-logo.svg';

interface WelcomeIntroProps {
  isSignedIn?: boolean;
}

export default function WelcomeIntro({ isSignedIn = false }: WelcomeIntroProps) {
  const [visible] = useState(() =>
    localStorage.getItem('minstrel-welcome-seen') !== 'true' &&
    localStorage.getItem('minstrel-wizard-complete') !== 'true'
  );
  const [show, setShow] = useState(visible);

  if (!show) return null;

  function dismiss() {
    setShow(false);
  }

  function handleSkip() {
    localStorage.setItem('minstrel-welcome-seen', 'true');
    dismiss();
  }

  function handleBegin() {
    localStorage.setItem('minstrel-welcome-seen', 'true');
    localStorage.setItem('minstrel-wizard-complete', 'true');
    localStorage.setItem('minstrel-novel-created', 'true');
    dismiss();
  }

  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      background:     'rgba(0, 0, 0, 0.75)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      zIndex:         DT.Z_INDEX.modal,
    }}>
      <div style={{
        width:          '640px',
        maxWidth:       'calc(100vw - 40px)',
        maxHeight:      '90vh',
        display:        'flex',
        flexDirection:  'column',
        background:     DT.COLORS.background.panel,
        border:         DT.BORDERS.default,
        borderRadius:   0,
        boxShadow:      'none',
        overflow:       'hidden',
      }}>
        {/* Body — scrollable */}
        <div style={{
          padding:    '40px 44px 32px',
          overflowY:  'auto',
          flex:       1,
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <img
              src={minstrelLogo}
              alt="Minstrel Codex"
              style={{ maxHeight: '80px', display: 'inline-block', filter: 'brightness(0) invert(1)' }}
            />
          </div>

          {/* Heading */}
          <div style={{
            ...DT.TYPOGRAPHY.sectionHeader,
            fontSize:     '13px',
            textAlign:    'center',
            marginBottom: '28px',
          }}>
            Welcome to Minstrel Codex
          </div>

          {/* Body paragraphs */}
          {[
            "Minstrel Codex is a writing platform designed to turn the act of writing into a living craft rather than a solitary chore. Inspired by the wandering storytellers of old—the minstrels who carried tales from town to town—the app is built for modern writers who want to capture ideas, shape stories, and steadily grow their skill over time.",
            "At its core, Minstrel Codex is a focused writing environment. It gives writers a simple place to draft, revise, and organize their work without the clutter and distraction of traditional word processors. Instead of juggling scattered notes, outlines, and character sheets, everything lives inside one evolving codex—a structured record of the story world. Writers can track characters, locations, plot threads, and research in one central system, much like a story bible used by professional authors.",
            "Writing isn't treated as a one-off task but as a practice—a skill developed through repetition, experimentation, and curiosity. The platform encourages writers to return each day, adding fragments, scenes, and ideas that slowly accumulate into a larger work. Over time the codex becomes a personal archive of stories, characters, and creative experiments.",
          ].map((text, i) => (
            <p key={i} style={{
              fontFamily:   'Georgia, serif',
              fontSize:     '14px',
              lineHeight:   1.7,
              color:        '#c8c8c8',
              margin:       0,
              marginBottom: i < 2 ? '18px' : 0,
            }}>
              {text}
            </p>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding:     '16px 44px 28px',
          flexShrink:  0,
          borderTop:   DT.BORDERS.subtle,
        }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: isSignedIn ? 0 : '14px' }}>
            <button
              onClick={handleSkip}
              style={{
                padding:       DT.SPACING.buttonPadding,
                background:    'transparent',
                border:        '1px solid #444',
                borderRadius:  0,
                color:         '#888',
                fontFamily:    DT.TYPOGRAPHY.ui.fontFamily,
                fontSize:      '11px',
                fontWeight:    500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor:        'pointer',
                boxShadow:     'none',
              }}
            >
              Skip for now
            </button>
            <button
              onClick={handleBegin}
              style={{
                padding:       DT.SPACING.buttonPadding,
                background:    DT.COLORS.ui.teal,
                border:        DT.BORDERS.active,
                borderRadius:  0,
                color:         DT.COLORS.background.primary,
                fontFamily:    DT.TYPOGRAPHY.ui.fontFamily,
                fontSize:      '11px',
                fontWeight:    600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor:        'pointer',
                boxShadow:     'none',
              }}
            >
              Begin Writing
            </button>
          </div>
          {/* One-time sync notice for unauthenticated users */}
          {!isSignedIn && (
            <div style={{
              padding:     '9px 12px',
              borderLeft:  '3px solid var(--terminal-accent)',
              background:  'rgba(0,223,160,0.04)',
              fontSize:    '12px',
              color:       '#888',
              fontFamily:  DT.TYPOGRAPHY.ui.fontFamily,
              lineHeight:  1.5,
            }}>
              💡 Your work is saved on this device. To keep your settings and files in sync across devices, you can sign in anytime from the top right.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
