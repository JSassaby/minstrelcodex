import { useState } from 'react';
import { X, HelpCircle, ChevronRight, ChevronDown, BookOpen, FileText } from 'lucide-react';
import { HELP_TREE, isHelpFolder, type HelpNode, type HelpFolder } from './helpContent';

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

interface HelpPanelProps {
  visible: boolean;
  onClose: () => void;
  onOpenPage: (pageId: string) => void;
  activePageId?: string | null;
}

// ── Tree node renderer ────────────────────────────────────────────────
function HelpTreeNode({
  node,
  depth,
  expandedFolders,
  onToggle,
  onOpenPage,
  activePageId,
}: {
  node: HelpNode;
  depth: number;
  expandedFolders: Set<string>;
  onToggle: (id: string) => void;
  onOpenPage: (id: string) => void;
  activePageId?: string | null;
}) {
  const isFolder = isHelpFolder(node);
  const isExpanded = isFolder && expandedFolders.has(node.id);
  const isActive = !isFolder && node.id === activePageId;

  return (
    <>
      <div
        onClick={() => isFolder ? onToggle(node.id) : onOpenPage(node.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 10px',
          paddingLeft: `${12 + depth * 16}px`,
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: isFolder ? 600 : 400,
          letterSpacing: isFolder ? '0.03em' : '0.01em',
          color: isActive ? 'var(--terminal-bg)' : 'var(--terminal-text)',
          background: isActive ? 'var(--terminal-accent)' : 'transparent',
          margin: '1px 6px',
          transition: 'background 0.12s, color 0.12s',
          userSelect: 'none',
          opacity: isFolder ? 1 : 0.85,
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = 'var(--terminal-surface)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'transparent';
        }}
      >
        {isFolder ? (
          isExpanded
            ? <ChevronDown size={13} strokeWidth={2} style={{ color: 'var(--terminal-accent)', flexShrink: 0 }} />
            : <ChevronRight size={13} strokeWidth={2} style={{ color: 'var(--terminal-accent)', flexShrink: 0 }} />
        ) : (
          <FileText size={12} strokeWidth={1.6} style={{ flexShrink: 0, opacity: 0.5 }} />
        )}
        {isFolder && (
          <BookOpen size={13} strokeWidth={1.6} style={{ color: 'var(--terminal-accent)', flexShrink: 0 }} />
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.title}
        </span>
      </div>
      {isFolder && isExpanded && (node as HelpFolder).children.map((child) => (
        <HelpTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          expandedFolders={expandedFolders}
          onToggle={onToggle}
          onOpenPage={onOpenPage}
          activePageId={activePageId}
        />
      ))}
    </>
  );
}

export default function HelpPanel({ visible, onClose, onOpenPage, activePageId }: HelpPanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    // Start with first two folders expanded
    const initial = new Set<string>();
    HELP_TREE.slice(0, 2).forEach((f) => initial.add(f.id));
    return initial;
  });

  if (!visible) return null;

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      style={{
        width: '280px',
        height: '100%',
        background: 'var(--terminal-bg)',
        borderRight: '1px solid var(--terminal-border)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: uiFont,
        color: 'var(--terminal-text)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--terminal-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle size={15} strokeWidth={1.8} style={{ color: 'var(--terminal-accent)' }} />
          <span style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.06em' }}>
            HELP & REFERENCE
          </span>
        </div>
        <div
          onClick={onClose}
          style={{
            cursor: 'pointer',
            opacity: 0.5,
            padding: '4px',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
        >
          <X size={14} strokeWidth={2} />
        </div>
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {HELP_TREE.map((node) => (
          <HelpTreeNode
            key={node.id}
            node={node}
            depth={0}
            expandedFolders={expandedFolders}
            onToggle={toggleFolder}
            onOpenPage={onOpenPage}
            activePageId={activePageId}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--terminal-border)',
        fontSize: '10px',
        opacity: 0.4,
        textAlign: 'center',
        letterSpacing: '0.04em',
      }}>
        READ-ONLY · HELP CONTENT
      </div>
    </div>
  );
}
