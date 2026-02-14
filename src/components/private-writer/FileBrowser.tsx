import { useState, useEffect, useCallback, useRef } from 'react';
import type { FileNode, DocumentData } from '@/lib/types';

export interface FileBrowserProps {
  visible: boolean;
  rootNode: FileNode;
  allDocuments: Record<string, DocumentData>;
  onClose: () => void;
  onOpenFile: (filename: string) => void;
  onNewFile: () => void;
  onCreateFile: (filename: string, folderPath: string[]) => void;
  onNewFolder: (name: string) => void;
  onDeleteFile: (filename: string) => void;
  onRenameFile: (oldName: string, newName: string) => void;
  onMoveFile: (filename: string, fromPath: string[], toPath: string[]) => void;
  onToggleFolder: (path: string[]) => void;
  getFolders: () => { name: string; path: string[] }[];
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
  rootNode,
  allDocuments,
  onClose,
  onOpenFile,
  onNewFile,
  onCreateFile,
  onNewFolder,
  onDeleteFile,
  onRenameFile,
  onMoveFile,
  onToggleFolder,
  getFolders,
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
    if (!visible) return;

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
            if (confirm(`Delete "${file.name}"?`)) {
              onDeleteFile(file.name);
              showStatus(`Deleted "${file.name}"`);
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
        }
        return;
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [visible, focusPane, folderIndex, fileIndex, inputMode, inputValue, searchQuery,
    moveTargetIdx, folderList, filteredFiles, onClose, onOpenFile, onDeleteFile,
    onRenameFile, onMoveFile, onToggleFolder, onNewFolder, getFolders, showStatus]);

  if (!visible) return null;

  const breadcrumb = ['root', ...currentPath].join(' / ');
  const allFolders = getFolders();

  const termStyle: React.CSSProperties = {
    fontFamily: "'Courier Prime', 'Courier New', monospace",
    color: 'var(--terminal-text)',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--terminal-bg)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        ...termStyle,
      }}
    >
      {/* Header with breadcrumb */}
      <div
        style={{
          borderBottom: '2px solid var(--terminal-text)',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', textShadow: '0 0 10px var(--terminal-glow)' }}>
            FILE BROWSER
          </span>
          <span style={{ opacity: 0.6, fontSize: '14px' }}>│</span>
          <span style={{ fontSize: '14px', opacity: 0.8 }}>
            📂 {breadcrumb}
          </span>
        </div>
        <span style={{ fontSize: '12px', opacity: 0.5 }}>ESC to close</span>
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

      {/* Main content: split pane */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left pane: Folders */}
        <div
          style={{
            width: '280px',
            borderRight: '2px solid var(--terminal-text)',
            overflowY: 'auto',
            padding: '8px 0',
            opacity: focusPane === 'folders' ? 1 : 0.5,
          }}
        >
          <div style={{ padding: '4px 12px', fontSize: '11px', opacity: 0.5, marginBottom: '4px', letterSpacing: '2px' }}>
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
                }}
                style={{
                  padding: '8px 12px',
                  paddingLeft: `${12 + folder.depth * 16}px`,
                  cursor: 'pointer',
                  background: isFocused
                    ? 'var(--terminal-text)'
                    : isSelected
                      ? 'rgba(51, 255, 51, 0.1)'
                      : 'transparent',
                  color: isFocused ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderLeft: isSelected && !isFocused ? '3px solid var(--terminal-text)' : '3px solid transparent',
                }}
              >
                {folder.depth > 0 && (
                  <span style={{ fontSize: '10px', userSelect: 'none' }}>
                    {folder.collapsed ? '▶' : '▼'}
                  </span>
                )}
                <span>{folder.depth === 0 ? '🖥️' : '📁'}</span>
                <span style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>{folder.name}</span>
              </div>
            );
          })}
        </div>

        {/* Right pane: Files */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
            opacity: focusPane === 'files' ? 1 : 0.6,
          }}
        >
          <div style={{ padding: '4px 16px', fontSize: '11px', opacity: 0.5, marginBottom: '4px', letterSpacing: '2px' }}>
            FILES IN {breadcrumb.toUpperCase()} ({filteredFiles.length})
            {searchQuery && <span> — searching "{searchQuery}"</span>}
          </div>

          {filteredFiles.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.4 }}>
              {searchQuery ? 'No files match your search' : 'No files in this folder'}
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                Press N to create a new folder • Ctrl+N for a new file
              </div>
            </div>
          ) : (
            filteredFiles.map((file, i) => {
              const isFocused = focusPane === 'files' && fileIndex === i;
              const doc = allDocuments[file.name];
              const modified = doc?.lastModified ? new Date(doc.lastModified).toLocaleString() : 'Unknown';
              const size = doc?.content ? `${doc.content.length} chars` : '0 chars';
              const words = doc?.content ? doc.content.split(/\s+/).filter(Boolean).length : 0;

              return (
                <div
                  key={file.name}
                  onClick={() => {
                    setFileIndex(i);
                    setFocusPane('files');
                  }}
                  onDoubleClick={() => {
                    onOpenFile(file.name);
                    onClose();
                  }}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: isFocused ? 'var(--terminal-text)' : 'transparent',
                    color: isFocused ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                    borderBottom: '1px solid rgba(51,255,51,0.15)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>📄</span>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{file.name}</div>
                      <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '2px' }}>
                        {words} words • {size}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.5, textAlign: 'right' }}>
                    {modified}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div style={{
          padding: '6px 20px',
          borderTop: '1px solid var(--terminal-text)',
          background: 'rgba(51,255,51,0.1)',
          fontSize: '13px',
          textAlign: 'center',
        }}>
          ✓ {statusMessage}
        </div>
      )}

      {/* Action bar */}
      <div
        style={{
          borderTop: '2px solid var(--terminal-text)',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '20px' }}>
          <span style={{ opacity: 0.7 }}>
            <kbd style={kbdStyle}>Enter</kbd> Open
          </span>
          <span style={{ opacity: 0.7 }}>
            <kbd style={kbdStyle}>M</kbd> Move
          </span>
          <span style={{ opacity: 0.7 }}>
            <kbd style={kbdStyle}>R</kbd> Rename
          </span>
          <span style={{ opacity: 0.7 }}>
            <kbd style={kbdStyle}>D</kbd> Delete
          </span>
          <span style={{ opacity: 0.7 }}>
            <kbd style={kbdStyle}>N</kbd> New Folder
          </span>
          <span style={{ opacity: 0.7 }}>
            <kbd style={kbdStyle}>C</kbd> New File
          </span>
          <span style={{ opacity: 0.7 }}>
            <kbd style={kbdStyle}>/</kbd> Search
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ opacity: 0.5 }}>
            <kbd style={kbdStyle}>Tab</kbd> Switch Pane
          </span>
          <span style={{ opacity: 0.5 }}>
            <kbd style={kbdStyle}>Space</kbd> Expand/Collapse
          </span>
          <span style={{ opacity: 0.5 }}>
            <kbd style={kbdStyle}>Esc</kbd> Close
          </span>
        </div>
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
