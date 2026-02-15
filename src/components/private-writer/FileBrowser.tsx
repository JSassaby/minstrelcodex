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

type FocusPane = 'folders' | 'files' | 'action-bar';
type InputMode = 'none' | 'search' | 'rename' | 'new-folder' | 'new-file' | 'move';

interface FlatItem {
  name: string;
  type: 'file' | 'folder';
  path: string[];
  depth: number;
  collapsed?: boolean;
}

function flattenFolders(node: FileNode, path: string[] = [], depth: number = 0): FlatItem[] {
  const result: FlatItem[] = [];
  const children = node.children || {};
  // Add "root" as the first entry
  if (depth === 0) {
    result.push({ name: 'root', type: 'folder', path: [], depth: 0, collapsed: false });
  }
  const entries = Object.entries(children).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [name, item] of entries) {
    if (item.type === 'folder') {
      const itemPath = [...path, name];
      result.push({ name, type: 'folder', path: itemPath, depth: depth + 1, collapsed: item.collapsed });
      if (!item.collapsed) {
        result.push(...flattenFolders(item, itemPath, depth + 1));
      }
    }
  }
  return result;
}

function getFilesInFolder(node: FileNode, path: string[]): { name: string; path: string[] }[] {
  let current = node;
  for (const p of path) {
    if (!current.children || !current.children[p]) return [];
    current = current.children[p];
  }
  const children = current.children || {};
  return Object.entries(children)
    .filter(([, item]) => item.type === 'file')
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name]) => ({ name, path: [...path, name] }));
}

