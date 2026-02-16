import { useState, useCallback } from 'react';
import ModalShell, { ModalButton } from './ModalShell';
import type { FileNode } from '@/lib/types';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  fileStructure: FileNode;
  getFolders: () => { name: string; path: string[] }[];
  findFilesInFolder: (node: FileNode, folderPath: string[]) => string[];
  showToast: (msg: string) => void;
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
  return stripHtml(data.content || '');
}

export default function ExportModal({ visible, onClose, fileStructure, getFolders, findFilesInFolder, showToast }: ExportModalProps) {
  const [selectedFolders, setSelectedFolders] = useState<string[][]>([]);
  const [format, setFormat] = useState<'pdf' | 'txt'>('pdf');

  const folders = getFolders();

  const toggleFolder = useCallback((path: string[]) => {
    const key = path.join('/');
    setSelectedFolders(prev => {
      const exists = prev.find(p => p.join('/') === key);
      if (exists) return prev.filter(p => p.join('/') !== key);
      return [...prev, path];
    });
  }, []);

  const collectContent = useCallback((): { title: string; text: string }[] => {
    const results: { title: string; text: string }[] = [];
    for (const folderPath of selectedFolders) {
      const files = findFilesInFolder(fileStructure, folderPath);
      for (const docKey of files) {
        const text = getDocContent(docKey);
        if (text.trim()) {
          const shortName = docKey.split('/').pop() || docKey;
          results.push({ title: shortName, text });
        }
      }
    }
    return results;
  }, [selectedFolders, fileStructure, findFilesInFolder]);

  const exportTxt = useCallback(() => {
    const sections = collectContent();
    if (sections.length === 0) {
      showToast('No content to export.');
      return;
    }
    const combined = sections.map(s => `=== ${s.title} ===\n\n${s.text}`).join('\n\n\n');
    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${sections.length} files as .txt`);
    onClose();
  }, [collectContent, showToast, onClose]);

  const exportPdf = useCallback(async () => {
    const sections = collectContent();
    if (sections.length === 0) {
      showToast('No content to export.');
      return;
    }
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
        // Title
        if (y > 260) { doc.addPage(); y = margin; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(section.title, margin, y);
        y += 10;

        // Body
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(section.text, maxWidth);
        for (const line of lines) {
          if (y > 280) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += lineHeight;
        }

        // Separator between sections
        if (i < sections.length - 1) {
          y += 10;
          if (y > 260) { doc.addPage(); y = margin; }
        }
      }

      doc.save(`export-${new Date().toISOString().split('T')[0]}.pdf`);
      showToast(`Exported ${sections.length} files as PDF`);
      onClose();
    } catch (err) {
      showToast('PDF export failed.');
      console.error(err);
    }
  }, [collectContent, showToast, onClose]);

  const handleExport = useCallback(() => {
    if (format === 'txt') exportTxt();
    else exportPdf();
  }, [format, exportTxt, exportPdf]);

  if (!visible) return null;

  return (
    <ModalShell visible={visible} title="📤 EXPORT / COMBINE" onClose={onClose}>
      <div style={{ margin: '12px 0' }}>
        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>SELECT FOLDERS TO COMBINE:</div>
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--terminal-text)', marginBottom: '16px' }}>
          {folders.length === 0 && (
            <div style={{ padding: '12px', opacity: 0.5, textAlign: 'center' }}>No folders found</div>
          )}
          {folders.map((folder) => {
            const key = folder.path.join('/');
            const isSelected = selectedFolders.some(p => p.join('/') === key);
            return (
              <div
                key={key}
                onClick={() => toggleFolder(folder.path)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--terminal-text)' : 'transparent',
                  color: isSelected ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{isSelected ? '☑' : '☐'}</span>
                <span>📁 {folder.name}</span>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>FORMAT:</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <ModalButton label="📄 PDF" focused={format === 'pdf'} onClick={() => setFormat('pdf')} />
          <ModalButton label="📝 TXT" focused={format === 'txt'} onClick={() => setFormat('txt')} />
        </div>

        {selectedFolders.length > 0 && (
          <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '12px' }}>
            {selectedFolders.length} folder(s) selected — files will be combined in order
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <ModalButton
          label={`EXPORT ${format.toUpperCase()}`}
          focused={selectedFolders.length > 0}
          onClick={handleExport}
        />
        <ModalButton label="CANCEL" focused={false} onClick={onClose} />
      </div>
    </ModalShell>
  );
}
