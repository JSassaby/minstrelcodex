import { useState, useCallback, useEffect, useRef } from 'react';
import type { FileStructure, FileNode } from '@minstrelcodex/core';
import { db, docsCache, type DocumentRecord } from '@minstrelcodex/core';

const defaultStructure: FileStructure = {
  root: { type: 'folder', name: 'root', children: {} },
};

// Background write of the tree to Dexie — never blocks the UI.
function saveFs(s: FileStructure): void {
  db.fileStructure.put({ id: 'root', data: JSON.stringify(s) }).catch(console.error);
}

export function useFileStructure() {
  const [structure, setStructure] = useState<FileStructure>(defaultStructure);
  const initialised = useRef(false);

  // Load structure from Dexie on first mount.
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    (async () => {
      const row = await db.fileStructure.get('root');
      if (row?.data) {
        try {
          setStructure(JSON.parse(row.data) as FileStructure);
        } catch {
          // corrupt data — keep default
        }
      } else {
        // Pre-migration fallback: seed from localStorage if Dexie is empty.
        const saved = localStorage.getItem('pw-file-structure');
        if (saved) {
          try {
            const fs = JSON.parse(saved) as FileStructure;
            setStructure(fs);
            saveFs(fs);
          } catch {
            // ignore
          }
        }
      }
    })();
  }, []);

  // ── Tree mutations — each updates React state synchronously, then ──
  // ── persists to Dexie in the background.                          ──

  const createFolder = useCallback((name: string) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      if (!next.root.children) next.root.children = {};
      if (next.root.children[name]) return prev;
      next.root.children[name] = { type: 'folder', name, children: {}, collapsed: false };
      saveFs(next);
      return next;
    });
  }, []);

  const addFileToTree = useCallback((filename: string) => {
    setStructure(prev => {
      if (findFile(prev.root, filename)) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      if (!next.root.children) next.root.children = {};
      next.root.children[filename] = { type: 'file', name: filename };
      saveFs(next);
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
      saveFs(next);
      return next;
    });
  }, []);

  const moveFolder = useCallback((folderName: string, fromPath: string[], toPath: string[]) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      let sourceParent: FileNode = next.root;
      for (const p of fromPath) {
        if (!sourceParent.children?.[p]) return prev;
        sourceParent = sourceParent.children[p];
      }
      if (!sourceParent.children?.[folderName]) return prev;
      const folderData = sourceParent.children[folderName];
      delete sourceParent.children[folderName];
      let dest: FileNode = next.root;
      for (const p of toPath) {
        if (!dest.children?.[p]) return prev;
        dest = dest.children[p];
      }
      if (!dest.children) dest.children = {};
      dest.children[folderName] = folderData;
      saveFs(next);
      return next;
    });
  }, []);

  const moveFile = useCallback((filename: string, fromPath: string[], toPath: string[]) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      let source: FileNode = next.root;
      for (const p of fromPath) {
        if (!source.children?.[p]) return prev;
        source = source.children[p];
      }
      if (!source.children?.[filename]) return prev;
      const fileData = source.children[filename];
      delete source.children[filename];
      let dest: FileNode = next.root;
      for (const p of toPath) {
        if (!dest.children?.[p]) return prev;
        dest = dest.children[p];
      }
      if (!dest.children) dest.children = {};
      dest.children[filename] = fileData;
      saveFs(next);
      return next;
    });
  }, []);

  const deleteFile = useCallback((filename: string) => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      const node = findFile(next.root, filename);
      if (!node) return prev;
      const nodeCopy = JSON.parse(JSON.stringify(node));
      removeFromTree(next.root, filename);
      if (!next.root.children) next.root.children = {};
      if (!next.root.children['Deleted']) {
        next.root.children['Deleted'] = { type: 'folder', name: 'Deleted', children: {}, collapsed: true };
      }
      next.root.children['Deleted'].children![filename] = nodeCopy;
      saveFs(next);
      return next;
    });
  }, []);

  const deleteFolder = useCallback((folderPath: string[]) => {
    if (folderPath.length === 0) return;
    const folderName = folderPath[folderPath.length - 1];
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      let parent: FileNode = next.root;
      for (let i = 0; i < folderPath.length - 1; i++) {
        if (!parent.children || !parent.children[folderPath[i]]) return prev;
        parent = parent.children[folderPath[i]];
      }
      if (!parent.children || !parent.children[folderName]) return prev;
      const folderCopy = JSON.parse(JSON.stringify(parent.children[folderName]));
      delete parent.children[folderName];
      if (!next.root.children) next.root.children = {};
      if (!next.root.children['Deleted']) {
        next.root.children['Deleted'] = { type: 'folder', name: 'Deleted', children: {}, collapsed: true };
      }
      const key = folderPath.join('/');
      next.root.children['Deleted'].children![key] = folderCopy;
      saveFs(next);
      return next;
    });
  }, []);

  const renameFile = useCallback((oldName: string, newName: string) => {
    // Tree update — synchronous.
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      renameInTree(next.root, oldName, newName);
      saveFs(next);
      return next;
    });
    // Mirror rename in shared cache so loadDocument(newName) is a cache hit.
    const oldEntry = docsCache[oldName];
    if (oldEntry) {
      docsCache[newName] = { ...oldEntry };
      delete docsCache[oldName];
    }
    // Document rename — async, background.
    (async () => {
      const oldDoc = await db.documents.get(oldName);
      if (oldDoc) {
        await db.documents.put({ ...oldDoc, id: newName, syncStatus: 'pending' });
        await db.documents.delete(oldName);
        // Populate cache if the old entry wasn't there (e.g. cold start).
        if (!oldEntry) {
          docsCache[newName] = { content: oldDoc.content, lastModified: oldDoc.lastModified };
        }
      }
    })().catch(console.error);
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
    // Compute the doc key outside the setStructure callback (derived only from params).
    const docKey = folderPath.length > 0 ? `${folderPath.join('/')}/${filename}` : filename;

    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      let current: FileNode = next.root;
      for (const p of folderPath) {
        if (!current.children || !current.children[p]) return prev;
        current = current.children[p];
      }
      if (!current.children) current.children = {};
      if (current.children[filename]) return prev;
      current.children[filename] = { type: 'file', name: docKey };
      saveFs(next);
      return next;
    });

    // Pre-populate shared cache so loadDocument() is a cache hit.
    docsCache[docKey] = { content: '', lastModified: new Date().toISOString() };
    // Create empty document record in Dexie — background.
    db.documents
      .put({ id: docKey, content: '', lastModified: new Date().toISOString(), syncStatus: 'pending' })
      .catch(console.error);
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
    const {
      title, abbreviation: abr, chapterCount, namingFormat,
      includeBible, includeNotes, includeResearch, includeWorldbuilding, includeFrontMatter,
    } = config;

    const formatChapter = (num: number): string => {
      const ch = String(num).padStart(2, '0');
      switch (namingFormat) {
        case 'ch-abr': return `Chapter ${ch} - ${abr}.txt`;
        case 'abr-ch': return `${abr} - Chapter ${ch}.txt`;
        case 'abr_ch': return `${abr}_Ch${ch}.txt`;
      }
    };

    const now = new Date().toLocaleDateString();
    const newDocs: DocumentRecord[] = [];

    // ── Build chapter files ──────────────────────────────────────────
    const chapterFiles: Record<string, { type: 'file'; name: string }> = {};
    for (let i = 1; i <= chapterCount; i++) {
      const chName = formatChapter(i);
      const chKey = `${title}/Active/Chapters/${chName}`;
      newDocs.push({ id: chKey, content: '', lastModified: new Date().toISOString(), syncStatus: 'pending' });
      chapterFiles[chKey] = { type: 'file', name: chKey };
    }

    const activeChildren: Record<string, FileNode> = {
      'Chapters': { type: 'folder', name: 'Chapters', collapsed: false, children: chapterFiles },
    };

    if (includeBible) {
      const bibleFiles: Record<string, FileNode> = {};
      ['Characters', 'Outline', 'Setting'].forEach(f => {
        const key = `${title}/Active/Bible/${f} - ${abr}.txt`;
        newDocs.push({ id: key, content: '', lastModified: new Date().toISOString(), syncStatus: 'pending' });
        bibleFiles[key] = { type: 'file', name: key };
      });
      if (config.pov || config.tense || config.styleNotes) {
        const styleKey = `${title}/Active/Bible/Style Guide - ${abr}.txt`;
        let styleContent = `STYLE GUIDE - ${title}\n${'='.repeat(40)}\n\n`;
        if (config.pov) styleContent += `Point of View: ${config.pov}\n`;
        if (config.tense) styleContent += `Tense: ${config.tense}\n`;
        if (config.targetWordCount) styleContent += `Target Word Count: ${config.targetWordCount.toLocaleString()}\n`;
        if (config.styleNotes) styleContent += `\nNotes:\n${config.styleNotes}\n`;
        newDocs.push({ id: styleKey, content: styleContent, lastModified: new Date().toISOString(), syncStatus: 'pending' });
        bibleFiles[styleKey] = { type: 'file', name: styleKey };
      }
      activeChildren['Bible'] = { type: 'folder', name: 'Bible', collapsed: false, children: bibleFiles };
    }

    if (includeNotes) {
      const key = `${title}/Active/Notes/Ideas - ${abr}.txt`;
      newDocs.push({ id: key, content: '', lastModified: new Date().toISOString(), syncStatus: 'pending' });
      activeChildren['Notes'] = { type: 'folder', name: 'Notes', collapsed: false, children: { [key]: { type: 'file', name: key } } };
    }

    if (includeResearch) {
      const key = `${title}/Active/Research/Research Notes - ${abr}.txt`;
      newDocs.push({ id: key, content: '', lastModified: new Date().toISOString(), syncStatus: 'pending' });
      activeChildren['Research'] = { type: 'folder', name: 'Research', collapsed: false, children: { [key]: { type: 'file', name: key } } };
    }

    if (includeWorldbuilding) {
      const key = `${title}/Active/Worldbuilding/World Notes - ${abr}.txt`;
      newDocs.push({ id: key, content: '', lastModified: new Date().toISOString(), syncStatus: 'pending' });
      activeChildren['Worldbuilding'] = { type: 'folder', name: 'Worldbuilding', collapsed: false, children: { [key]: { type: 'file', name: key } } };
    }

    const projectChildren: Record<string, FileNode> = {
      'Active': { type: 'folder', name: 'Active', collapsed: false, children: activeChildren },
    };

    if (includeFrontMatter) {
      const fmChildren: Record<string, FileNode> = {};
      ['Dedication', 'Epigraph', 'Prologue'].forEach(f => {
        const key = `${title}/Front Matter/${f} - ${abr}.txt`;
        newDocs.push({ id: key, content: '', lastModified: new Date().toISOString(), syncStatus: 'pending' });
        fmChildren[key] = { type: 'file', name: key };
      });
      projectChildren['Front Matter'] = { type: 'folder', name: 'Front Matter', collapsed: false, children: fmChildren };
    }

    projectChildren['Versions'] = { type: 'folder', name: 'Versions', collapsed: false, children: {} };
    projectChildren['Snapshots'] = { type: 'folder', name: 'Snapshots', collapsed: false, children: {} };

    const vhKey = `${title}/Version History - ${abr}.txt`;
    const vhContent = `VERSION HISTORY - ${title}\nAbbreviation: ${abr}\nCreated: ${now}\n\nAdd notes about each version here.\n`;
    newDocs.push({ id: vhKey, content: vhContent, lastModified: new Date().toISOString(), syncStatus: 'pending' });
    projectChildren[vhKey] = { type: 'file', name: vhKey };

    // Tree update — synchronous.
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      if (!next.root.children) next.root.children = {};
      if (next.root.children[title]) return prev;
      next.root.children[title] = { type: 'folder', name: title, collapsed: false, children: projectChildren };
      saveFs(next);
      return next;
    });

    // Pre-populate shared cache for all new docs so loadDocument() hits.
    newDocs.forEach(d => { docsCache[d.id] = { content: d.content, lastModified: d.lastModified }; });
    // Write all document records to Dexie — background.
    db.documents.bulkPut(newDocs).catch(console.error);
  }, []);

  // saveVersion reads existing chapter docs from Dexie, so it runs async
  // then drives the tree update synchronously once the reads are done.
  const saveVersion = useCallback((novelTitle: string, versionName: string) => {
    const novel = structure.root.children?.[novelTitle];
    if (!novel?.children) return;
    const chaptersFolder = novel.children['Active']?.children?.['Chapters'];

    (async () => {
      const chapterFiles: Record<string, FileNode> = {};

      if (chaptersFolder?.children) {
        for (const [, item] of Object.entries(chaptersFolder.children)) {
          if (item.type === 'file') {
            const copyName = `${novelTitle}/Versions/${versionName}/${item.name.split('/').pop()}`;
            const existingDoc = await db.documents.get(item.name);
            if (existingDoc) {
              await db.documents.put({
                ...existingDoc,
                id: copyName,
                syncStatus: 'pending',
                lastModified: new Date().toISOString(),
              });
            }
            chapterFiles[copyName] = { type: 'file', name: copyName };
          }
        }
      }

      // Update Version History doc.
      const historyKey = `${novelTitle}/Version History.txt`;
      const historyEntry = `${versionName} (${new Date().toLocaleDateString()})\n- \n\n`;
      const historyDoc = await db.documents.get(historyKey);
      if (historyDoc) {
        const lines = historyDoc.content.split('\n');
        const headerEnd = Math.min(3, lines.length);
        lines.splice(headerEnd, 0, historyEntry);
        await db.documents.put({
          ...historyDoc,
          content: lines.join('\n'),
          lastModified: new Date().toISOString(),
          syncStatus: 'pending',
        });
      }

      // Tree update runs after all Dexie reads, with chapterFiles ready.
      setStructure(prev => {
        const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
        const n = next.root.children?.[novelTitle];
        if (!n?.children) return prev;
        if (!n.children['Versions']) {
          n.children['Versions'] = { type: 'folder', name: 'Versions', collapsed: false, children: {} };
        }
        n.children['Versions'].children![versionName] = {
          type: 'folder', name: versionName, collapsed: true,
          children: chapterFiles,
        };
        saveFs(next);
        return next;
      });
    })().catch(console.error);
  }, [structure]);

  const saveSnapshot = useCallback((filename: string) => {
    if (!filename) return false;

    const dateStr = new Date().toISOString().split('T')[0];
    const shortName = filename.split('/').pop() || filename;
    const snapshotFolderName = `${dateStr} - ${shortName}`;
    const snapshotFileName = `Snapshots/${snapshotFolderName}/${shortName}`;

    // Copy document — background async.
    db.documents.get(filename).then(existingDoc => {
      if (existingDoc) {
        return db.documents.put({
          ...existingDoc,
          id: snapshotFileName,
          syncStatus: 'pending',
          lastModified: new Date().toISOString(),
        });
      }
    }).catch(console.error);

    // Tree update — synchronous.
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      if (!next.root.children) next.root.children = {};
      if (!next.root.children['Snapshots']) {
        next.root.children['Snapshots'] = { type: 'folder', name: 'Snapshots', collapsed: false, children: {} };
      }
      next.root.children['Snapshots'].children![snapshotFolderName] = {
        type: 'folder', name: snapshotFolderName, collapsed: true,
        children: { [snapshotFileName]: { type: 'file', name: snapshotFileName } },
      };
      saveFs(next);
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
      if (!next.root.children) next.root.children = {};
      next.root.children[itemName] = item;
      saveFs(next);
      return next;
    });
  }, []);

  // Collect doc IDs from current structure before the setStructure call
  // so the callback remains a pure prev → next transform.
  const emptyDeleted = useCallback(() => {
    const deleted = structure.root.children?.['Deleted'];
    if (!deleted?.children) return;

    const docIds: string[] = [];
    const collectFileIds = (node: FileNode) => {
      if (!node.children) return;
      for (const [, item] of Object.entries(node.children)) {
        if (item.type === 'file') docIds.push(item.name);
        if (item.type === 'folder') collectFileIds(item);
      }
    };
    collectFileIds(deleted);

    docIds.forEach(id => { delete docsCache[id]; });
    db.documents.bulkDelete(docIds).catch(console.error);

    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      const del = next.root.children?.['Deleted'];
      if (!del?.children) return prev;
      del.children = {};
      saveFs(next);
      return next;
    });
  }, [structure]);

  const reorderItem = useCallback((itemName: string, parentPath: string[], targetName: string, position: 'before' | 'after') => {
    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      let parent: FileNode = next.root;
      for (const p of parentPath) {
        if (!parent.children?.[p]) return prev;
        parent = parent.children[p];
      }
      if (!parent.children) return prev;
      if (!parent.children[itemName] || !parent.children[targetName]) return prev;
      if (itemName === targetName) return prev;

      const currentOrder = parent.childOrder && parent.childOrder.length > 0
        ? parent.childOrder.filter(k => k in parent.children!)
        : Object.keys(parent.children);
      for (const k of Object.keys(parent.children)) {
        if (!currentOrder.includes(k)) currentOrder.push(k);
      }
      const filtered = currentOrder.filter(k => k !== itemName);
      const targetIdx = filtered.indexOf(targetName);
      if (targetIdx === -1) return prev;
      const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
      filtered.splice(insertIdx, 0, itemName);
      parent.childOrder = filtered;
      saveFs(next);
      return next;
    });
  }, []);

  const permanentlyDeleteItem = useCallback((itemKey: string) => {
    const deleted = structure.root.children?.['Deleted'];
    if (!deleted?.children?.[itemKey]) return;

    // Collect doc IDs from current structure before the state update.
    const docIds: string[] = [];
    const item = deleted.children[itemKey];
    if (item.type === 'file') {
      docIds.push(item.name);
    } else {
      const collectIds = (node: FileNode) => {
        if (!node.children) return;
        for (const [, child] of Object.entries(node.children)) {
          if (child.type === 'file') docIds.push(child.name);
          if (child.type === 'folder') collectIds(child);
        }
      };
      collectIds(item);
    }
    docIds.forEach(id => { delete docsCache[id]; });
    db.documents.bulkDelete(docIds).catch(console.error);

    setStructure(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as FileStructure;
      const del = next.root.children?.['Deleted'];
      if (!del?.children?.[itemKey]) return prev;
      delete del.children[itemKey];
      saveFs(next);
      return next;
    });
  }, [structure]);

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

  return {
    structure, createFolder, addFileToTree, toggleFolder, moveFile, moveFolder,
    deleteFile, deleteFolder, renameFile, getFolders, createNovelProject, saveVersion,
    saveSnapshot, findFilesInFolder, getNovelProjects, createFileInFolder,
    restoreFromDeleted, emptyDeleted, reorderItem, permanentlyDeleteItem,
  };
}

// ── Pure tree helpers ─────────────────────────────────────────────────────────

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
