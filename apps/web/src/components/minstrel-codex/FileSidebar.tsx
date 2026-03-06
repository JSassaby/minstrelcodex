import type { FileNode } from '@minstrelcodex/core';

interface FileSidebarProps {
  visible: boolean;
  structure: FileNode;
  focusIndex: number;
  onClose: () => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onFileClick: (path: string[]) => void;
  onFolderToggle: (path: string[]) => void;
  onMoveFile: (filename: string, path: string[]) => void;
}

export default function FileSidebar({
  visible,
  structure,
  focusIndex,
  onClose,
  onNewFolder,
  onNewFile,
  onFileClick,
  onFolderToggle,
  onMoveFile,
}: FileSidebarProps) {
  const flatItems = flattenTree(structure);

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: '300px',
        height: '100vh',
        background: 'var(--terminal-bg)',
        borderLeft: '2px solid var(--terminal-text)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'VT323', monospace",
        color: 'var(--terminal-text)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--terminal-text)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>FILES</span>
        <button
          onClick={onClose}
          style={{
            background: focusIndex === 0 ? 'var(--terminal-text)' : 'none',
            color: focusIndex === 0 ? 'var(--terminal-bg)' : 'var(--terminal-text)',
            border: '1px solid var(--terminal-text)',
            fontSize: '24px',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            fontFamily: "'VT323', monospace",
          }}
        >
          ×
        </button>
      </div>

      {/* Action buttons */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid var(--terminal-text)',
          display: 'flex',
          gap: '8px',
        }}
      >
        {[{ label: '+ NEW FOLDER', onClick: onNewFolder, idx: 1 }, { label: '+ NEW FILE', onClick: onNewFile, idx: 2 }].map(
          btn => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              style={{
                flex: 1,
                background: focusIndex === btn.idx ? 'var(--terminal-text)' : 'var(--terminal-bg)',
                color: focusIndex === btn.idx ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                border: '1px solid var(--terminal-text)',
                padding: '8px',
                fontFamily: "'VT323', monospace",
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {btn.label}
            </button>
          ),
        )}
      </div>

      {/* File tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {flatItems.map((item, i) => {
          const itemFocusIdx = i + 3;
          const isFocused = focusIndex === itemFocusIdx;

          return (
            <div
              key={item.path.join('/')}
              onClick={() => {
                if (item.type === 'file') onFileClick(item.path);
                else onFolderToggle(item.path);
              }}
              style={{
                padding: '8px 12px',
                paddingLeft: `${12 + item.depth * 20}px`,
                cursor: 'pointer',
                border: isFocused ? '1px solid var(--terminal-text)' : '1px solid transparent',
                background: isFocused ? 'rgba(51, 255, 51, 0.1)' : 'transparent',
                margin: '2px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {item.type === 'folder' && (
                <span style={{ userSelect: 'none' }}>{item.collapsed ? '▶' : '▼'}</span>
              )}
              <span>{item.type === 'folder' ? '📁' : '📄'}</span>
              <span style={{ fontWeight: item.type === 'folder' ? 'bold' : 'normal' }}>{item.name}</span>
              {item.type === 'file' && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onMoveFile(item.name, item.path);
                  }}
                  style={{
                    marginLeft: 'auto',
                    background: 'var(--terminal-bg)',
                    border: '1px solid var(--terminal-text)',
                    color: 'var(--terminal-text)',
                    padding: '2px 8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    opacity: isFocused ? 1 : 0.5,
                    fontFamily: "'VT323', monospace",
                  }}
                >
                  →
                </button>
              )}
            </div>
          );
        })}
        {flatItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', opacity: 0.5 }}>No files yet</div>
        )}
      </div>

      {/* Hint */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--terminal-text)',
          fontSize: '12px',
          opacity: 0.6,
          textAlign: 'center',
        }}
      >
        ↑↓ Navigate • Enter Select • M Move File • Esc Close
      </div>
    </div>
  );
}

export interface FlatTreeItem {
  name: string;
  type: 'file' | 'folder';
  path: string[];
  depth: number;
  collapsed?: boolean;
}

export function flattenTree(node: FileNode, path: string[] = [], depth: number = 0): FlatTreeItem[] {
  const result: FlatTreeItem[] = [];
  const children = node.children || {};
  const entries = Object.entries(children).sort((a, b) => {
    const aFolder = a[1].type === 'folder';
    const bFolder = b[1].type === 'folder';
    if (aFolder && !bFolder) return -1;
    if (!aFolder && bFolder) return 1;
    return a[0].localeCompare(b[0]);
  });

  for (const [name, item] of entries) {
    const itemPath = [...path, name];
    result.push({ name, type: item.type, path: itemPath, depth, collapsed: item.collapsed });
    if (item.type === 'folder' && !item.collapsed) {
      result.push(...flattenTree(item, itemPath, depth + 1));
    }
  }
  return result;
}
