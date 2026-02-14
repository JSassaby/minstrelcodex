import { useState, useCallback } from 'react';
import type { CurrentDocument, DocumentData } from '@/lib/types';

const DOCS_KEY = 'pw-documents';
const RECENT_KEY = 'pw-recent';
const CURRENT_KEY = 'pw-current';

function getDocuments(): Record<string, DocumentData> {
  return JSON.parse(localStorage.getItem(DOCS_KEY) || '{}');
}

export function useDocumentStorage() {
  const [currentDocument, setCurrentDocument] = useState<CurrentDocument>({
    filename: '',
    content: '',
    saved: true,
    lastModified: null,
  });

  const saveDocument = useCallback((filename: string, content: string) => {
    const documents = getDocuments();
    documents[filename] = { content, lastModified: new Date().toISOString() };
    localStorage.setItem(DOCS_KEY, JSON.stringify(documents));

    // Add to recent
    let recent: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    recent = recent.filter(f => f !== filename);
    recent.unshift(filename);
    recent = recent.slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));

    setCurrentDocument(prev => ({ ...prev, filename, content, saved: true, lastModified: new Date().toISOString() }));
  }, []);

  const loadDocument = useCallback((filename: string): string | null => {
    const documents = getDocuments();
    const doc = documents[filename];
    if (!doc) return null;

    // Handle both string and object formats (bug fix)
    const content = typeof doc === 'string' ? doc : (doc.content || '');

    setCurrentDocument({
      filename,
      content,
      saved: true,
      lastModified: typeof doc === 'string' ? new Date().toISOString() : doc.lastModified,
    });

    // Add to recent
    let recent: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    recent = recent.filter(f => f !== filename);
    recent.unshift(filename);
    recent = recent.slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));

    return content;
  }, []);

  const getAllDocuments = useCallback(() => getDocuments(), []);

  const getRecentFiles = useCallback((): string[] => {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 5);
  }, []);

  const saveState = useCallback((content: string) => {
    localStorage.setItem(CURRENT_KEY, JSON.stringify({
      filename: currentDocument.filename,
      content,
      saved: currentDocument.saved,
    }));
  }, [currentDocument.filename, currentDocument.saved]);

  const loadState = useCallback((): { filename: string; content: string; saved: boolean } | null => {
    const saved = localStorage.getItem(CURRENT_KEY);
    if (!saved) return null;
    const data = JSON.parse(saved);
    if (data.content) {
      setCurrentDocument({
        filename: data.filename || '',
        content: data.content,
        saved: data.saved ?? true,
        lastModified: new Date().toISOString(),
      });
      return data;
    }
    return null;
  }, []);

  const updateContent = useCallback((content: string) => {
    setCurrentDocument(prev => ({ ...prev, content, saved: false }));
  }, []);

  const createNew = useCallback(() => {
    setCurrentDocument({ filename: '', content: '', saved: true, lastModified: null });
  }, []);

  return {
    currentDocument,
    setCurrentDocument,
    saveDocument,
    loadDocument,
    getAllDocuments,
    getRecentFiles,
    saveState,
    loadState,
    updateContent,
    createNew,
  };
}
