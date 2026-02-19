import { useState, useCallback, useMemo } from 'react';
import ModalShell, { ModalButton } from './ModalShell';
import type { FileNode } from '@/lib/types';

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  fileStructure: FileNode;
  getFolders: () => { name: string; path: string[] }[];
  findFilesInFolder: (node: FileNode, folderPath: string[]) => string[];
  showToast: (msg: string) => void;
}

interface TreeItem {
  name: string;
  type: 'file' | 'folder';
  path: string[];
  docKey: string;
  depth: number;
}

function buildTreeItems(node: FileNode, path: string[] = [], depth: number = 0): TreeItem[] {
  const result: TreeItem[] = [];
  const children = node.children || {};
  const sorted = Object.keys(children).sort((a, b) => {
    const aType = children[a].type;
    const bType = children[b].type;
    if (aType !== bType) return aType === 'folder' ? -1 : 1;
    return a.localeCompare(b);
  });
  for (const name of sorted) {
    if (name === 'Deleted') continue;
    const item = children[name];
    const itemPath = [...path, name];
    if (item.type === 'folder') {
      result.push({ name, type: 'folder', path: itemPath, docKey: itemPath.join('/'), depth });
      result.push(...buildTreeItems(item, itemPath, depth + 1));
    } else {
      const docKey = item.name || itemPath.join('/');
      result.push({ name, type: 'file', path: itemPath, docKey, depth });
    }
  }
  return result;
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.innerText || div.textContent || '';
}

function getDocContent(docKey: string): string {
  const docs = JSON.parse(localStorage.getItem('pw-documents') || '{}');
  const data = docs[docKey];
  if (!data) return '';
  return stripHtml(typeof data === 'string' ? data : (data.content || ''));
}

export default function ExportModal({ visible, onClose, fileStructure, getFolders, findFilesInFolder, showToast }: ExportModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<'pdf' | 'txt'>('pdf');

  const treeItems = useMemo(() => buildTreeItems(fileStructure), [fileStructure]);

  const toggleItem = useCallback((item: TreeItem) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (item.type === 'file') {
        if (next.has(item.docKey)) next.delete(item.docKey);
        else next.add(item.docKey);
      } else {
        const folderPrefix = item.path.join('/') + '/';
        const filesInFolder = treeItems.filter(t => t.type === 'file' && t.docKey.startsWith(folderPrefix));
        const allSelected = filesInFolder.every(f => next.has(f.docKey));
        for (const f of filesInFolder) {
          if (allSelected) next.delete(f.docKey);
          else next.add(f.docKey);
        }
      }
      return next;
    });
  }, [treeItems]);

  const collectContent = useCallback((): { title: string; text: string }[] => {
    const results: { title: string; text: string }[] = [];
    for (const item of treeItems) {
      if (item.type === 'file' && selectedKeys.has(item.docKey)) {
        const text = getDocContent(item.docKey);
        if (text.trim()) results.push({ title: item.name, text });
      }
    }
    return results;
  }, [selectedKeys, treeItems]);

  const exportTxt = useCallback(() => {
    const sections = collectContent();
    if (sections.length === 0) { showToast('No content to export.'); return; }
    const combined = sections.map(s => `=== ${s.title} ===\n\n${s.text}`).join('\n\n\n');
    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `export-${new Date().toISOString().split('T')[0]}.txt`; a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${sections.length} files as .txt`);
    onClose();
  }, [collectContent, showToast, onClose]);

  const exportPdf = useCallback(async () => {
    const sections = collectContent();
    if (sections.length === 0) { showToast('No content to export.'); return; }
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      const lineHeight = 6;
      let y = margin;
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (y > 260) { doc.addPage(); y = margin; }
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text(section.title, margin, y); y += 10;
        doc.setFontSize(11); doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(section.text, maxWidth);
        for (const line of lines) {
          if (y > 280) { doc.addPage(); y = margin; }
          doc.text(line, margin, y); y += lineHeight;
        }
        if (i < sections.length - 1) { y += 10; if (y > 260) { doc.addPage(); y = margin; } }
      }
      doc.save(`export-${new Date().toISOString().split('T')[0]}.pdf`);
      showToast(`Exported ${sections.length} files as PDF`);
      onClose();
    } catch (err) { showToast('PDF export failed.'); console.error(err); }
  }, [collectContent, showToast, onClose]);

  const handleExport = useCallback(() => {
    if (format === 'txt') exportTxt(); else exportPdf();
  }, [format, exportTxt, exportPdf]);

  if (!visible) return null;

  const selectedCount = selectedKeys.size;

  return (
    <ModalShell visible={visible} title="📤 Export / Combine" onClose={onClose}>
      {/* File tree */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '8px', fontFamily: uiFont, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Select files or folders
        </div>
        <div style={{
          maxHeight: '240px', overflowY: 'auto',
          border: '1px solid var(--terminal-border)', borderRadius: '10px',
          overflow: 'hidden',
        }}>
          {treeItems.length === 0 && (
            <div style={{ padding: '16px', opacity: 0.45, textAlign: 'center', fontSize: '13px', fontFamily: uiFont }}>No files found</div>
          )}
          {treeItems.map((item) => {
            let isSelected = false;
            let isFolderPartial = false;
            if (item.type === 'file') {
              isSelected = selectedKeys.has(item.docKey);
            } else {
              const folderPrefix = item.path.join('/') + '/';
              const filesInFolder = treeItems.filter(t => t.type === 'file' && t.docKey.startsWith(folderPrefix));
              const selectedInFolder = filesInFolder.filter(f => selectedKeys.has(f.docKey)).length;
              isSelected = filesInFolder.length > 0 && selectedInFolder === filesInFolder.length;
              isFolderPartial = selectedInFolder > 0 && selectedInFolder < filesInFolder.length;
            }
            const checkMark = isSelected ? '☑' : isFolderPartial ? '▣' : '☐';
            return (
              <div
                key={item.docKey + item.type}
                onClick={() => toggleItem(item)}
                style={{
                  padding: '8px 14px',
                  paddingLeft: `${14 + item.depth * 16}px`,
                  cursor: 'pointer',
                  background: isSelected ? 'var(--terminal-accent)' : 'transparent',
                  color: isSelected ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  borderBottom: '1px solid var(--terminal-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontFamily: uiFont,
                  transition: 'background 0.1s',
                }}
              >
                <span>{checkMark}</span>
                <span>{item.type === 'folder' ? '📁' : '📄'} {item.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Format */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '10px', fontFamily: uiFont, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Format</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['pdf', 'txt'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              style={{
                padding: '8px 18px', borderRadius: '8px',
                border: format === f ? '1.5px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
                background: format === f ? 'var(--terminal-accent)' : 'var(--terminal-surface)',
                color: format === f ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                fontFamily: uiFont, fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              {f === 'pdf' ? '📄 PDF' : '📝 TXT'}
            </button>
          ))}
        </div>
      </div>

      {selectedCount > 0 && (
        <div style={{ fontSize: '12px', opacity: 0.55, marginBottom: '16px', fontFamily: uiFont }}>
          {selectedCount} file{selectedCount !== 1 ? 's' : ''} selected · combined in order
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <ModalButton label={`Export ${format.toUpperCase()}`} focused={selectedCount > 0} onClick={handleExport} />
        <ModalButton label="Cancel" focused={false} onClick={onClose} />
      </div>
    </ModalShell>
  );
}
