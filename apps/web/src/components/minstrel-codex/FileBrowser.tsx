import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { FileNode, DocumentData } from '@minstrelcodex/core';

// ── Drag-and-drop state ───────────────────────────────────────────────────────
interface DragState {
  itemPath: string[];   // path of the dragged item
  itemType: 'file' | 'folder';
  itemName: string;
}

// Drop position: 'into' means move into folder, 'before'/'after' means reorder
interface DropIndicator {
  index: number;
  position: 'before' | 'after' | 'into';
}


// ── Graphic folder icon (yellow) ──────────────────────────────────────────────
function FolderIcon({ open = false, isDeleted = false, size = 18 }: { open?: boolean; isDeleted?: boolean; size?: number }) {
  const color = isDeleted ? '#e05c5c' : '#f5c542';
  const shadow = isDeleted ? 'drop-shadow(0 0 3px rgba(224,92,92,0.6))' : 'drop-shadow(0 0 4px rgba(245,197,66,0.5))';
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 20 16" fill="none" style={{ flexShrink: 0, filter: shadow }}>
      {/* folder back */}
      <rect x="0" y="3" width="20" height="13" rx="2" fill={color} opacity="0.25" />
      {/* tab */}
      <path d={`M0 5 Q0 3 2 3 L${open ? 7 : 6} 3 Q${open ? 8.5 : 7.5} 3 ${open ? 9 : 8} 1.5 L${open ? 10 : 9} 0 Q${open ? 10.5 : 9.5} -0.2 11 0 L18 0 Q20 0 20 2 L20 5 Z`} fill={color} />
      {/* folder body */}
      <rect x="0" y="4.5" width="20" height="11.5" rx="2" fill={color} />
      {/* highlight line */}
      <rect x="2" y="6.5" width="16" height="1.2" rx="0.6" fill="white" opacity="0.18" />
    </svg>
  );
}

// ── Graphic file/doc icon ─────────────────────────────────────────────────────
function FileIcon({ isDeleted = false, focused = false, size = 18 }: { isDeleted?: boolean; focused?: boolean; size?: number }) {
  const color = isDeleted ? (focused ? '#000' : '#e05c5c') : (focused ? '#000' : 'var(--terminal-text)');
  const accent = isDeleted ? '#e05c5c' : 'var(--terminal-text)';
  const s = size;
  return (
    <svg width={s} height={Math.round(s * 1.2)} viewBox="0 0 16 20" fill="none" style={{ flexShrink: 0, opacity: isDeleted && !focused ? 0.6 : 1 }}>
      {/* page body */}
      <rect x="0" y="0" width="13" height="18" rx="2" fill={color} opacity={focused ? 0.9 : 0.12} stroke={accent} strokeWidth="1.2" />
      {/* dog-ear fold */}
      <path d="M9 0 L13 4 L9 4 Z" fill={accent} opacity={focused ? 0.5 : 0.4} />
      {/* lines */}
      <rect x="2" y="6.5" width="7" height="1" rx="0.5" fill={accent} opacity={focused ? 0.6 : 0.5} />
      <rect x="2" y="9" width="9" height="1" rx="0.5" fill={accent} opacity={focused ? 0.6 : 0.4} />
      <rect x="2" y="11.5" width="6" height="1" rx="0.5" fill={accent} opacity={focused ? 0.6 : 0.35} />
    </svg>
  );
}


export interface FileBrowserProps {
  visible: boolean;
  focused: boolean;
  rootNode: FileNode;
  allDocuments: Record<string, DocumentData>;
  currentFilename?: string;
  currentContent?: string;
  onClose: () => void;
  onOpenFile: (filename: string) => void;
  onNewFile: () => void;
  onCreateFile: (filename: string, folderPath: string[]) => void;
  onNewFolder: (name: string) => void;
  onDeleteFile: (filename: string) => void;
  onDeleteFolder: (folderPath: string[]) => void;
  onRenameFile: (oldName: string, newName: string) => void;
  onMoveFile: (filename: string, fromPath: string[], toPath: string[]) => void;
  onMoveFolder: (folderName: string, fromPath: string[], toPath: string[]) => void;
  onReorderItem: (itemName: string, parentPath: string[], targetName: string, position: 'before' | 'after') => void;
  onToggleFolder: (path: string[]) => void;
  onRestoreFromDeleted: (itemName: string) => void;
  onPermanentlyDeleteItem: (itemKey: string) => void;
  onEmptyDeleted: () => void;
  onFocus: () => void;
  getFolders: () => { name: string; path: string[] }[];
  onSyncGoogleDrive?: () => void;
  onSyncICloud?: () => void;
}