export default function FileBrowser({
  visible,
  focused,
  rootNode,
  allDocuments,
  onClose,
  onOpenFile,
  onNewFile,
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
  const [focusPane, setFocusPane] = useState<FocusPane>('folders');
  const [folderIndex, setFolderIndex] = useState(0);
  const [fileIndex, setFileIndex] = useState(0);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [moveTargetIdx, setMoveTargetIdx] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const folderList = flattenFolders(rootNode);
  const filesInCurrentFolder = getFilesInFolder(rootNode, currentPath);
  const filteredFiles = searchQuery
    ? filesInCurrentFolder.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filesInCurrentFolder;

  // Reset state when browser opens
  useEffect(() => {
    if (visible) {
      setFocusPane('folders');
      setFolderIndex(0);
      setFileIndex(0);
      setCurrentPath([]);
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

  // Show status messages temporarily
  const showStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 2000);
  }, []);

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
          if (filteredFiles.length > 0) {
            setFileIndex(0);
            setFocusPane('files');
          }
          e.preventDefault();
        }
        return; // Let input handle other keys
      }

      if (inputMode === 'rename') {
        if (e.key === 'Escape') {
          setInputMode('none');
          e.preventDefault();
        } else if (e.key === 'Enter') {
          if (inputValue.trim() && filteredFiles[fileIndex]) {
            onRenameFile(filteredFiles[fileIndex].name, inputValue.trim());
            showStatus(`Renamed to "${inputValue.trim()}"`);
          }
          setInputMode('none');
          e.preventDefault();
        }
        return;
      }

      if (inputMode === 'new-folder') {
        if (e.key === 'Escape') {
          setInputMode('none');
          e.preventDefault();
        } else if (e.key === 'Enter') {
          if (inputValue.trim()) {
            onNewFolder(inputValue.trim());
            showStatus(`Folder "${inputValue.trim()}" created`);
          }
          setInputMode('none');
          e.preventDefault();
        }
        return;
      }

      if (inputMode === 'new-file') {
        if (e.key === 'Escape') {
          setInputMode('none');
          e.preventDefault();
        } else if (e.key === 'Enter') {
          if (inputValue.trim()) {
            onCreateFile(inputValue.trim(), currentPath);
            showStatus(`File "${inputValue.trim()}" created`);
          }
          setInputMode('none');
          e.preventDefault();
        }
        return;
      }

      if (inputMode === 'move') {
        const folders = getFolders();
        if (e.key === 'Escape') {
          setInputMode('none');
          e.preventDefault();
        } else if (e.key === 'ArrowDown') {
          setMoveTargetIdx(prev => Math.min(prev + 1, folders.length));
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          setMoveTargetIdx(prev => Math.max(prev - 1, 0));
          e.preventDefault();
        } else if (e.key === 'Enter') {
          const file = filteredFiles[fileIndex];
          if (file) {
            if (moveTargetIdx === 0) {
              // Move to root
              onMoveFile(file.name, file.path.slice(0, -1), []);
              showStatus(`Moved "${file.name}" to root`);
            } else {
              const target = folders[moveTargetIdx - 1];
              if (target) {
                onMoveFile(file.name, file.path.slice(0, -1), target.path);
                showStatus(`Moved "${file.name}" to ${target.name}`);
              }
            }
          }
          setInputMode('none');
          e.preventDefault();
        }
        return;
      }

      // Global file browser keys
      if (e.key === 'Escape') {
        onClose();
        e.preventDefault();
        return;
      }

      if (e.key === '/') {
        setInputMode('search');
        setInputValue('');
        e.preventDefault();
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        setInputMode('new-folder');
        setInputValue('');
        e.preventDefault();
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        setInputMode('new-file');
        setInputValue('');
        e.preventDefault();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        if (focusPane === 'folders') setFocusPane('files');
        else if (focusPane === 'files') setFocusPane('folders');
        return;
      }

      // Folder pane
      if (focusPane === 'folders') {
        if (e.key === 'ArrowDown') {
          setFolderIndex(prev => Math.min(prev + 1, folderList.length - 1));
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          setFolderIndex(prev => Math.max(prev - 1, 0));
          e.preventDefault();
        } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
          const folder = folderList[folderIndex];
          if (folder) {
            setCurrentPath(folder.path);
            setFileIndex(0);
            setSearchQuery('');
            setFocusPane('files');
            // Expand folder if collapsed
            if (folder.collapsed && folder.path.length > 0) {
              onToggleFolder(folder.path);
            }
          }
          e.preventDefault();
        } else if (e.key === ' ') {
          const folder = folderList[folderIndex];
          if (folder && folder.path.length > 0) {
            onToggleFolder(folder.path);
          }
          e.preventDefault();
        } else if (e.key === 'd' || e.key === 'D') {
          const folder = folderList[folderIndex];
          if (folder && folder.path.length > 0 && folder.path[0] !== 'Deleted') {
            if (confirm(`Delete folder "${folder.path[folder.path.length - 1]}"? It will be moved to Deleted.`)) {
              onDeleteFolder(folder.path);
              showStatus(`Folder moved to Deleted`);
              setFolderIndex(prev => Math.max(0, prev - 1));
            }
          }
          e.preventDefault();
        } else if (e.key === 'u' || e.key === 'U') {
          const folder = folderList[folderIndex];
          if (folder && folder.path.length === 2 && folder.path[0] === 'Deleted') {
            const itemName = folder.path[1];
            if (confirm(`Restore "${itemName}" from Deleted?`)) {
              onRestoreFromDeleted(itemName);
              showStatus(`"${itemName}" restored`);
              setFolderIndex(prev => Math.max(0, prev - 1));
            }
          }
          e.preventDefault();
        } else if (e.key === 'e' || e.key === 'E') {
          const folder = folderList[folderIndex];
          if (folder && folder.path.length === 1 && folder.path[0] === 'Deleted') {
            if (confirm('Permanently empty the Deleted folder? This cannot be undone.')) {
              onEmptyDeleted();
              showStatus('Deleted folder emptied');
            }
          }
          e.preventDefault();
        }
        return;
      }

      // Files pane
      if (focusPane === 'files') {
        if (e.key === 'ArrowDown') {
          setFileIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          setFileIndex(prev => Math.max(prev - 1, 0));
          e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
          setFocusPane('folders');
          e.preventDefault();
        } else if (e.key === 'Enter') {
          const file = filteredFiles[fileIndex];
          if (file) {
            onOpenFile(file.name);
            onClose();
          }
          e.preventDefault();
        } else if (e.key === 'd' || e.key === 'D') {
          const file = filteredFiles[fileIndex];
          if (file) {
            if (confirm(`Move "${file.name}" to Deleted folder?`)) {
              onDeleteFile(file.name);
              showStatus(`Moved to Deleted`);
              setFileIndex(prev => Math.max(0, prev - 1));
            }
          }
          e.preventDefault();
        } else if (e.key === 'r' || e.key === 'R') {
          const file = filteredFiles[fileIndex];
          if (file) {
            setInputMode('rename');
            setInputValue(file.name);
          }
          e.preventDefault();
        } else if (e.key === 'm' || e.key === 'M') {
          const file = filteredFiles[fileIndex];
          if (file) {
            setInputMode('move');
            setMoveTargetIdx(0);
          }
          e.preventDefault();
        } else if (e.key === 'u' || e.key === 'U') {
          if (currentPath[0] === 'Deleted') {
            const file = filteredFiles[fileIndex];
            if (file) {
              if (confirm(`Restore "${file.name}" from Deleted?`)) {
                onRestoreFromDeleted(file.name);
                showStatus(`"${file.name}" restored`);
                setFileIndex(prev => Math.max(0, prev - 1));
              }
            }
          }
          e.preventDefault();
        }
        return;
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [visible, focused, focusPane, folderIndex, fileIndex, inputMode, inputValue, searchQuery,
    moveTargetIdx, folderList, filteredFiles, currentPath, onClose, onOpenFile, onDeleteFile,
    onRenameFile, onMoveFile, onToggleFolder, onRestoreFromDeleted, onNewFolder, getFolders, showStatus]);

  if (!visible) return null;

  const breadcrumb = ['root', ...currentPath].join(' / ');
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
          title="Ctrl+Shift+B or ESC"
        >
          ✕
        </span>
      </div>

      {/* Search bar (when active) */}
      {inputMode === 'search' && (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--terminal-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ opacity: 0.7 }}>/</span>
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search files..."
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
          <span style={{ fontSize: '11px', opacity: 0.5 }}>Enter to confirm • Esc to cancel</span>
        </div>
      )}

      {/* Rename input */}
      {inputMode === 'rename' && (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--terminal-text)', background: 'rgba(51,255,51,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>RENAME TO:</span>
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
                padding: '6px 8px',
                ...termStyle,
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '11px', opacity: 0.5 }}>Enter to confirm • Esc to cancel</span>
          </div>
        </div>
      )}

      {/* New folder input */}
      {inputMode === 'new-folder' && (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--terminal-text)', background: 'rgba(51,255,51,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>NEW FOLDER:</span>
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
                padding: '6px 8px',
                ...termStyle,
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '11px', opacity: 0.5 }}>Enter to create • Esc to cancel</span>
          </div>
        </div>
      )}

      {/* New file input */}
      {inputMode === 'new-file' && (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--terminal-text)', background: 'rgba(51,255,51,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>NEW FILE:</span>
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
                padding: '6px 8px',
                ...termStyle,
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '11px', opacity: 0.5 }}>Enter to create • Esc to cancel</span>
          </div>
          <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
            Creating in: 📂 {['root', ...currentPath].join(' / ')}
          </div>
        </div>
      )}

      {/* Move to folder picker */}
      {inputMode === 'move' && (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--terminal-text)', background: 'rgba(51,255,51,0.05)' }}>
          <div style={{ marginBottom: '8px' }}>
            MOVE "{filteredFiles[fileIndex]?.name}" TO:
          </div>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            <div
              style={{
                padding: '6px 12px',
                background: moveTargetIdx === 0 ? 'var(--terminal-text)' : 'transparent',
                color: moveTargetIdx === 0 ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                cursor: 'pointer',
                margin: '2px 0',
              }}
            >
              📁 root (top level)
            </div>
            {allFolders.map((f, i) => (
              <div
                key={f.path.join('/')}
                style={{
                  padding: '6px 12px',
                  background: moveTargetIdx === i + 1 ? 'var(--terminal-text)' : 'transparent',
                  color: moveTargetIdx === i + 1 ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  cursor: 'pointer',
                  margin: '2px 0',
                }}
              >
                📁 {f.name}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>↑↓ Select • Enter to move • Esc to cancel</div>
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ padding: '4px 12px', fontSize: '11px', opacity: 0.8, borderBottom: '1px solid var(--terminal-text)', flexShrink: 0 }}>
        📂 {breadcrumb}
      </div>

      {/* Folders section */}
      <div
        style={{
          overflowY: 'auto',
          padding: '4px 0',
          opacity: 1,
          borderBottom: '1px solid var(--terminal-text)',
          maxHeight: '35%',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '2px 12px', fontSize: '10px', opacity: 0.7, letterSpacing: '2px' }}>
          FOLDERS
        </div>
        {folderList.map((folder, i) => {
          const isFocused = focusPane === 'folders' && folderIndex === i;
          const isSelected = JSON.stringify(folder.path) === JSON.stringify(currentPath);

          return (
            <div
              key={folder.path.join('/') || 'root'}
              onClick={() => {
                setFolderIndex(i);
                setCurrentPath(folder.path);
                setFileIndex(0);
                setSearchQuery('');
                setFocusPane('folders');
                // Toggle collapse on click for non-root folders
                if (folder.path.length > 0) {
                  onToggleFolder(folder.path);
                }
              }}
              style={{
                padding: '5px 8px',
                paddingLeft: `${8 + folder.depth * 14}px`,
                cursor: 'pointer',
                background: isFocused
                  ? 'var(--terminal-text)'
                  : isSelected
                    ? 'rgba(51, 255, 51, 0.1)'
                    : 'transparent',
                color: isFocused ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '13px',
                borderLeft: isSelected && !isFocused ? '3px solid var(--terminal-text)' : '3px solid transparent',
              }}
            >
              {folder.depth > 0 && (
                <span style={{ fontSize: '9px', userSelect: 'none' }}>
                  {folder.collapsed ? '▶' : '▼'}
                </span>
              )}
              <span style={{ fontSize: '12px' }}>{folder.depth === 0 ? '🖥️' : '📁'}</span>
              <span style={{ fontWeight: isSelected ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
            </div>
          );
        })}
      </div>

      {/* Files section */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
          opacity: 1,
        }}
      >
        <div style={{ padding: '2px 12px', fontSize: '10px', opacity: 0.7, letterSpacing: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            FILES ({filteredFiles.length})
            {searchQuery && <span> — "{searchQuery}"</span>}
          </span>
          {currentPath.length === 1 && currentPath[0] === 'Deleted' && filteredFiles.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Permanently empty the Deleted folder? This cannot be undone.')) {
                  onEmptyDeleted();
                  showStatus('Deleted folder emptied');
                }
              }}
              style={{ cursor: 'pointer', fontSize: '10px', opacity: 0.9, color: '#ff5555' }}
              title="E to empty"
            >
              🗑 Empty
            </span>
          )}
        </div>

        {filteredFiles.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', opacity: 0.7, fontSize: '12px' }}>
            {searchQuery ? 'No matches' : 'Empty folder'}
            <div style={{ marginTop: '4px', fontSize: '11px' }}>
              N New Folder • C New File
            </div>
          </div>
        ) : (
          filteredFiles.map((file, i) => {
            const isFocused = focusPane === 'files' && fileIndex === i;
            const doc = allDocuments[file.name];
            const words = doc?.content ? doc.content.split(/\s+/).filter(Boolean).length : 0;
            const displayName = file.name.includes('/') ? file.name.split('/').pop() || file.name : file.name;
            const lastMod = doc?.lastModified ? new Date(doc.lastModified) : null;
            const dateStr = lastMod ? lastMod.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

            return (
              <div
                key={file.name}
                onClick={() => {
                  setFileIndex(i);
                  setFocusPane('files');
                }}
                onDoubleClick={() => {
                  onOpenFile(file.name);
                }}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  background: isFocused ? 'var(--terminal-text)' : 'transparent',
                  color: isFocused ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  borderBottom: '1px solid rgba(51,255,51,0.1)',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px' }}>📄</span>
                  <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                </div>
                <div style={{ fontSize: '10px', marginTop: '1px', paddingLeft: '20px', display: 'flex', gap: '10px' }}>
                  <span>{words} words</span>
                  {dateStr && <span>{dateStr}</span>}
                </div>
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

      {/* Clickable action buttons */}
      <div
        style={{
          borderTop: '2px solid var(--terminal-text)',
          padding: '6px 8px',
          fontSize: '10px',
          opacity: 0.8,
          flexShrink: 0,
          lineHeight: 1.6,
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
          { key: 'Tab', label: 'Pane' },
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
        {/* Cloud sync buttons */}
        {onSyncGoogleDrive && (
          <button
            onClick={(e) => { e.stopPropagation(); onSyncGoogleDrive(); }}
            style={{ ...actionBtnStyle, borderTop: '1px solid var(--terminal-text)', marginTop: '2px', paddingTop: '4px' }}
            title="Sync all files to Google Drive"
          >
            ☁ Sync Drive
          </button>
        )}
        {onSyncICloud && (
          <button
            onClick={(e) => { e.stopPropagation(); onSyncICloud(); }}
            style={actionBtnStyle}
            title="Sync all files to iCloud"
          >
            🍎 Sync iCloud
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
