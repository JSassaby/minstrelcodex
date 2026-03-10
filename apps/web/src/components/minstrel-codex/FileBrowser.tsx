import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, ChevronDown, Book, BookOpen, FilePlus, MoreHorizontal } from 'lucide-react';
import { DESIGN_TOKENS as DT } from '@minstrelcodex/core';
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
  onNewFolder: () => void;
  onCreateFolder: (name: string) => void;
  onDeleteFile: (filename: string, fromPath: string[]) => void;
  onDeleteFolder: (folderPath: string[]) => void;
  onRenameFile: (oldName: string, newName: string) => void;
  onMoveFile: (filename: string, fromPath: string[], toPath: string[]) => void;
  onMoveFolder: (folderName: string, fromPath: string[], toPath: string[]) => void;
  onReorderItem: (itemName: string, parentPath: string[], targetName: string, position: 'before' | 'after') => void;
  onToggleFolder: (path: string[]) => void;
  onRestoreFromDeleted: (itemPath: string[]) => void;
  onPermanentlyDeleteItem: (itemKey: string, binPath: string[]) => void;
  onEmptyDeleted: (binPath: string[]) => void;
  onFocus: () => void;
  getFolders: () => { name: string; path: string[] }[];
  onRename?: (itemName: string) => void;
  onMove?: (itemName: string) => void;
  onDelete?: (itemName: string) => void;
  onSearch?: () => void;
  onCreateSubfolder: (name: string, parentPath: string[]) => void;
  onSyncGoogleDrive?: () => void;
  onSyncICloud?: () => void;
  onOpenProjectSettings?: (folderName: string) => void;
}

type InputMode = 'none' | 'search' | 'rename' | 'move';

interface FlatItem {
  name: string;
  docKey?: string; // The document storage key (FileNode.name) — may differ from tree key for files in subfolders
  type: 'file' | 'folder';
  path: string[];
  depth: number;
  collapsed?: boolean;
  childCount?: number; // only set for Recycle Bin folders
}

