import { useState, useEffect, useCallback, useRef } from 'react';
import type { FileNode, DocumentData } from '@/lib/types';

export interface FileBrowserProps {
  visible: boolean;
  focused: boolean;
  rootNode: FileNode;
  allDocuments: Record<string, DocumentData>;
  onClose: () => void;
  onOpenFile: (filename: string) => void;
  onNewFile: () => void;
  onCreateFile: (filename: string, folderPath: string[]) => void;
  onNewFolder: (name: string) => void;
  onDeleteFile: (filename: string) => void;
  onDeleteFolder: (folderPath: string[]) => void;
  onRenameFile: (oldName: string, newName: string) => void;
  onMoveFile: (filename: string, fromPath: string[], toPath: string[]) => void;
  onToggleFolder: (path: string[]) => void;
  onRestoreFromDeleted: (itemName: string) => void;
  onEmptyDeleted: () => void;
  onFocus: () => void;
  getFolders: () => { name: string; path: string[] }[];
  onSyncGoogleDrive?: () => void;
  onSyncICloud?: () => void;
}

type InputMode = 'none' | 'search' | 'rename' | 'new-folder' | 'new-file' | 'move';

interface FlatItem {
  name: string;
  type: 'file' | 'folder';
  path: string[];
  depth: number;
  collapsed?: boolean;
}

