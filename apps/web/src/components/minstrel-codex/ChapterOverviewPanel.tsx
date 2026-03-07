import { useState, useMemo } from 'react';
import type { FileStructure, FileNode, DocumentData } from '@minstrelcodex/core';

interface ChapterOverviewPanelProps {
  visible: boolean;
  structure: FileStructure;
  allDocuments: Record<string, DocumentData>;
  currentFilename: string;
  wordCountTarget: number;
  onWordCountTargetChange: (n: number) => void;
  onOpenFile: (filename: string) => void;
  onClose: () => void;
  getNovelProjects: () => string[];
}

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(html: string) {
  const text = stripHtml(html);
  return text ? text.split(' ').filter(w => w.length > 0).length : 0;
}

function readingTime(words: number) {
  const mins = Math.round(words / 250);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function getChaptersNode(root: FileNode, project: string): FileNode | null {
  const proj = root.children?.[project];
  return proj?.children?.['Active']?.children?.['Chapters'] ?? null;
}

export default function ChapterOverviewPanel({
  visible, structure, allDocuments, currentFilename,
  wordCountTarget, onWordCountTargetChange, onOpenFile, onClose, getNovelProjects,
}: ChapterOverviewPanelProps) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(wordCountTarget));

  const projects = getNovelProjects();

  const projectData = useMemo(() => {
    return projects.map(project => {
      const chaptersNode = getChaptersNode(structure.root, project);
      if (!chaptersNode?.children) return { project, chapters: [], totalWords: 0 };

      const chapters = Object.values(chaptersNode.children)
        .filter(n => n.type === 'file')
        .map(n => {
          const doc = allDocuments[n.name];
          const words = doc ? countWords(doc.content) : 0;
          return { name: n.name, displayName: n.name.split('/').pop() || n.name, words };
        });

      const totalWords = chapters.reduce((s, c) => s + c.words, 0);
      return { project, chapters, totalWords };
    });
  }, [projects, structure, allDocuments]);

  const grandTotal = projectData.reduce((s, p) => s + p.totalWords, 0);

  if (!visible) return null;

  return (
    <div style={{
      width: '280px',
      flexShrink: 0,
      borderRight: '1px solid var(--terminal-border)',
      background: 'var(--terminal-bg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: uiFont,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', color: 'var(--terminal-accent)', opacity: 0.9 }}>
          CHAPTER OVERVIEW
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--terminal-text)', cursor: 'pointer', opacity: 0.5, fontSize: '14px', padding: '0 2px' }}
          title="Close"
        >×</button>
      </div>

      {/* Word count target */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--terminal-border)', flexShrink: 0 }}>
        <div style={{ fontSize: '10px', opacity: 0.55, marginBottom: '4px', letterSpacing: '0.06em' }}>TARGET WORD COUNT</div>
        {editingTarget ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              autoFocus
              value={targetInput}
              onChange={e => setTargetInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const n = parseInt(targetInput, 10);
                  if (n > 0) onWordCountTargetChange(n);
                  setEditingTarget(false);
                }
                if (e.key === 'Escape') { setTargetInput(String(wordCountTarget)); setEditingTarget(false); }
              }}
              onBlur={() => {
                const n = parseInt(targetInput, 10);
                if (n > 0) onWordCountTargetChange(n);
                setEditingTarget(false);
              }}
              style={{
                flex: 1, background: 'var(--terminal-surface)', border: '1px solid var(--terminal-accent)',
                color: 'var(--terminal-text)', padding: '4px 8px', fontSize: '12px',
                fontFamily: uiFont, outline: 'none', borderRadius: '4px',
              }}
            />
          </div>
        ) : (
          <div
            onClick={() => { setTargetInput(String(wordCountTarget)); setEditingTarget(true); }}
            style={{ fontSize: '13px', cursor: 'pointer', opacity: 0.85 }}
            title="Click to edit target"
          >
            {wordCountTarget.toLocaleString()} words
          </div>
        )}

        {/* Progress bar */}
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '10px', opacity: 0.5, marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{grandTotal.toLocaleString()} written</span>
            <span>{Math.round((grandTotal / wordCountTarget) * 100)}%</span>
          </div>
          <div style={{ height: '4px', background: 'var(--terminal-surface)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (grandTotal / wordCountTarget) * 100)}%`,
              background: 'var(--terminal-accent)',
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ fontSize: '10px', opacity: 0.45, marginTop: '4px' }}>
            Est. reading time: {readingTime(grandTotal)}
          </div>
        </div>
      </div>

      {/* Chapter list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {projectData.length === 0 && (
          <div style={{ padding: '20px 14px', fontSize: '12px', opacity: 0.45, textAlign: 'center' }}>
            No novel projects found.<br />Create one via FILE → New Novel Project.
          </div>
        )}

        {projectData.map(({ project, chapters, totalWords }) => (
          <div key={project}>
            {/* Project header */}
            <div style={{
              padding: '6px 14px 4px',
              fontSize: '10px',
              fontWeight: '600',
              letterSpacing: '0.06em',
              opacity: 0.6,
              color: 'var(--terminal-accent)',
            }}>
              {project.toUpperCase()}
              <span style={{ fontWeight: '400', opacity: 0.7, marginLeft: '6px' }}>
                {totalWords.toLocaleString()}w
              </span>
            </div>

            {chapters.length === 0 && (
              <div style={{ padding: '4px 14px', fontSize: '11px', opacity: 0.35 }}>No chapters</div>
            )}

            {chapters.map(ch => {
              const isActive = ch.name === currentFilename;
              return (
                <div
                  key={ch.name}
                  onClick={() => onOpenFile(ch.name)}
                  style={{
                    padding: '6px 14px',
                    cursor: 'pointer',
                    background: isActive ? 'var(--terminal-surface)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--terminal-accent)' : '2px solid transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--terminal-surface)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '12px', opacity: isActive ? 1 : 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ch.displayName}
                  </span>
                  <span style={{ fontSize: '10px', opacity: 0.45, flexShrink: 0 }}>
                    {ch.words > 0 ? `${ch.words.toLocaleString()}w` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
