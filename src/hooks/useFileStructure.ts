import { useState, useCallback } from 'react';
import type { FileStructure, FileNode } from '@/lib/types';

const FS_KEY = 'pw-file-structure';

const defaultStructure: FileStructure = {
  root: { type: 'folder', name: 'root', children: {} },
};

function load(): FileStructure {
  const saved = localStorage.getItem(FS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return defaultStructure;
    }
  }
  return defaultStructure;
}

export function useFileStructure() {
  const [structure, setStructure] = useState<FileStructure>(load);

  const save = useCallback((s: FileStructure) => {
    localStorage.setItem(FS_KEY, JSON.stringify(s));
    setStructure(s);
  }, []);

  const createFolder = useCallback((name: string) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      if (!next.root.children) next.root.children = {};
      if (next.root.children[name]) return prev;
      next.root.children[name] = { type: 'folder', name, children: {}, collapsed: false };
      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addFileToTree = useCallback((filename: string) => {
    setStructure(prev => {
      if (findFile(prev.root, filename)) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      if (!next.root.children) next.root.children = {};
      next.root.children[filename] = { type: 'file', name: filename };
      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleFolder = useCallback((path: string[]) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      let current: FileNode = next.root;
      for (const p of path) {
        current = current.children![p];
      }
      current.collapsed = !current.collapsed;
      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const moveFile = useCallback((filename: string, fromPath: string[], toPath: string[]) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;

      // Find and remove from source
      let source: FileNode = next.root;
      if (fromPath.length > 1) {
        for (let i = 0; i < fromPath.length - 1; i++) {
          source = source.children![fromPath[i]];
        }
      }
      const fileData = source.children![filename];
      delete source.children![filename];

      // Add to destination
      let dest: FileNode = next.root;
      for (const p of toPath) {
        dest = dest.children![p];
      }
      if (!dest.children) dest.children = {};
      dest.children[filename] = fileData;

      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteFile = useCallback((filename: string) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      // Find the node before removing
      const node = findFile(next.root, filename);
      if (!node) return prev;
      const nodeCopy = JSON.parse(JSON.stringify(node));
      removeFromTree(next.root, filename);
      // Ensure Deleted folder exists
      if (!next.root.children) next.root.children = {};
      if (!next.root.children['Deleted']) {
        next.root.children['Deleted'] = { type: 'folder', name: 'Deleted', children: {}, collapsed: true };
      }
      next.root.children['Deleted'].children![filename] = nodeCopy;
      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteFolder = useCallback((folderPath: string[]) => {
    if (folderPath.length === 0) return;
    const folderName = folderPath[folderPath.length - 1];
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      // Navigate to parent
      let parent: FileNode = next.root;
      for (let i = 0; i < folderPath.length - 1; i++) {
        if (!parent.children || !parent.children[folderPath[i]]) return prev;
        parent = parent.children[folderPath[i]];
      }
      if (!parent.children || !parent.children[folderName]) return prev;
      const folderCopy = JSON.parse(JSON.stringify(parent.children[folderName]));
      delete parent.children[folderName];
      // Move to Deleted
      if (!next.root.children) next.root.children = {};
      if (!next.root.children['Deleted']) {
        next.root.children['Deleted'] = { type: 'folder', name: 'Deleted', children: {}, collapsed: true };
      }
      const key = folderPath.join('/');
      next.root.children['Deleted'].children![key] = folderCopy;
      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const renameFile = useCallback((oldName: string, newName: string) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      renameInTree(next.root, oldName, newName);
      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
    // Also rename in documents storage
    const docs = JSON.parse(localStorage.getItem('pw-documents') || '{}');
    if (docs[oldName]) {
      docs[newName] = docs[oldName];
      delete docs[oldName];
      localStorage.setItem('pw-documents', JSON.stringify(docs));
    }
  }, []);

  const getFolders = useCallback((node: FileNode = structure.root, path: string[] = []): { name: string; path: string[] }[] => {
    const result: { name: string; path: string[] }[] = [];
    const children = node.children || {};
    for (const [name, item] of Object.entries(children)) {
      if (item.type === 'folder') {
        const currentPath = [...path, name];
        result.push({ name: currentPath.join(' / '), path: currentPath });
        result.push(...getFolders(item, currentPath));
      }
    }
    return result;
  }, [structure]);

  const createFileInFolder = useCallback((filename: string, folderPath: string[]) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      let current: FileNode = next.root;
      for (const p of folderPath) {
        if (!current.children || !current.children[p]) return prev;
        current = current.children[p];
      }
      if (!current.children) current.children = {};
      // Build a unique key based on path
      const fileKey = folderPath.length > 0 ? `${folderPath.join('/')}/${filename}` : filename;
      if (current.children[fileKey]) return prev;
      current.children[fileKey] = { type: 'file', name: fileKey };
      // Create empty doc
      const docs = JSON.parse(localStorage.getItem('pw-documents') || '{}');
      docs[fileKey] = { content: '', lastModified: new Date().toISOString() };
      localStorage.setItem('pw-documents', JSON.stringify(docs));
      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const createNovelProject = useCallback((title: string) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      if (!next.root.children) next.root.children = {};
      if (next.root.children[title]) return prev; // Already exists

      const now = new Date().toLocaleDateString();
      const versionHistoryContent = `VERSION HISTORY - ${title}\nCreated: ${now}\n\nAdd notes about each version here.\n`;

      // Create starter files in localStorage
      const docs = JSON.parse(localStorage.getItem('pw-documents') || '{}');
      const starterFiles = [
        `${title}/Active/Bible/Characters.txt`,
        `${title}/Active/Bible/Outline.txt`,
        `${title}/Active/Bible/Setting.txt`,
        `${title}/Active/Notes/Ideas.txt`,
      ];
      // Chapter files 1-10
      const chapterFiles: Record<string, { type: 'file'; name: string }> = {};
      for (let i = 1; i <= 10; i++) {
        const chNum = String(i).padStart(2, '0');
        const chKey = `${title}/Active/Chapters/Chapter ${chNum}.txt`;
        docs[chKey] = { content: '', lastModified: new Date().toISOString() };
        chapterFiles[chKey] = { type: 'file', name: chKey };
      }
      starterFiles.forEach(f => { docs[f] = { content: '', lastModified: new Date().toISOString() }; });
      docs[`${title}/Version History.txt`] = { content: versionHistoryContent, lastModified: new Date().toISOString() };
      localStorage.setItem('pw-documents', JSON.stringify(docs));

      next.root.children[title] = {
        type: 'folder', name: title, collapsed: false,
        children: {
          'Active': {
            type: 'folder', name: 'Active', collapsed: false,
            children: {
              'Chapters': { type: 'folder', name: 'Chapters', collapsed: false, children: chapterFiles },
              'Bible': {
                type: 'folder', name: 'Bible', collapsed: false,
                children: {
                  [`${title}/Active/Bible/Characters.txt`]: { type: 'file', name: `${title}/Active/Bible/Characters.txt` },
                  [`${title}/Active/Bible/Outline.txt`]: { type: 'file', name: `${title}/Active/Bible/Outline.txt` },
                  [`${title}/Active/Bible/Setting.txt`]: { type: 'file', name: `${title}/Active/Bible/Setting.txt` },
                },
              },
              'Notes': {
                type: 'folder', name: 'Notes', collapsed: false,
                children: {
                  [`${title}/Active/Notes/Ideas.txt`]: { type: 'file', name: `${title}/Active/Notes/Ideas.txt` },
                },
              },
            },
          },
          'Versions': { type: 'folder', name: 'Versions', collapsed: false, children: {} },
          'Snapshots': { type: 'folder', name: 'Snapshots', collapsed: false, children: {} },
          [`${title}/Version History.txt`]: { type: 'file', name: `${title}/Version History.txt` },
        },
      };

      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const findFilesInFolder = useCallback((node: FileNode, folderPath: string[]): string[] => {
    let current = node;
    for (const p of folderPath) {
      if (!current.children || !current.children[p]) return [];
      current = current.children[p];
    }
    const result: string[] = [];
    const collectFiles = (n: FileNode) => {
      if (!n.children) return;
      for (const [, item] of Object.entries(n.children)) {
        if (item.type === 'file') result.push(item.name);
        if (item.type === 'folder') collectFiles(item);
      }
    };
    collectFiles(current);
    return result;
  }, []);

  const saveVersion = useCallback((novelTitle: string, versionName: string) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      const novel = next.root.children?.[novelTitle];
      if (!novel || !novel.children) return prev;

      // Ensure Versions folder exists
      if (!novel.children['Versions']) {
        novel.children['Versions'] = { type: 'folder', name: 'Versions', collapsed: false, children: {} };
      }

      // Find all files in Active/Chapters/
      const chaptersFolder = novel.children['Active']?.children?.['Chapters'];
      const chapterFiles: Record<string, FileNode> = {};
      const docs = JSON.parse(localStorage.getItem('pw-documents') || '{}');

      if (chaptersFolder?.children) {
        for (const [key, item] of Object.entries(chaptersFolder.children)) {
          if (item.type === 'file') {
            // Copy file data
            const copyName = `${novelTitle}/Versions/${versionName}/${item.name.split('/').pop()}`;
            if (docs[item.name]) {
              docs[copyName] = { ...docs[item.name], lastModified: new Date().toISOString() };
            }
            chapterFiles[copyName] = { type: 'file', name: copyName };
          }
        }
      }

      novel.children['Versions'].children![versionName] = {
        type: 'folder', name: versionName, collapsed: true,
        children: chapterFiles,
      };

      // Update Version History
      const historyKey = `${novelTitle}/Version History.txt`;
      const historyEntry = `${versionName} (${new Date().toLocaleDateString()})\n- \n\n`;
      if (docs[historyKey]) {
        const lines = docs[historyKey].content.split('\n');
        // Insert after header (first 3 lines)
        const headerEnd = Math.min(3, lines.length);
        lines.splice(headerEnd, 0, historyEntry);
        docs[historyKey].content = lines.join('\n');
        docs[historyKey].lastModified = new Date().toISOString();
      }

      localStorage.setItem('pw-documents', JSON.stringify(docs));
      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const saveSnapshot = useCallback((filename: string) => {
    if (!filename) return false;

    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      if (!next.root.children) next.root.children = {};

      // Ensure Snapshots folder exists at root
      if (!next.root.children['Snapshots']) {
        next.root.children['Snapshots'] = { type: 'folder', name: 'Snapshots', collapsed: false, children: {} };
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const shortName = filename.split('/').pop() || filename;
      const snapshotFolderName = `${dateStr} - ${shortName}`;
      const snapshotFileName = `Snapshots/${snapshotFolderName}/${shortName}`;

      // Copy file data
      const docs = JSON.parse(localStorage.getItem('pw-documents') || '{}');
      if (docs[filename]) {
        docs[snapshotFileName] = { ...docs[filename], lastModified: new Date().toISOString() };
        localStorage.setItem('pw-documents', JSON.stringify(docs));
      }

      next.root.children['Snapshots'].children![snapshotFolderName] = {
        type: 'folder', name: snapshotFolderName, collapsed: true,
        children: {
          [snapshotFileName]: { type: 'file', name: snapshotFileName },
        },
      };

      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
    return true;
  }, []);

  const getNovelProjects = useCallback((): string[] => {
    const children = structure.root.children || {};
    return Object.entries(children)
      .filter(([, item]) => {
        if (item.type !== 'folder' || !item.children) return false;
        return !!item.children['Active'] && !!item.children['Versions'];
      })
      .map(([name]) => name);
  }, [structure]);

  const restoreFromDeleted = useCallback((itemName: string) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      const deleted = next.root.children?.['Deleted'];
      if (!deleted?.children?.[itemName]) return prev;
      const item = deleted.children[itemName];
      delete deleted.children[itemName];
      // Restore to root level
      if (!next.root.children) next.root.children = {};
      next.root.children[itemName] = item;
      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const emptyDeleted = useCallback(() => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      const deleted = next.root.children?.['Deleted'];
      if (!deleted?.children) return prev;
      // Remove associated documents from localStorage
      const docs = JSON.parse(localStorage.getItem('pw-documents') || '{}');
      const collectFileNames = (node: FileNode) => {
        if (!node.children) return;
        for (const [, item] of Object.entries(node.children)) {
          if (item.type === 'file') delete docs[item.name];
          if (item.type === 'folder') collectFileNames(item);
        }
      };
      collectFileNames(deleted);
      localStorage.setItem('pw-documents', JSON.stringify(docs));
      deleted.children = {};
      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    structure, createFolder, addFileToTree, toggleFolder, moveFile, deleteFile, deleteFolder, renameFile, getFolders,
    createNovelProject, saveVersion, saveSnapshot, findFilesInFolder, getNovelProjects, createFileInFolder, restoreFromDeleted, emptyDeleted,
  };
}

function findFile(node: FileNode, filename: string): FileNode | null {
  if (!node.children) return null;
  for (const [name, item] of Object.entries(node.children)) {
    if (name === filename) return item;
    if (item.type === 'folder') {
      const found = findFile(item, filename);
      if (found) return found;
    }
  }
  return null;
}

function removeFromTree(node: FileNode, filename: string): boolean {
  if (!node.children) return false;
  if (node.children[filename] && node.children[filename].type === 'file') {
    delete node.children[filename];
    return true;
  }
  for (const item of Object.values(node.children)) {
    if (item.type === 'folder' && removeFromTree(item, filename)) return true;
  }
  return false;
}

function renameInTree(node: FileNode, oldName: string, newName: string): boolean {
  if (!node.children) return false;
  if (node.children[oldName] && node.children[oldName].type === 'file') {
    const data = node.children[oldName];
    delete node.children[oldName];
    data.name = newName;
    node.children[newName] = data;
    return true;
  }
  for (const item of Object.values(node.children)) {
    if (item.type === 'folder' && renameInTree(item, oldName, newName)) return true;
  }
  return false;
}