function flattenTree(node: FileNode, path: string[] = [], depth: number = 0): FlatItem[] {
  const result: FlatItem[] = [];
  const children = node.children || {};

  // Skip legacy global Deleted folder and root-level Recycle Bin (pre-migration artifact)
  const childKeys = Object.keys(children).filter(k => {
    if (k === 'Deleted') return false;
    if (depth === 0 && k === 'Recycle Bin') return false;
    return true;
  });

  // Use childOrder if available, otherwise sort folders first then alphabetically
  let keys: string[];
  if (node.childOrder && node.childOrder.length > 0) {
    const ordered = node.childOrder.filter(k => childKeys.includes(k) && k !== 'Recycle Bin');
    const remaining = childKeys.filter(k => !ordered.includes(k) && k !== 'Recycle Bin');
    keys = [...ordered, ...remaining];
  } else {
    keys = childKeys.filter(k => k !== 'Recycle Bin').sort((a, b) => {
      const aFolder = children[a].type === 'folder';
      const bFolder = children[b].type === 'folder';
      if (aFolder && !bFolder) return -1;
      if (!aFolder && bFolder) return 1;
      return a.localeCompare(b);
    });
  }
  // Always put Recycle Bin last
  if ('Recycle Bin' in children) keys.push('Recycle Bin');

  for (const name of keys) {
    const item = children[name];
    const itemPath = [...path, name];
    const childCount = name === 'Recycle Bin' && item.type === 'folder'
      ? Object.keys(item.children || {}).length
      : undefined;
    result.push({ name, docKey: item.type === 'file' ? item.name : undefined, type: item.type, path: itemPath, depth, collapsed: item.collapsed, childCount });
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
  onNewFile,
  onCreateFile,
  onNewFolder,
  onCreateFolder,
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
  onRename,
  onMove,
  onDelete,
  onSearch,
  onCreateSubfolder,
  onSyncGoogleDrive,
  onSyncICloud,
  onOpenProjectSettings,
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FlatItem } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'empty-bin' | 'delete-permanently'; item: FlatItem } | null>(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [contextMenuFocusIdx, setContextMenuFocusIdx] = useState(0);
  const [inlineInput, setInlineInput] = useState<{ mode: 'new-file' | 'new-folder'; parentPath: string[]; depth: number } | null>(null);
  const [inlineInputValue, setInlineInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
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
      setInlineInput(null);
      setInlineInputValue('');
    }
  }, [visible]);

  // Focus input when input mode changes
  useEffect(() => {
    if (inputMode !== 'none') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [inputMode]);

  // Focus inline input when it opens
  useEffect(() => {
    if (inlineInput) {
      setTimeout(() => inlineInputRef.current?.focus(), 50);
    }
  }, [inlineInput]);

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

  type ContextMenuItem =
    | { separator: true }
    | { separator?: false; label: string; action: () => void; danger?: boolean };

  const buildContextMenuItems = useCallback((item: FlatItem): ContextMenuItem[] => {
    const isRcBin = item.name === 'Recycle Bin' && item.type === 'folder';
    const isInBin = !isRcBin && item.path.includes('Recycle Bin');
    const isProjectFolder = item.type === 'folder' && item.depth === 0 && !isRcBin;
    const isSubfolder = item.type === 'folder' && item.depth > 0 && !isRcBin && !isInBin;
    const out: ContextMenuItem[] = [];

    if (isRcBin) {
      if ((item.childCount ?? 0) > 0) {
        out.push({ label: 'Empty Bin', danger: true, action: () => setConfirmAction({ type: 'empty-bin', item }) });
      }
      return out;
    }

    if (isInBin) {
      out.push({ label: 'Restore', action: () => { onRestoreFromDeleted(item.path); showStatus('Restored'); setSelectedIndex(prev => Math.max(0, prev - 1)); } });
      out.push({ label: 'Delete Permanently', danger: true, action: () => setConfirmAction({ type: 'delete-permanently', item }) });
      return out;
    }

    if (isProjectFolder) {
      out.push({ label: item.collapsed ? 'Expand' : 'Collapse', action: () => onToggleFolder(item.path) });
      out.push({ label: 'New File', action: () => {
        if (item.collapsed) onToggleFolder(item.path);
        setInlineInput({ mode: 'new-file', parentPath: item.path, depth: item.depth + 1 });
        setInlineInputValue('');
      }});
      out.push({ label: 'New Subfolder', action: () => {
        if (item.collapsed) onToggleFolder(item.path);
        setInlineInput({ mode: 'new-folder', parentPath: item.path, depth: item.depth + 1 });
        setInlineInputValue('');
      }});
      if (onOpenProjectSettings) {
        out.push({ separator: true });
        out.push({ label: 'Project Settings', action: () => onOpenProjectSettings!(item.name) });
      }
      out.push({ separator: true });
      out.push({ label: 'Delete Project', danger: true, action: () => { onDeleteFolder(item.path); showStatus('Project moved to Recycle Bin'); setSelectedIndex(prev => Math.max(0, prev - 1)); } });
      return out;
    }

    if (isSubfolder) {
      out.push({ label: item.collapsed ? 'Expand' : 'Collapse', action: () => onToggleFolder(item.path) });
      out.push({ label: 'New File Here', action: () => {
        if (item.collapsed) onToggleFolder(item.path);
        setInlineInput({ mode: 'new-file', parentPath: item.path, depth: item.depth + 1 });
        setInlineInputValue('');
      }});
      out.push({ label: 'New Subfolder', action: () => {
        if (item.collapsed) onToggleFolder(item.path);
        setInlineInput({ mode: 'new-folder', parentPath: item.path, depth: item.depth + 1 });
        setInlineInputValue('');
      }});
      out.push({ separator: true });
      out.push({ label: 'Delete', danger: true, action: () => { onDeleteFolder(item.path); showStatus('Folder moved to Recycle Bin'); setSelectedIndex(prev => Math.max(0, prev - 1)); } });
      return out;
    }

    // Regular file
    out.push({ label: 'Open', action: () => onOpenFile(item.docKey || item.name) });
    out.push({ label: 'Rename', action: () => { setInputMode('rename'); setInputValue(item.name); } });
    out.push({ label: 'Move', action: () => { setInputMode('move'); setMoveTargetIdx(0); } });
    out.push({ separator: true });
    out.push({ label: 'Delete', danger: true, action: () => { onDeleteFile(item.name, item.path); showStatus('Moved to Recycle Bin'); setSelectedIndex(prev => Math.max(0, prev - 1)); } });
    return out;
  }, [onToggleFolder, onOpenFile, onDeleteFile, onDeleteFolder, onRestoreFromDeleted, onOpenProjectSettings, showStatus]);

  // Dismiss context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.fb-context-menu')) setContextMenu(null);
    };
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, [contextMenu]);

  // Dismiss actions dropdown on outside click
  useEffect(() => {
    if (!actionsMenuOpen) return;
    const dismiss = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.fb-actions-menu') && !target.closest('.fb-actions-btn')) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, [actionsMenuOpen]);

  // Keyboard handler
  useEffect(() => {
    if (!visible || !focused) return;

    const handler = (e: KeyboardEvent) => {
      // Don't capture keys when the editor (ProseMirror) is focused
      const target = e.target as HTMLElement;
      if (target?.closest?.('.ProseMirror')) return;

      // Context menu keyboard nav (highest priority)
      if (contextMenu) {
        const menuItems = buildContextMenuItems(contextMenu.item).filter((m): m is { label: string; action: () => void; danger?: boolean } => !m.separator);
        if (e.key === 'ArrowDown') {
          setContextMenuFocusIdx(prev => Math.min(prev + 1, menuItems.length - 1));
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          setContextMenuFocusIdx(prev => Math.max(prev - 1, 0));
          e.preventDefault();
        } else if (e.key === 'Enter') {
          menuItems[contextMenuFocusIdx]?.action();
          setContextMenu(null);
          e.preventDefault();
        } else if (e.key === 'Escape') {
          setContextMenu(null);
          e.preventDefault();
        }
        return;
      }

      // Inline input row: intercept Enter/Escape only; let other keys pass through to the input
      if (inlineInput) {
        if (e.key === 'Escape') {
          setInlineInput(null); setInlineInputValue(''); e.preventDefault();
        } else if (e.key === 'Enter') {
          if (inlineInputValue.trim()) {
            if (inlineInput.mode === 'new-file') {
              const docKey = inlineInput.parentPath.length > 0
                ? `${inlineInput.parentPath.join('/')}/${inlineInputValue.trim()}`
                : inlineInputValue.trim();
              onCreateFile(inlineInputValue.trim(), inlineInput.parentPath);
              onOpenFile(docKey);
              showStatus('File created');
            } else {
              if (inlineInput.parentPath.length === 0) onCreateFolder(inlineInputValue.trim());
              else onCreateSubfolder(inlineInputValue.trim(), inlineInput.parentPath);
              showStatus('Folder created');
            }
          }
          setInlineInput(null); setInlineInputValue(''); e.preventDefault();
        }
        return;
      }

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
      if (e.key === 'Escape') {
        if (confirmAction) { setConfirmAction(null); e.preventDefault(); return; }
        onClose(); e.preventDefault(); return;
      }
      if (e.key === '/') { setInputMode('search'); setInputValue(''); e.preventDefault(); return; }
      if (e.key === 'n' && !e.shiftKey) {
        const cur = filteredItems[selectedIndex];
        let parentPath: string[]; let depth: number;
        if (!cur || (cur.depth === 0 && cur.type === 'file')) { parentPath = []; depth = 0; }
        else if (cur.type === 'folder' && cur.name !== 'Recycle Bin') {
          parentPath = cur.path; depth = cur.depth + 1;
          if (cur.collapsed) onToggleFolder(cur.path);
        } else { parentPath = cur.path.slice(0, -1); depth = cur.depth; }
        setInlineInput({ mode: 'new-file', parentPath, depth });
        setInlineInputValue('');
        e.preventDefault(); return;
      }
      if (e.key === 'N' && e.shiftKey) {
        const cur = filteredItems[selectedIndex];
        let parentPath: string[]; let depth: number;
        if (!cur || (cur.depth === 0 && cur.type === 'file')) { parentPath = []; depth = 0; }
        else if (cur.type === 'folder' && cur.name !== 'Recycle Bin') {
          parentPath = cur.path; depth = cur.depth + 1;
          if (cur.collapsed) onToggleFolder(cur.path);
        } else { parentPath = cur.path.slice(0, -1); depth = cur.depth; }
        setInlineInput({ mode: 'new-folder', parentPath, depth });
        setInlineInputValue('');
        e.preventDefault(); return;
      }

      // Navigation
      if (e.key === 'ArrowDown') {
        setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        const item = filteredItems[selectedIndex];
        if (item?.type === 'folder') {
          if (item.collapsed) {
            onToggleFolder(item.path);
          } else {
            const next = selectedIndex + 1;
            if (next < filteredItems.length && filteredItems[next].depth > item.depth) {
              setSelectedIndex(next);
            }
          }
        }
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        const item = filteredItems[selectedIndex];
        if (item?.type === 'folder' && !item.collapsed) {
          onToggleFolder(item.path);
        } else {
          const parentPath = item?.path.slice(0, -1) ?? [];
          if (parentPath.length > 0) {
            const parentIdx = filteredItems.findIndex(f => f.path.join('/') === parentPath.join('/'));
            if (parentIdx !== -1) setSelectedIndex(parentIdx);
          }
        }
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
        if (item) {
          const el = listRef.current?.querySelector(`.file-browser-row[data-idx="${selectedIndex}"]`) as HTMLElement | null;
          if (el) {
            const rect = el.getBoundingClientRect();
            setContextMenuFocusIdx(0);
            setContextMenu({ x: rect.right + 4, y: rect.top, item });
          }
        }
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'd' || e.key === 'D') {
        const item = filteredItems[selectedIndex];
        if (item) {
          const isRcBin = item.name === 'Recycle Bin' && item.type === 'folder';
          const isInRcBin = !isRcBin && item.path.includes('Recycle Bin');
          if (isInRcBin) {
            const binPath = item.path.slice(0, item.path.lastIndexOf('Recycle Bin') + 1);
            const itemKey = item.path[item.path.lastIndexOf('Recycle Bin') + 1];
            onPermanentlyDeleteItem(itemKey, binPath);
            showStatus('Permanently deleted');
          } else if (!isRcBin) {
            if (item.type === 'file') {
              onDeleteFile(item.name, item.path);
              showStatus('Moved to Recycle Bin');
            } else {
              onDeleteFolder(item.path);
              showStatus('Folder moved to Recycle Bin');
            }
          }
          setSelectedIndex(prev => Math.max(0, prev - 1));
        }
        e.preventDefault();
      } else if (e.key === 'F2' || e.key === 'r' || e.key === 'R') {
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
        if (item && item.path.includes('Recycle Bin') && item.name !== 'Recycle Bin') {
          onRestoreFromDeleted(item.path);
          showStatus(`Restored`);
          setSelectedIndex(prev => Math.max(0, prev - 1));
        }
        e.preventDefault();
      } else if (e.key === 'e' || e.key === 'E') {
        const item = filteredItems[selectedIndex];
        if (item?.name === 'Recycle Bin' && item.type === 'folder') {
          onEmptyDeleted(item.path);
          showStatus('Recycle Bin emptied');
        }
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [visible, focused, selectedIndex, inputMode, inputValue, searchQuery,
    moveTargetIdx, filteredItems, onClose, onOpenFile, onDeleteFile, onDeleteFolder,
    onRenameFile, onMoveFile, onToggleFolder, onRestoreFromDeleted, onEmptyDeleted,
    onPermanentlyDeleteItem, onCreateFolder, onCreateFile, onCreateSubfolder, getFolders,
    showStatus, contextMenu, contextMenuFocusIdx, confirmAction,
    buildContextMenuItems, inlineInput, inlineInputValue]);

  if (!visible) return null;

  const allFolders = getFolders();
  const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";
  const activeProject = localStorage.getItem('minstrel-active-project') || '';

  // Word count rollup for a folder: sum all file descendants (excluding bin)
  const folderWordCount = (folderPath: string[]): number => {
    const pathStr = folderPath.join('/');
    let total = 0;
    for (const fi of allItems) {
      if (fi.type !== 'file' || fi.path.includes('Recycle Bin')) continue;
      const fiParent = fi.path.slice(0, -1).join('/');
      if (fiParent === pathStr || fiParent.startsWith(pathStr + '/')) {
        const fk = fi.docKey || fi.name;
        const lc = (fk === currentFilename && currentContent != null) ? currentContent : allDocuments[fk]?.content;
        if (lc) total += lc.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
      }
    }
    return total;
  };

  // Index of first root-level file (UNFILED label shows above it)
  const firstUnfiledIdx = filteredItems.findIndex(fi => fi.type === 'file' && fi.depth === 0);

  // Where to insert the inline input row
  let inlineInsertAfterIdx = -1;
  if (inlineInput) {
    const pStr = inlineInput.parentPath.join('/');
    for (let j = 0; j < filteredItems.length; j++) {
      const fi = filteredItems[j];
      const fiStr = fi.path.join('/');
      if (fiStr === pStr) {
        inlineInsertAfterIdx = j;
      } else if (fiStr.startsWith(pStr + '/') && !fi.path.includes('Recycle Bin')) {
        inlineInsertAfterIdx = j;
      }
    }
  }

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
          <span style={{ fontSize: '14px', lineHeight: 1 }}>📚</span> Files
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', position: 'relative' }}>
          {/* ⋯ actions button */}
          <button
            className="fb-actions-btn"
            onClick={(e) => { e.stopPropagation(); setActionsMenuOpen(prev => !prev); }}
            title="Actions"
            aria-haspopup="menu"
            aria-expanded={actionsMenuOpen}
            style={{
              background: 'transparent',
              border: actionsMenuOpen ? '1px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
              borderRadius: DT.BORDER_RADIUS.button,
              color: 'var(--terminal-text)',
              opacity: actionsMenuOpen ? 0.9 : 0.45,
              cursor: 'pointer',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              lineHeight: 1,
              fontFamily: uiFont,
              transition: 'opacity 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-accent)'; }}
            onMouseLeave={e => { if (!actionsMenuOpen) { (e.currentTarget as HTMLElement).style.opacity = '0.45'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--terminal-border)'; } }}
          >
            ⋯
          </button>

          {/* Actions dropdown */}
          {actionsMenuOpen && (
            <div
              className="fb-actions-menu"
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                zIndex: DT.Z_INDEX.dropdown,
                background: DT.COLORS.background.menu,
                border: DT.BORDERS.default,
                borderRadius: DT.BORDER_RADIUS.dropdown,
                boxShadow: DT.SHADOWS.dropdown,
                minWidth: '136px',
                fontFamily: uiFont,
              }}
            >
              {([
                {
                  label: 'Open',
                  action: () => {
                    const item = filteredItems[selectedIndex];
                    if (!item) return;
                    if (item.type === 'folder') onToggleFolder(item.path);
                    else onOpenFile(item.docKey || item.name);
                  },
                },
                {
                  label: 'New File',
                  action: () => { onNewFile(); },
                },
                {
                  label: 'New Folder',
                  action: () => { onNewFolder(); },
                },
                {
                  label: 'Rename',
                  action: () => {
                    const item = filteredItems[selectedIndex];
                    if (item?.type === 'file') {
                      setInputMode('rename');
                      setInputValue(item.name);
                      onRename?.(item.name);
                    }
                  },
                },
                {
                  label: 'Move',
                  action: () => {
                    const item = filteredItems[selectedIndex];
                    if (item?.type === 'file') {
                      setInputMode('move');
                      setMoveTargetIdx(0);
                      onMove?.(item.name);
                    }
                  },
                },
                {
                  label: 'Delete',
                  action: () => {
                    const item = filteredItems[selectedIndex];
                    if (!item) return;
                    onDelete?.(item.name);
                    const rcBin = item.name === 'Recycle Bin' && item.type === 'folder';
                    const inBin = !rcBin && item.path.includes('Recycle Bin');
                    if (inBin) {
                      const binIdx = item.path.lastIndexOf('Recycle Bin');
                      const binPath = item.path.slice(0, binIdx + 1);
                      const itemKey = item.path[binIdx + 1] ?? item.name;
                      onPermanentlyDeleteItem(itemKey, binPath);
                      showStatus('Permanently deleted');
                    } else if (!rcBin) {
                      if (item.type === 'file') {
                        onDeleteFile(item.name, item.path);
                        showStatus('Moved to Recycle Bin');
                      } else {
                        onDeleteFolder(item.path);
                        showStatus('Folder moved to Recycle Bin');
                      }
                    }
                    setSelectedIndex(prev => Math.max(0, prev - 1));
                  },
                },
                {
                  label: 'Search',
                  action: () => { setInputMode('search'); setSearchQuery(''); onSearch?.(); },
                },
              ]).map(({ label, action }) => (
                <button
                  key={label}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionsMenuOpen(false);
                    action();
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: DT.BORDER_RADIUS.dropdown,
                    color: 'var(--terminal-text)',
                    fontFamily: uiFont,
                    fontSize: '11px',
                    fontWeight: 400,
                    letterSpacing: '0.04em',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = DT.COLORS.background.cardHover; (e.currentTarget as HTMLElement).style.color = 'var(--terminal-accent)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--terminal-text)'; }}
                >
                  {label}
                </button>
              ))}
              {/* Project Settings — only when a top-level folder is selected */}
              {(() => {
                const sel = filteredItems[selectedIndex];
                const isTopLevel = sel?.type === 'folder' && sel?.depth === 0 && sel?.name !== 'Deleted';
                if (!isTopLevel || !onOpenProjectSettings) return null;
                return (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionsMenuOpen(false);
                      onOpenProjectSettings(sel.name);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderTop: DT.BORDERS.subtle,
                      borderRadius: DT.BORDER_RADIUS.dropdown,
                      color: 'var(--terminal-text)',
                      fontFamily: uiFont,
                      fontSize: '11px',
                      fontWeight: 400,
                      letterSpacing: '0.04em',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = DT.COLORS.background.cardHover; (e.currentTarget as HTMLElement).style.color = 'var(--terminal-accent)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--terminal-text)'; }}
                  >
                    ⚙ Project Settings
                  </button>
                );
              })()}
              {onSyncGoogleDrive && (
                <button
                  onClick={(e) => { e.stopPropagation(); setActionsMenuOpen(false); onSyncGoogleDrive!(); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderTop: DT.BORDERS.subtle,
                    borderRadius: DT.BORDER_RADIUS.dropdown,
                    color: 'var(--terminal-text)',
                    fontFamily: uiFont,
                    fontSize: '11px',
                    fontWeight: 400,
                    letterSpacing: '0.04em',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = DT.COLORS.background.cardHover; (e.currentTarget as HTMLElement).style.color = 'var(--terminal-accent)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--terminal-text)'; }}
                >
                  ☁ Sync
                </button>
              )}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            title="Esc to close"
            style={{
              background: 'transparent',
              border: '1px solid var(--terminal-border)',
              borderRadius: DT.BORDER_RADIUS.button,
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
      </div>

      {/* Search bar */}
      {inputMode === 'search' && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--terminal-border)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--terminal-surface)' }}>
          <span style={{ opacity: 0.35, fontSize: '11px', fontFamily: uiFont }}>⌕</span>
          <input ref={inputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search files…" autoFocus
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--terminal-text)', fontFamily: uiFont, fontSize: '12px' }} />
        </div>
      )}

      {/* Inline input bar (rename only — new-file/folder use inline tree row) */}
      {inputMode === 'rename' && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--terminal-border)', background: 'var(--terminal-surface)' }}>
          <div style={{ fontSize: '10px', opacity: 0.4, fontFamily: uiFont, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '7px' }}>
            Rename File
          </div>
          <input ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} autoFocus
            placeholder=""
            style={{ width: '100%', background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)', borderRadius: 0, color: 'var(--terminal-text)', padding: '7px 10px', fontFamily: uiFont, fontSize: '12px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--terminal-accent)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--terminal-border)'; }}
          />
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
                <span style={{ fontSize: '12px', lineHeight: 1 }}>{f.name === 'Deleted' ? '🗑️' : '📚'}</span>
                {f.name === 'Deleted' ? 'Recycle Bin' : f.name}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.3, marginTop: '6px', fontFamily: uiFont }}>↑↓ navigate · Enter confirm · Esc cancel</div>
        </div>
      )}

      {/* Unified file tree */}
      <div
        ref={listRef}
        role="tree"
        aria-label="File browser"
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
            const isRecycleBin = item.name === 'Recycle Bin' && item.type === 'folder';
            const isInRecycleBin = !isRecycleBin && item.path.includes('Recycle Bin');
            const isDropTarget = isFolder && dropTargetPath !== null && dropTargetPath.join('/') === item.path.join('/');
            const showDropBefore = dropIndicator?.index === i && dropIndicator.position === 'before';
            const showDropAfter = dropIndicator?.index === i && dropIndicator.position === 'after';
            const isProjectFolder = item.depth === 0 && isFolder && !isRecycleBin;
            const isActiveProject = isProjectFolder && item.name === activeProject;
            const showProjectSeparator = isProjectFolder && filteredItems.slice(0, i).some(p => p.depth === 0 && p.type === 'folder' && p.name !== 'Recycle Bin');
            const wc = isFolder && !isRecycleBin ? folderWordCount(item.path) : 0;

            return (
              <div
                key={item.path.join('/') + item.type}
                data-idx={i}
                data-drop-target={isDropTarget ? 'true' : undefined}
                style={{ position: 'relative', marginTop: showProjectSeparator ? '4px' : 0, borderTop: showProjectSeparator ? '1px solid #1a2540' : 'none' }}
              >
                {/* UNFILED section label */}
                {i === firstUnfiledIdx && (
                  <div style={{ padding: '5px 10px 3px 10px', fontSize: '10px', color: 'var(--terminal-accent)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, fontFamily: uiFont, opacity: 0.7 }}>
                    Unfiled
                  </div>
                )}
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
                  if (isFolder) {
                    // Track the active project when a top-level folder is clicked
                    if (item.depth === 0) {
                      localStorage.setItem('minstrel-active-project', item.name);
                    }
                    onToggleFolder(item.path);
                  } else {
                    onOpenFile(item.docKey || item.name);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedIndex(i);
                  setContextMenuFocusIdx(0);
                  setContextMenu({ x: e.clientX, y: e.clientY, item });
                }}
                role="treeitem"
                aria-expanded={isFolder ? !item.collapsed : undefined}
                aria-selected={isFocused}
                aria-level={item.depth + 1}
                className="file-browser-row"
                style={{
                  padding: isProjectFolder ? '7px 10px' : '6px 10px',
                  paddingLeft: `${10 + item.depth * 16}px`,
                  cursor: dragState ? 'grabbing' : 'pointer',
                  background: isDropTarget ? 'var(--terminal-accent)' : isFocused ? 'var(--terminal-surface)' : 'transparent',
                  color: isDropTarget ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: isProjectFolder ? '13px' : '12px',
                  fontFamily: uiFont,
                  opacity: dragState && dragState.itemPath.join('/') === item.path.join('/') ? 0.35 : (isRecycleBin && (item.childCount ?? 0) === 0 && !isFocused ? 0.4 : isInRecycleBin && !isFocused ? 0.4 : 1),
                  transition: 'background 0.12s, opacity 0.12s',
                  borderLeft: isFocused ? '3px solid var(--terminal-accent)' : isActiveProject ? '3px solid #c8a84b' : '3px solid transparent',
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

                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {isFolder ? (
                    isRecycleBin ? (
                      <span style={{ fontSize: '14px', lineHeight: 1 }}>🗑️</span>
                    ) : item.depth === 0 ? (
                      item.collapsed
                        ? <Book size={14} color="#6b9fd4" style={{ verticalAlign: 'middle', marginRight: 0, flexShrink: 0 }} />
                        : <BookOpen size={14} color="#c8a84b" style={{ verticalAlign: 'middle', marginRight: 0, flexShrink: 0 }} />
                    ) : (
                      <span style={{ fontSize: '14px', lineHeight: 1 }}>{item.collapsed ? '📁' : '📂'}</span>
                    )
                  ) : (
                    <span style={{ fontSize: '14px', lineHeight: 1 }}>🗒️</span>
                  )}
                </span>

                <span style={{
                  fontWeight: isFolder ? '600' : '400',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  letterSpacing: isProjectFolder ? '0.03em' : isFolder ? '0.02em' : 'normal',
                  color: isDropTarget ? 'var(--terminal-bg)' : isProjectFolder ? '#c8c8c8' : '#a0a0a0',
                  fontSize: isProjectFolder ? '13px' : isFolder ? '11px' : '12px',
                }}>
                  {isRecycleBin
                    ? `Recycle Bin${item.childCount ? ` (${item.childCount})` : ''}`
                    : displayName}
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
                {isFolder && !isRecycleBin && wc > 0 && (
                  <span style={{
                    fontSize: '10px',
                    opacity: isFocused ? 0.5 : 0.25,
                    whiteSpace: 'nowrap',
                    fontFamily: uiFont,
                    letterSpacing: '0.02em',
                  }}>
                    {wc.toLocaleString()}w
                  </span>
                )}
                {/* Inline hover action buttons */}
                <div
                  className="fb-row-actions"
                  style={{ display: 'flex', gap: '1px', flexShrink: 0, alignItems: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                >
                  {isFolder && !isRecycleBin && (
                    <button
                      title="New file here"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(i);
                        if (item.collapsed) onToggleFolder(item.path);
                        setInlineInput({ mode: 'new-file', parentPath: item.path, depth: item.depth + 1 });
                        setInlineInputValue('');
                      }}
                      style={{ background: 'transparent', border: 'none', padding: '1px 3px', cursor: 'pointer', color: 'var(--terminal-text)', display: 'flex', alignItems: 'center', opacity: 0.55, lineHeight: 1 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.55'; }}
                    >
                      <FilePlus size={11} />
                    </button>
                  )}
                  <button
                    title="More actions"
                    aria-haspopup="menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(i);
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setContextMenuFocusIdx(0);
                      setContextMenu({ x: rect.left, y: rect.bottom + 2, item });
                    }}
                    style={{ background: 'transparent', border: 'none', padding: '1px 3px', cursor: 'pointer', color: 'var(--terminal-text)', display: 'flex', alignItems: 'center', opacity: 0.55, lineHeight: 1 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.55'; }}
                  >
                    <MoreHorizontal size={11} />
                  </button>
                </div>
              </div>
                {/* Drop indicator line — after */}
                {showDropAfter && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: `${10 + item.depth * 16}px`, right: '8px',
                    height: '2px', background: 'var(--terminal-accent)', borderRadius: '1px', zIndex: 10,
                  }} />
                )}
                {/* Inline new-file / new-folder row */}
                {i === inlineInsertAfterIdx && inlineInput && (
                  <div style={{
                    padding: '4px 10px',
                    paddingLeft: `${10 + inlineInput.depth * 16}px`,
                    display: 'flex', alignItems: 'center', gap: '7px', fontFamily: uiFont,
                  }}>
                    <span style={{ width: '10px', flexShrink: 0 }} />
                    <span style={{ width: '11px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>
                      {inlineInput.mode === 'new-file' ? '🗒️' : '📁'}
                    </span>
                    <input
                      ref={inlineInputRef}
                      value={inlineInputValue}
                      onChange={e => setInlineInputValue(e.target.value)}
                      placeholder={inlineInput.mode === 'new-file' ? 'filename.txt' : 'Folder name…'}
                      autoFocus
                      style={{
                        flex: 1, background: '#0d1117', border: '1px solid #4ecdc4', borderRadius: 0,
                        color: '#c8c8c8', fontSize: '12px', fontFamily: uiFont, padding: '2px 6px', outline: 'none',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (() => {
        const allMenuItems = buildContextMenuItems(contextMenu.item);
        const actionMenuItems = allMenuItems.filter((m): m is { label: string; action: () => void; danger?: boolean } => !m.separator);
        if (allMenuItems.length === 0) return null;
        return (
          <div
            className="fb-context-menu"
            role="menu"
            style={{
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              zIndex: 9999,
              background: '#0d1117',
              border: '1px solid #1a2540',
              borderRadius: 0,
              minWidth: '160px',
              fontFamily: uiFont,
              padding: '4px 0',
            }}
          >
            {allMenuItems.map((menuItem, mIdx) => {
              if (menuItem.separator) {
                return <div key={mIdx} style={{ height: '1px', background: '#1a2540', margin: '3px 0' }} />;
              }
              const actionIdx = actionMenuItems.indexOf(menuItem as { label: string; action: () => void; danger?: boolean });
              const isMenuFocused = actionIdx === contextMenuFocusIdx;
              return (
                <button
                  key={mIdx}
                  role="menuitem"
                  onMouseEnter={() => setContextMenuFocusIdx(actionIdx)}
                  onClick={(e) => {
                    e.stopPropagation();
                    (menuItem as { action: () => void }).action();
                    setContextMenu(null);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 14px',
                    background: isMenuFocused ? '#1a2540' : 'transparent',
                    border: 'none',
                    borderRadius: 0,
                    color: (menuItem as { danger?: boolean }).danger ? '#e05c5c' : 'var(--terminal-text)',
                    fontFamily: uiFont,
                    fontSize: '11px',
                    fontWeight: (menuItem as { danger?: boolean }).danger ? 600 : 400,
                    letterSpacing: '0.04em',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {(menuItem as { label: string }).label}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Confirmation strip */}
      {confirmAction && (
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--terminal-border)',
          background: 'var(--terminal-surface)',
          flexShrink: 0,
          fontFamily: uiFont,
        }}>
          <div style={{ fontSize: '11px', color: 'var(--terminal-text)', marginBottom: '10px', lineHeight: 1.45 }}>
            {confirmAction.type === 'empty-bin'
              ? 'Permanently delete everything in Recycle Bin?'
              : `Permanently delete "${confirmAction.item.name}"?`}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={{
                flex: 1,
                padding: '6px 0',
                background: 'transparent',
                border: '1px solid #e05c5c',
                color: '#e05c5c',
                fontFamily: uiFont,
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
              onClick={() => {
                if (confirmAction.type === 'empty-bin') {
                  onEmptyDeleted(confirmAction.item.path);
                  showStatus('Recycle Bin emptied');
                } else {
                  const binIdx = confirmAction.item.path.lastIndexOf('Recycle Bin');
                  const binPath = confirmAction.item.path.slice(0, binIdx + 1);
                  const itemKey = confirmAction.item.path[binIdx + 1] ?? confirmAction.item.name;
                  onPermanentlyDeleteItem(itemKey, binPath);
                  showStatus('Permanently deleted');
                }
                setConfirmAction(null);
              }}
            >
              Confirm
            </button>
            <button
              style={{
                flex: 1,
                padding: '6px 0',
                background: 'transparent',
                border: '1px solid var(--terminal-border)',
                color: 'var(--terminal-text)',
                fontFamily: uiFont,
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                opacity: 0.55,
              }}
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

      {/* Keyboard hint bar */}
      <div style={{
        padding: '8px 14px',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        fontSize: '10px',
        opacity: 0.55,
        textAlign: 'center',
        flexShrink: 0,
        fontFamily: uiFont,
        letterSpacing: '0.04em',
        background: 'rgba(0,0,0,0.02)',
      }}>
        {(() => {
          if (contextMenu) return '↑↓ navigate · Enter select · Esc cancel';
          const sel = filteredItems[selectedIndex];
          if (!sel) return '↑↓ navigate · Esc close';
          const isRcBin = sel.name === 'Recycle Bin' && sel.type === 'folder';
          const isInBin = !isRcBin && sel.path.includes('Recycle Bin');
          if (isRcBin) return 'E empty · Space menu · Esc close';
          if (isInBin) return 'U restore · Del delete · Space menu · Esc close';
          if (sel.type === 'folder') return '→ expand · ← collapse · N new file · Space menu';
          return 'Enter open · F2 rename · M move · Del delete · Space menu';
        })()}
      </div>
    </div>
  );
}
