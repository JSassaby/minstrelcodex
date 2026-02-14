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

  return { structure, createFolder, addFileToTree, toggleFolder, moveFile, getFolders };
}

function findFile(node: FileNode, filename: string): boolean {
  if (!node.children) return false;
  for (const [name, item] of Object.entries(node.children)) {
    if (item.type === 'file' && name === filename) return true;
    if (item.type === 'folder' && findFile(item, filename)) return true;
  }
  return false;
}
