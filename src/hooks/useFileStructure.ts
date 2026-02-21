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

  const moveFolder = useCallback((folderName: string, fromPath: string[], toPath: string[]) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;

      // Navigate to source parent
      let sourceParent: FileNode = next.root;
      for (const p of fromPath) {
        if (!sourceParent.children?.[p]) return prev;
        sourceParent = sourceParent.children[p];
      }
      if (!sourceParent.children?.[folderName]) return prev;
      const folderData = sourceParent.children[folderName];
      delete sourceParent.children[folderName];

      // Navigate to destination
      let dest: FileNode = next.root;
      for (const p of toPath) {
        if (!dest.children?.[p]) return prev;
        dest = dest.children[p];
      }
      if (!dest.children) dest.children = {};
      dest.children[folderName] = folderData;

      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const moveFile = useCallback((filename: string, fromPath: string[], toPath: string[]) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;

      // Navigate to source folder
      let source: FileNode = next.root;
      for (const p of fromPath) {
        if (!source.children?.[p]) return prev;
        source = source.children[p];
      }
      if (!source.children?.[filename]) return prev;
      const fileData = source.children[filename];
      delete source.children[filename];

      // Navigate to destination folder
      let dest: FileNode = next.root;
      for (const p of toPath) {
        if (!dest.children?.[p]) return prev;
        dest = dest.children[p];
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
      if (current.children[filename]) return prev;
      // Use simple filename as tree key, full path as document key
      const docKey = folderPath.length > 0 ? `${folderPath.join('/')}/${filename}` : filename;
      current.children[filename] = { type: 'file', name: docKey };
      // Create empty doc
      const docs = JSON.parse(localStorage.getItem('pw-documents') || '{}');
      docs[docKey] = { content: '', lastModified: new Date().toISOString() };
      localStorage.setItem('pw-documents', JSON.stringify(docs));
      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const createNovelProject = useCallback((config: {
    title: string;
    abbreviation: string;
    chapterCount: number;
    namingFormat: 'ch-abr' | 'abr-ch' | 'abr_ch';
    includeBible: boolean;
    includeNotes: boolean;
    includeResearch: boolean;
    includeWorldbuilding: boolean;
    includeFrontMatter: boolean;
    targetWordCount?: number;
    pov?: string;
    tense?: string;
    styleNotes?: string;
  }) => {
    const { title, abbreviation: abr, chapterCount, namingFormat, includeBible, includeNotes, includeResearch, includeWorldbuilding, includeFrontMatter } = config;

    const formatChapter = (num: number): string => {
      const ch = String(num).padStart(2, '0');
      switch (namingFormat) {
        case 'ch-abr': return `Chapter ${ch} - ${abr}.txt`;
        case 'abr-ch': return `${abr} - Chapter ${ch}.txt`;
        case 'abr_ch': return `${abr}_Ch${ch}.txt`;
      }
    };

    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      if (!next.root.children) next.root.children = {};
      if (next.root.children[title]) return prev;

      const now = new Date().toLocaleDateString();
      const docs = JSON.parse(localStorage.getItem('pw-documents') || '{}');

      // Chapter files
      const chapterFiles: Record<string, { type: 'file'; name: string }> = {};
      for (let i = 1; i <= chapterCount; i++) {
        const chName = formatChapter(i);
        const chKey = `${title}/Active/Chapters/${chName}`;
        docs[chKey] = { content: '', lastModified: new Date().toISOString() };
        chapterFiles[chKey] = { type: 'file', name: chKey };
      }

      // Active children
      const activeChildren: Record<string, FileNode> = {
        'Chapters': { type: 'folder', name: 'Chapters', collapsed: false, children: chapterFiles },
      };

      if (includeBible) {
        const bibleFiles: Record<string, FileNode> = {};
        ['Characters', 'Outline', 'Setting'].forEach(f => {
          const key = `${title}/Active/Bible/${f} - ${abr}.txt`;
          docs[key] = { content: '', lastModified: new Date().toISOString() };
          bibleFiles[key] = { type: 'file', name: key };
        });
        // Add style notes if provided
        if (config.pov || config.tense || config.styleNotes) {
          const styleKey = `${title}/Active/Bible/Style Guide - ${abr}.txt`;
          let styleContent = `STYLE GUIDE - ${title}\n${'='.repeat(40)}\n\n`;
          if (config.pov) styleContent += `Point of View: ${config.pov}\n`;
          if (config.tense) styleContent += `Tense: ${config.tense}\n`;
          if (config.targetWordCount) styleContent += `Target Word Count: ${config.targetWordCount.toLocaleString()}\n`;
          if (config.styleNotes) styleContent += `\nNotes:\n${config.styleNotes}\n`;
          docs[styleKey] = { content: styleContent, lastModified: new Date().toISOString() };
          bibleFiles[styleKey] = { type: 'file', name: styleKey };
        }
        activeChildren['Bible'] = { type: 'folder', name: 'Bible', collapsed: false, children: bibleFiles };
      }

      if (includeNotes) {
        const key = `${title}/Active/Notes/Ideas - ${abr}.txt`;
        docs[key] = { content: '', lastModified: new Date().toISOString() };
        activeChildren['Notes'] = { type: 'folder', name: 'Notes', collapsed: false, children: { [key]: { type: 'file', name: key } } };
      }

      if (includeResearch) {
        const key = `${title}/Active/Research/Research Notes - ${abr}.txt`;
        docs[key] = { content: '', lastModified: new Date().toISOString() };
        activeChildren['Research'] = { type: 'folder', name: 'Research', collapsed: false, children: { [key]: { type: 'file', name: key } } };
      }

      if (includeWorldbuilding) {
        const key = `${title}/Active/Worldbuilding/World Notes - ${abr}.txt`;
        docs[key] = { content: '', lastModified: new Date().toISOString() };
        activeChildren['Worldbuilding'] = { type: 'folder', name: 'Worldbuilding', collapsed: false, children: { [key]: { type: 'file', name: key } } };
      }

      // Root project children
      const projectChildren: Record<string, FileNode> = {
        'Active': { type: 'folder', name: 'Active', collapsed: false, children: activeChildren },
      };

      if (includeFrontMatter) {
        const fmChildren: Record<string, FileNode> = {};
        ['Dedication', 'Epigraph', 'Prologue'].forEach(f => {
          const key = `${title}/Front Matter/${f} - ${abr}.txt`;
          docs[key] = { content: '', lastModified: new Date().toISOString() };
          fmChildren[key] = { type: 'file', name: key };
        });
        projectChildren['Front Matter'] = { type: 'folder', name: 'Front Matter', collapsed: false, children: fmChildren };
      }

      projectChildren['Versions'] = { type: 'folder', name: 'Versions', collapsed: false, children: {} };
      projectChildren['Snapshots'] = { type: 'folder', name: 'Snapshots', collapsed: false, children: {} };

      const vhKey = `${title}/Version History - ${abr}.txt`;
      const vhContent = `VERSION HISTORY - ${title}\nAbbreviation: ${abr}\nCreated: ${now}\n\nAdd notes about each version here.\n`;
      docs[vhKey] = { content: vhContent, lastModified: new Date().toISOString() };
      projectChildren[vhKey] = { type: 'file', name: vhKey };

      next.root.children[title] = { type: 'folder', name: title, collapsed: false, children: projectChildren };

      localStorage.setItem('pw-documents', JSON.stringify(docs));
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

  const reorderItem = useCallback((itemName: string, parentPath: string[], targetName: string, position: 'before' | 'after') => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;

      // Navigate to parent
      let parent: FileNode = next.root;
      for (const p of parentPath) {
        if (!parent.children?.[p]) return prev;
        parent = parent.children[p];
      }
      if (!parent.children) return prev;
      if (!parent.children[itemName] || !parent.children[targetName]) return prev;
      if (itemName === targetName) return prev;

      // Build current order (or derive from keys)
      const currentOrder = parent.childOrder && parent.childOrder.length > 0
        ? parent.childOrder.filter(k => k in parent.children!)
        : Object.keys(parent.children);

      // Add any missing keys
      for (const k of Object.keys(parent.children)) {
        if (!currentOrder.includes(k)) currentOrder.push(k);
      }

      // Remove the item being moved
      const filtered = currentOrder.filter(k => k !== itemName);

      // Find target index and insert
      const targetIdx = filtered.indexOf(targetName);
      if (targetIdx === -1) return prev;
      const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
      filtered.splice(insertIdx, 0, itemName);

      parent.childOrder = filtered;

      localStorage.setItem(FS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    structure, createFolder, addFileToTree, toggleFolder, moveFile, moveFolder, deleteFile, deleteFolder, renameFile, getFolders,
    createNovelProject, saveVersion, saveSnapshot, findFilesInFolder, getNovelProjects, createFileInFolder, restoreFromDeleted, emptyDeleted,
    reorderItem,
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