function flattenTree(node: FileNode, path: string[] = [], depth: number = 0): FlatItem[] {
  const result: FlatItem[] = [];
  const children = node.children || {};
  const entries = Object.entries(children).sort((a, b) => {
    // Folders first, then files
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

export default function FileBrowser({
  visible,
  focused,
  rootNode,
  allDocuments,
  onClose,
  onOpenFile,
  onCreateFile,
  onNewFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onMoveFile,
  onToggleFolder,
  onRestoreFromDeleted,
  onEmptyDeleted,
  onFocus,
  getFolders,
  onSyncGoogleDrive,
  onSyncICloud,
}: FileBrowserProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [moveTargetIdx, setMoveTargetIdx] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems = flattenTree(rootNode);
  const filteredItems = searchQuery
    ? allItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allItems;

  // Reset state when browser opens
  useEffect(() => {
    if (visible) {
      setSelectedIndex(0);
      setInputMode('none');
      setInputValue('');
      setSearchQuery('');
      setStatusMessage('');
    }
  }, [visible]);

  // Focus input when input mode changes
  useEffect(() => {
    if (inputMode !== 'none') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [inputMode]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${selectedIndex}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const showStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 2000);
  }, []);

  // Get the folder path the selected item lives in (for creating files)
  const getSelectedFolderPath = useCallback((): string[] => {
    const item = filteredItems[selectedIndex];
    if (!item) return [];
    if (item.type === 'folder') return item.path;
    return item.path.slice(0, -1);
  }, [filteredItems, selectedIndex]);

  // Keyboard handler
  useEffect(() => {
    if (!visible || !focused) return;

    const handler = (e: KeyboardEvent) => {
      // Input mode handling
      if (inputMode === 'search') {
        if (e.key === 'Escape') {
          setInputMode('none');
          setSearchQuery('');
          e.preventDefault();
        } else if (e.key === 'Enter') {
          setInputMode('none');
          if (filteredItems.length > 0) setSelectedIndex(0);
          e.preventDefault();
        }
        return;
      }

      if (inputMode === 'rename') {
        if (e.key === 'Escape') { setInputMode('none'); e.preventDefault(); }
        else if (e.key === 'Enter') {
          const item = filteredItems[selectedIndex];
          if (inputValue.trim() && item?.type === 'file') {
            onRenameFile(item.name, inputValue.trim());
            showStatus(`Renamed`);
          }
          setInputMode('none');
          e.preventDefault();
        }
        return;
      }

      if (inputMode === 'new-folder') {
        if (e.key === 'Escape') { setInputMode('none'); e.preventDefault(); }
        else if (e.key === 'Enter') {
          if (inputValue.trim()) {
            onNewFolder(inputValue.trim());
            showStatus(`Folder created`);
          }
          setInputMode('none');
          e.preventDefault();
        }
        return;
      }

      if (inputMode === 'new-file') {
        if (e.key === 'Escape') { setInputMode('none'); e.preventDefault(); }
        else if (e.key === 'Enter') {
          if (inputValue.trim()) {
            onCreateFile(inputValue.trim(), getSelectedFolderPath());
            showStatus(`File created`);
          }
          setInputMode('none');
          e.preventDefault();
        }
        return;
      }

      if (inputMode === 'move') {
        const folders = getFolders();
        if (e.key === 'Escape') { setInputMode('none'); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { setMoveTargetIdx(prev => Math.min(prev + 1, folders.length)); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { setMoveTargetIdx(prev => Math.max(prev - 1, 0)); e.preventDefault(); }
        else if (e.key === 'Enter') {
          const item = filteredItems[selectedIndex];
          if (item?.type === 'file') {
            const targetPath = moveTargetIdx === 0 ? [] : folders[moveTargetIdx - 1]?.path || [];
            onMoveFile(item.name, item.path.slice(0, -1), targetPath);
            showStatus(`Moved`);
          }
          setInputMode('none');
          e.preventDefault();
        }
        return;
      }

      // Global keys
      if (e.key === 'Escape') { onClose(); e.preventDefault(); return; }
      if (e.key === '/') { setInputMode('search'); setInputValue(''); e.preventDefault(); return; }
      if (e.key === 'n' || e.key === 'N') { setInputMode('new-folder'); setInputValue(''); e.preventDefault(); return; }
      if (e.key === 'c' || e.key === 'C') { setInputMode('new-file'); setInputValue(''); e.preventDefault(); return; }

      // Navigation
      if (e.key === 'ArrowDown') {
        setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        e.preventDefault();
      } else if (e.key === 'Enter') {
        const item = filteredItems[selectedIndex];
        if (item) {
          if (item.type === 'folder') {
            onToggleFolder(item.path);
          } else {
            onOpenFile(item.name);
          }
        }
        e.preventDefault();
      } else if (e.key === ' ') {
        const item = filteredItems[selectedIndex];
        if (item?.type === 'folder') onToggleFolder(item.path);
        e.preventDefault();
      } else if (e.key === 'd' || e.key === 'D') {
        const item = filteredItems[selectedIndex];
        if (item) {
          if (item.type === 'file') {
            onDeleteFile(item.name);
            showStatus('Moved to Deleted');
          } else if (item.path[0] !== 'Deleted') {
            onDeleteFolder(item.path);
            showStatus('Folder moved to Deleted');
          }
          setSelectedIndex(prev => Math.max(0, prev - 1));
        }
        e.preventDefault();
      } else if (e.key === 'r' || e.key === 'R') {
        const item = filteredItems[selectedIndex];
        if (item?.type === 'file') {
          setInputMode('rename');
          setInputValue(item.name);
        }
        e.preventDefault();
      } else if (e.key === 'm' || e.key === 'M') {
        const item = filteredItems[selectedIndex];
        if (item?.type === 'file') {
          setInputMode('move');
          setMoveTargetIdx(0);
        }
        e.preventDefault();
      } else if (e.key === 'u' || e.key === 'U') {
        const item = filteredItems[selectedIndex];
        if (item && item.path[0] === 'Deleted') {
          const restoreName = item.type === 'folder' ? item.path[1] : item.name;
          onRestoreFromDeleted(restoreName);
          showStatus(`Restored`);
          setSelectedIndex(prev => Math.max(0, prev - 1));
        }
        e.preventDefault();
      } else if (e.key === 'e' || e.key === 'E') {
        const item = filteredItems[selectedIndex];
        if (item && item.path[0] === 'Deleted') {
          onEmptyDeleted();
          showStatus('Deleted emptied');
        }
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [visible, focused, selectedIndex, inputMode, inputValue, searchQuery,
    moveTargetIdx, filteredItems, onClose, onOpenFile, onDeleteFile, onDeleteFolder,
    onRenameFile, onMoveFile, onToggleFolder, onRestoreFromDeleted, onEmptyDeleted,
    onNewFolder, onCreateFile, getFolders, showStatus, getSelectedFolderPath]);

  if (!visible) return null;

  const allFolders = getFolders();

  const termStyle: React.CSSProperties = {
    fontFamily: "'Courier Prime', 'Courier New', monospace",
    color: 'var(--terminal-text)',
  };

  return (
    <div
      onClick={onFocus}
      style={{
        width: '320px',
        minWidth: '320px',
        background: 'var(--terminal-bg)',
        borderRight: focused ? '2px solid var(--terminal-text)' : '1px solid var(--terminal-text)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...termStyle,
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: '2px solid var(--terminal-text)',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 'bold', textShadow: '0 0 10px var(--terminal-glow)' }}>
          📂 FILES
        </span>
        <span
          onClick={onClose}
          style={{ fontSize: '11px', opacity: 0.5, cursor: 'pointer' }}
          title="Esc to close"
        >
          ✕
        </span>
      </div>

      {/* Search bar */}
      {inputMode === 'search' && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--terminal-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ opacity: 0.7 }}>/</span>
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search..."
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--terminal-text)',
              ...termStyle,
              fontSize: '14px',
            }}
          />
        </div>
      )}

      {/* Rename input */}
      {inputMode === 'rename' && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--terminal-text)', background: 'rgba(51,255,51,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px' }}>RENAME:</span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                background: 'var(--terminal-bg)',
                border: '1px solid var(--terminal-text)',
                color: 'var(--terminal-text)',
                padding: '4px 8px',
                ...termStyle,
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* New folder input */}
      {inputMode === 'new-folder' && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--terminal-text)', background: 'rgba(51,255,51,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px' }}>NEW FOLDER:</span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                background: 'var(--terminal-bg)',
                border: '1px solid var(--terminal-text)',
                color: 'var(--terminal-text)',
                padding: '4px 8px',
                ...termStyle,
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* New file input */}
      {inputMode === 'new-file' && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--terminal-text)', background: 'rgba(51,255,51,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px' }}>NEW FILE:</span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              autoFocus
              placeholder="filename.txt"
              style={{
                flex: 1,
                background: 'var(--terminal-bg)',
                border: '1px solid var(--terminal-text)',
                color: 'var(--terminal-text)',
                padding: '4px 8px',
                ...termStyle,
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '4px' }}>
            In: {getSelectedFolderPath().join('/') || 'root'}
          </div>
        </div>
      )}

      {/* Move picker */}
      {inputMode === 'move' && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--terminal-text)', background: 'rgba(51,255,51,0.05)' }}>
          <div style={{ marginBottom: '6px', fontSize: '12px' }}>
            MOVE TO:
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            <div
              style={{
                padding: '4px 10px',
                background: moveTargetIdx === 0 ? 'var(--terminal-text)' : 'transparent',
                color: moveTargetIdx === 0 ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
              onClick={() => { setMoveTargetIdx(0); }}
            >
              📁 root
            </div>
            {allFolders.map((f, i) => (
              <div
                key={f.path.join('/')}
                onClick={() => setMoveTargetIdx(i + 1)}
                style={{
                  padding: '4px 10px',
                  background: moveTargetIdx === i + 1 ? 'var(--terminal-text)' : 'transparent',
                  color: moveTargetIdx === i + 1 ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                📁 {f.name}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '4px' }}>↑↓ Enter • Esc cancel</div>
        </div>
      )}

      {/* Unified file tree */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
        }}
      >
        {filteredItems.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', opacity: 0.5, fontSize: '12px' }}>
            {searchQuery ? 'No matches' : 'No files yet'}
          </div>
        ) : (
          filteredItems.map((item, i) => {
            const isFocused = selectedIndex === i;
            const isFolder = item.type === 'folder';
            const doc = !isFolder ? allDocuments[item.name] : null;
            const words = doc?.content ? doc.content.split(/\s+/).filter(Boolean).length : 0;
            const displayName = item.name.includes('/') ? item.name.split('/').pop() || item.name : item.name;
            const isDeleted = item.path[0] === 'Deleted';

            return (
              <div
                key={item.path.join('/') + item.type}
                data-idx={i}
                onClick={() => {
                  setSelectedIndex(i);
                  if (isFolder) onToggleFolder(item.path);
                  else onOpenFile(item.name);
                }}
                style={{
                  padding: '5px 10px',
                  paddingLeft: `${10 + item.depth * 16}px`,
                  cursor: 'pointer',
                  background: isFocused ? 'var(--terminal-text)' : 'transparent',
                  color: isFocused ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '13px',
                  opacity: isDeleted && !isFocused ? 0.5 : 1,
                  transition: 'background 0.05s',
                }}
              >
                {isFolder && (
                  <span style={{ fontSize: '9px', userSelect: 'none', width: '10px', textAlign: 'center' }}>
                    {item.collapsed ? '▶' : '▼'}
                  </span>
                )}
                {!isFolder && <span style={{ width: '10px' }} />}
                <span style={{ fontSize: '12px' }}>{isFolder ? '📁' : '📄'}</span>
                <span style={{
                  fontWeight: isFolder ? 'bold' : 'normal',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {displayName}
                </span>
                {!isFolder && doc && (
                  <span style={{ fontSize: '10px', opacity: isFocused ? 0.7 : 0.4, whiteSpace: 'nowrap' }}>
                    {words}w
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Status message */}
      {statusMessage && (
        <div style={{
          padding: '4px 12px',
          borderTop: '1px solid var(--terminal-text)',
          background: 'rgba(51,255,51,0.1)',
          fontSize: '11px',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          ✓ {statusMessage}
        </div>
      )}

      {/* Action bar */}
      <div
        style={{
          borderTop: '2px solid var(--terminal-text)',
          padding: '6px 8px',
          fontSize: '10px',
          opacity: 0.8,
          flexShrink: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2px 6px',
        }}
      >
        {[
          { key: 'Enter', label: 'Open' },
          { key: 'm', label: 'Move' },
          { key: 'r', label: 'Rename' },
          { key: 'd', label: 'Del' },
          { key: 'n', label: 'Folder' },
          { key: 'c', label: 'File' },
          { key: '/', label: 'Search' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
            }}
            style={actionBtnStyle}
            title={`${key} — ${label}`}
          >
            <span style={kbdStyle}>{key}</span>{label}
          </button>
        ))}
        {onSyncGoogleDrive && (
          <button
            onClick={(e) => { e.stopPropagation(); onSyncGoogleDrive(); }}
            style={actionBtnStyle}
          >
            ☁ Sync
          </button>
        )}
        {onSyncICloud && (
          <button
            onClick={(e) => { e.stopPropagation(); onSyncICloud(); }}
            style={actionBtnStyle}
          >
            🍎 Sync
          </button>
        )}
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  border: '1px solid var(--terminal-text)',
  fontSize: '11px',
  marginRight: '4px',
  fontFamily: "'Courier Prime', monospace",
};

const actionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  padding: '2px 4px',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
};