type InputMode = 'none' | 'search' | 'rename' | 'new-folder' | 'new-file' | 'move';

interface FlatItem {
  name: string;
  docKey?: string; // The document storage key (FileNode.name) — may differ from tree key for files in subfolders
  type: 'file' | 'folder';
  path: string[];
  depth: number;
  collapsed?: boolean;
}

function flattenTree(node: FileNode, path: string[] = [], depth: number = 0): FlatItem[] {
  const result: FlatItem[] = [];
  const children = node.children || {};

  // Use childOrder if available, otherwise sort folders first then alphabetically
  let keys: string[];
  if (node.childOrder && node.childOrder.length > 0) {
    // Start with ordered keys, then append any missing ones
    const ordered = node.childOrder.filter(k => k in children);
    const remaining = Object.keys(children).filter(k => !ordered.includes(k));
    keys = [...ordered, ...remaining];
  } else {
    keys = Object.keys(children).sort((a, b) => {
      const aFolder = children[a].type === 'folder';
      const bFolder = children[b].type === 'folder';
      if (aFolder && !bFolder) return -1;
      if (!aFolder && bFolder) return 1;
      return a.localeCompare(b);
    });
  }

  for (const name of keys) {
    const item = children[name];
    const itemPath = [...path, name];
    result.push({ name, docKey: item.type === 'file' ? item.name : undefined, type: item.type, path: itemPath, depth, collapsed: item.collapsed });
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
  currentFilename,
  currentContent,
  onClose,
  onOpenFile,
  onCreateFile,
  onNewFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onMoveFile,
  onMoveFolder,
  onReorderItem,
  onToggleFolder,
  onRestoreFromDeleted,
  onPermanentlyDeleteItem,
  onEmptyDeleted,
  onFocus,
  getFolders,
  onSyncGoogleDrive,
  onSyncICloud,
}: FileBrowserProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [inputValue, setInputValue] = useState('');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string[] | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
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
      // Don't capture keys when the editor (ProseMirror) is focused
      const target = e.target as HTMLElement;
      if (target?.closest?.('.ProseMirror')) return;
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
      if (e.key === 'n' && !e.shiftKey) { setInputMode('new-file'); setInputValue(''); e.preventDefault(); return; }
      if (e.key === 'N' && e.shiftKey) { setInputMode('new-folder'); setInputValue(''); e.preventDefault(); return; }

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
            onOpenFile(item.docKey || item.name);
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
          const isInDeleted = item.path[0] === 'Deleted';
          if (isInDeleted) {
            // Permanently delete items already in Deleted folder
            const key = item.type === 'file' ? item.name : item.path.slice(1).join('/');
            onPermanentlyDeleteItem(key);
            showStatus('Permanently deleted');
          } else if (item.type === 'file') {
            onDeleteFile(item.name);
            showStatus('Moved to Deleted');
          } else {
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

  const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

  return (
    <div
      onClick={onFocus}
      style={{
        width: '280px',
        minWidth: '280px',
        background: 'var(--terminal-bg)',
        borderRight: focused ? '1px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: uiFont,
        color: 'var(--terminal-text)',
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: '1px solid var(--terminal-border)',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          background: 'var(--terminal-surface)',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: uiFont, opacity: 0.65, display: 'flex', alignItems: 'center', gap: '7px' }}>
          <FolderIcon open size={16} /> Files
        </span>
        <button
          onClick={onClose}
          title="Esc to close"
          style={{
            background: 'transparent',
            border: '1px solid var(--terminal-border)',
            borderRadius: '6px',
            color: 'var(--terminal-text)',
            opacity: 0.45,
            cursor: 'pointer',
            width: '22px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            lineHeight: 1,
            fontFamily: uiFont,
            transition: 'opacity 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-accent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.45'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-border)'; }}
        >
          ✕
        </button>
      </div>

      {/* Search bar */}
      {inputMode === 'search' && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--terminal-border)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--terminal-surface)' }}>
          <span style={{ opacity: 0.35, fontSize: '11px', fontFamily: uiFont }}>⌕</span>
          <input ref={inputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search files…" autoFocus
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--terminal-text)', fontFamily: uiFont, fontSize: '12px' }} />
        </div>
      )}

      {/* Inline input bar (rename / new-folder / new-file) */}
      {(inputMode === 'rename' || inputMode === 'new-folder' || inputMode === 'new-file') && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--terminal-border)', background: 'var(--terminal-surface)' }}>
          <div style={{ fontSize: '10px', opacity: 0.4, fontFamily: uiFont, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '7px' }}>
            {inputMode === 'rename' ? 'Rename File' : inputMode === 'new-folder' ? 'New Folder' : 'New File'}
          </div>
          <input ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} autoFocus
            placeholder={inputMode === 'new-file' ? 'filename.txt' : inputMode === 'new-folder' ? 'Folder name…' : ''}
            style={{ width: '100%', background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)', borderRadius: '8px', color: 'var(--terminal-text)', padding: '7px 10px', fontFamily: uiFont, fontSize: '12px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--terminal-accent)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--terminal-border)'; }}
          />
          {inputMode === 'new-file' && (
            <div style={{ fontSize: '10px', opacity: 0.35, marginTop: '5px', fontFamily: uiFont }}>
              In: {getSelectedFolderPath().join('/') || 'root'}
            </div>
          )}
        </div>
      )}

      {/* Move picker */}
      {inputMode === 'move' && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--terminal-border)', background: 'var(--terminal-surface)' }}>
          <div style={{ fontSize: '10px', opacity: 0.4, fontFamily: uiFont, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '7px' }}>Move to folder</div>
          <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {[{ path: [] as string[], name: 'Root' }, ...allFolders].map((f, i) => (
              <div key={i} onClick={() => setMoveTargetIdx(i)}
                style={{ padding: '6px 10px', borderRadius: '8px', background: moveTargetIdx === i ? 'var(--terminal-accent)' : 'var(--terminal-bg)', color: moveTargetIdx === i ? 'var(--terminal-bg)' : 'var(--terminal-text)', cursor: 'pointer', fontSize: '12px', fontFamily: uiFont, transition: 'background 0.1s', border: `1px solid ${moveTargetIdx === i ? 'var(--terminal-accent)' : 'var(--terminal-border)'}`, display: 'flex', alignItems: 'center', gap: '7px' }}>
                <FolderIcon size={14} /> {f.name}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.3, marginTop: '6px', fontFamily: uiFont }}>↑↓ navigate · Enter confirm · Esc cancel</div>
        </div>
      )}

      {/* Unified file tree */}
      <div
        ref={listRef}
        onDragOver={(e) => {
          // Root-level drop zone — only activate when not hovering a row
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          // Only fire if the drop landed on the container, not a child row
          if ((e.target as HTMLElement).closest('.file-browser-row')) return;
          e.preventDefault();
          const srcPath: string[] = JSON.parse(e.dataTransfer.getData('application/x-pw-path') || '[]');
          const srcType = e.dataTransfer.getData('application/x-pw-type') as 'file' | 'folder';
          const srcName = e.dataTransfer.getData('application/x-pw-name');
          if (!srcName || !srcPath.length) return;
          if (srcPath.slice(0, -1).length === 0) return; // already at root
          if (srcType === 'file') {
            onMoveFile(srcName, srcPath.slice(0, -1), []);
            showStatus('Moved to root');
          } else if (srcType === 'folder') {
            onMoveFolder(srcName, srcPath.slice(0, -1), []);
            showStatus('Folder moved to root');
          }
          setDragState(null);
          setDropTargetPath(null);
        }}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 6px',
        }}
      >
        {filteredItems.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', opacity: 0.35, fontSize: '12px', fontFamily: uiFont }}>
            {searchQuery ? 'No matches' : 'No files yet'}
          </div>
        ) : (
          filteredItems.map((item, i) => {
            const isFocused = selectedIndex === i;
            const isFolder = item.type === 'folder';
            const fileKey = item.docKey || item.name;
            const doc = !isFolder ? allDocuments[fileKey] : null;
            // Use live content for the currently open file, otherwise use saved content
            const liveContent = (!isFolder && fileKey === currentFilename && currentContent != null)
              ? currentContent
              : doc?.content;
            const words = liveContent ? liveContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length : 0;
            const displayName = item.name.includes('/') ? item.name.split('/').pop() || item.name : item.name;
            const isDeleted = item.path[0] === 'Deleted';
            const isDropTarget = isFolder && dropTargetPath !== null && dropTargetPath.join('/') === item.path.join('/');
            const showDropBefore = dropIndicator?.index === i && dropIndicator.position === 'before';
            const showDropAfter = dropIndicator?.index === i && dropIndicator.position === 'after';

            return (
              <div
                key={item.path.join('/') + item.type}
                data-idx={i}
                data-drop-target={isDropTarget ? 'true' : undefined}
                style={{ position: 'relative' }}
              >
                {/* Drop indicator line — before */}
                {showDropBefore && (
                  <div style={{
                    position: 'absolute', top: 0, left: `${10 + item.depth * 16}px`, right: '8px',
                    height: '2px', background: 'var(--terminal-accent)', borderRadius: '1px', zIndex: 10,
                  }} />
                )}
              <div
                data-idx={i}
                draggable
                onDragStart={(e) => {
                  setDragState({ itemPath: item.path, itemType: item.type, itemName: item.name });
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('application/x-pw-path', JSON.stringify(item.path));
                  e.dataTransfer.setData('application/x-pw-type', item.type);
                  e.dataTransfer.setData('application/x-pw-name', item.name);
                }}
                onDragEnd={() => {
                  setDragState(null);
                  setDropTargetPath(null);
                  setDropIndicator(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const srcPath: string[] = dragState?.itemPath ?? [];
                  const srcStr = srcPath.join('/');

                  // Determine drop position based on mouse Y within the row
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const ratio = y / rect.height;

                  // Check if same parent (reorder scenario)
                  const srcParent = srcPath.slice(0, -1).join('/');
                  const itemParent = item.path.slice(0, -1).join('/');
                  const sameParent = srcParent === itemParent;
                  const isSelf = srcStr === item.path.join('/');

                  if (isSelf) return;

                  if (sameParent && !isFolder) {
                    // Reorder: show before/after indicator
                    const pos = ratio < 0.5 ? 'before' : 'after';
                    setDropIndicator({ index: i, position: pos });
                    setDropTargetPath(null);
                    e.dataTransfer.dropEffect = 'move';
                  } else if (sameParent && isFolder) {
                    // Folder in same parent: top third = before, bottom third = after, middle = into
                    if (ratio < 0.3) {
                      setDropIndicator({ index: i, position: 'before' });
                      setDropTargetPath(null);
                    } else if (ratio > 0.7) {
                      setDropIndicator({ index: i, position: 'after' });
                      setDropTargetPath(null);
                    } else {
                      setDropIndicator(null);
                      const target = item.path;
                      const destStr = target.join('/');
                      if (destStr === srcStr || destStr.startsWith(srcStr + '/')) return;
                      setDropTargetPath(target);
                    }
                    e.dataTransfer.dropEffect = 'move';
                  } else {
                    // Different parent: move into folder or reorder
                    if (isFolder) {
                      const target = item.path;
                      const destStr = target.join('/');
                      if (destStr === srcStr || destStr.startsWith(srcStr + '/')) return;
                      setDropTargetPath(target);
                      setDropIndicator(null);
                    } else {
                      // Drop onto a file in different folder = move into that file's parent
                      const target = item.path.slice(0, -1);
                      const destStr = target.join('/');
                      if (destStr === srcStr || destStr.startsWith(srcStr + '/')) return;
                      setDropTargetPath(target);
                      setDropIndicator(null);
                    }
                    e.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDragLeave={(e) => {
                  const related = e.relatedTarget as Node | null;
                  if (!related || !e.currentTarget.contains(related)) {
                    setDropTargetPath(null);
                    setDropIndicator(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const srcPath: string[] = JSON.parse(e.dataTransfer.getData('application/x-pw-path') || '[]');
                  const srcType = e.dataTransfer.getData('application/x-pw-type') as 'file' | 'folder';
                  const srcName = e.dataTransfer.getData('application/x-pw-name');
                  if (!srcName || !srcPath.length) { setDragState(null); setDropTargetPath(null); setDropIndicator(null); return; }

                  // Check if this is a reorder operation
                  if (dropIndicator && dropIndicator.index === i && (dropIndicator.position === 'before' || dropIndicator.position === 'after')) {
                    const srcParent = srcPath.slice(0, -1).join('/');
                    const itemParent = item.path.slice(0, -1).join('/');
                    if (srcParent === itemParent) {
                      // Same parent — reorder
                      const parentPath = item.path.slice(0, -1);
                      const targetKey = item.path[item.path.length - 1];
                      onReorderItem(srcName, parentPath, targetKey, dropIndicator.position);
                      showStatus('Reordered');
                      setDragState(null); setDropTargetPath(null); setDropIndicator(null);
                      return;
                    }
                  }

                  // Destination folder: drop onto folder = move into it; drop onto file = move into its parent
                  const destPath = isFolder ? item.path : item.path.slice(0, -1);
                  const srcParentStr = srcPath.slice(0, -1).join('/');
                  const destStr = destPath.join('/');

                  if (destStr === srcParentStr) { setDragState(null); setDropTargetPath(null); setDropIndicator(null); return; }
                  if (destStr.startsWith(srcPath.join('/'))) { setDragState(null); setDropTargetPath(null); setDropIndicator(null); return; }

                  if (srcType === 'file') {
                    onMoveFile(srcName, srcPath.slice(0, -1), destPath);
                    showStatus(`Moved to ${destPath.join('/') || 'root'}`);
                  } else if (srcType === 'folder') {
                    onMoveFolder(srcName, srcPath.slice(0, -1), destPath);
                    showStatus(`Folder moved to ${destPath.join('/') || 'root'}`);
                  }
                  setDragState(null);
                  setDropTargetPath(null);
                  setDropIndicator(null);
                }}
                onClick={() => {
                  setSelectedIndex(i);
                  if (isFolder) onToggleFolder(item.path);
                  else onOpenFile(item.docKey || item.name);
                }}
                className="file-browser-row"
                style={{
                  padding: '6px 10px',
                  paddingLeft: `${10 + item.depth * 16}px`,
                  cursor: dragState ? 'grabbing' : 'pointer',
                  background: isDropTarget ? 'var(--terminal-accent)' : isFocused ? 'var(--terminal-surface)' : 'transparent',
                  color: isDropTarget ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: '12px',
                  fontFamily: uiFont,
                  opacity: dragState && dragState.itemPath.join('/') === item.path.join('/') ? 0.35 : (isDeleted && !isFocused ? 0.4 : 1),
                  transition: 'background 0.12s, opacity 0.12s',
                  borderLeft: isFocused ? '3px solid var(--terminal-accent)' : '3px solid transparent',
                  borderRadius: '0 8px 8px 0',
                  marginRight: '4px',
                }}
              >
                {/* Drag handle — shown on row hover via CSS */}
                <span
                  className="drag-handle"
                  title="Drag to move"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '10px',
                    flexShrink: 0,
                    opacity: 0,
                    transition: 'opacity 0.15s',
                    cursor: 'grab',
                    fontSize: '10px',
                    color: 'var(--terminal-text)',
                    userSelect: 'none',
                  }}
                >⠿</span>

                {isFolder && (
                  <span style={{ display: 'flex', alignItems: 'center', width: '11px', justifyContent: 'center', flexShrink: 0 }}>
                    {item.collapsed
                      ? <ChevronRight size={10} style={{ opacity: 0.45 }} />
                      : <ChevronDown size={10} style={{ opacity: 0.45 }} />}
                  </span>
                )}
                {!isFolder && <span style={{ width: '11px', flexShrink: 0 }} />}

                {isFolder
                  ? <FolderIcon open={!item.collapsed} isDeleted={item.name === 'Deleted'} size={16} />
                  : <FileIcon isDeleted={isDeleted} focused={false} size={16} />
                }

                <span style={{
                  fontWeight: isFolder ? '600' : '400',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  letterSpacing: isFolder ? '0.02em' : 'normal',
                  opacity: isFocused ? 1 : 0.8,
                  fontSize: isFolder ? '11px' : '12px',
                }}>
                  {displayName}
                </span>
                {!isFolder && (doc || item.name === currentFilename) && (
                  <span style={{
                    fontSize: '10px',
                    opacity: isFocused ? 0.5 : 0.25,
                    whiteSpace: 'nowrap',
                    fontFamily: uiFont,
                    letterSpacing: '0.02em',
                  }}>
                    {words}w
                  </span>
                )}
              </div>
                {/* Drop indicator line — after */}
                {showDropAfter && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: `${10 + item.depth * 16}px`, right: '8px',
                    height: '2px', background: 'var(--terminal-accent)', borderRadius: '1px', zIndex: 10,
                  }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Status message */}
      {statusMessage && (
        <div style={{
          padding: '6px 14px',
          borderTop: '1px solid var(--terminal-border)',
          background: 'var(--terminal-surface)',
          fontSize: '11px',
          textAlign: 'center',
          flexShrink: 0,
          fontFamily: uiFont,
          color: 'var(--terminal-accent)',
        }}>
          ✓ {statusMessage}
        </div>
      )}

      {/* Action bar */}
      <div
        style={{
          borderTop: '1px solid rgba(0,0,0,0.07)',
          padding: '10px 12px 12px',
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px',
          fontFamily: uiFont,
          background: 'rgba(0,0,0,0.02)',
        }}
      >
        {[
          { key: 'Enter', label: 'Open' },
          { key: 'n', label: 'New File' },
          { key: 'N', label: 'New Folder', shift: true },
          { key: 'r', label: 'Rename' },
          { key: 'm', label: 'Move' },
          { key: 'd', label: 'Delete' },
          { key: '/', label: 'Search' },
        ].map(({ key, label, shift }: { key: string; label: string; shift?: boolean }) => (
          <button
            key={key + label}
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey: !!shift, bubbles: true }));
            }}
            title={`${shift ? 'Shift+' : ''}${key} — ${label}`}
            style={{
              background: 'var(--terminal-bg)',
              border: '1px solid var(--terminal-border)',
              borderRadius: '7px',
              color: 'var(--terminal-text)',
              cursor: 'pointer',
              padding: '3px 8px',
              fontFamily: uiFont,
              fontSize: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              opacity: 0.75,
              transition: 'opacity 0.12s, border-color 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-accent)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-border)'; }}
          >
            <span style={{
              display: 'inline-block',
              padding: '1px 5px',
              background: 'var(--terminal-surface)',
              border: '1px solid var(--terminal-border)',
              borderRadius: '4px',
              fontSize: '9px',
              fontFamily: "'Courier Prime', monospace",
              lineHeight: 1.4,
              opacity: 0.4,
            }}>{key === 'Enter' ? '↵' : shift ? `⇧${key}` : key}</span>
            {label}
          </button>
        ))}
        {onSyncGoogleDrive && (
          <button
            onClick={(e) => { e.stopPropagation(); onSyncGoogleDrive!(); }}
            style={{
              background: 'var(--terminal-bg)',
              border: '1px solid var(--terminal-border)',
              borderRadius: '7px',
              color: 'var(--terminal-text)',
              cursor: 'pointer',
              padding: '3px 8px',
              fontFamily: uiFont,
              fontSize: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              opacity: 0.75,
            }}
          >
            ☁ Sync
          </button>
        )}
      </div>
    </div>
  );
}
