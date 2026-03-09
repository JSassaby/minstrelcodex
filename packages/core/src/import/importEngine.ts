/**
 * importEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * File conversion and import logic for .txt, .md, .docx, .pdf, and .html files.
 * All conversion runs in the browser; no server required.
 */

import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker once (Vite resolves the URL at build time)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

// ── Types ─────────────────────────────────────────────────────────────────

export type SupportedExtension = 'txt' | 'md' | 'docx' | 'pdf' | 'html';

export interface ImportedFile {
  /** Filename without extension, e.g. "Chapter1" */
  name: string;
  /** Relative path from import root, e.g. "MyNovel/Chapter1" */
  path: string;
  /** Converted plain or lightly formatted text */
  content: string;
  /** Original filename with extension, e.g. "Chapter1.docx" */
  originalName: string;
}

// ── Extension detection ───────────────────────────────────────────────────

function getExtension(filename: string): SupportedExtension | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.txt'))  return 'txt';
  if (lower.endsWith('.md'))   return 'md';
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.pdf'))  return 'pdf';
  if (lower.endsWith('.html')) return 'html';
  return null;
}

function stripExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

// ── Converters ────────────────────────────────────────────────────────────

export async function convertTxt(file: File): Promise<string> {
  return file.text();
}

export async function convertMarkdown(file: File): Promise<string> {
  // Return markdown as-is — preserve all syntax
  return file.text();
}

export async function convertHtml(file: File): Promise<string> {
  const text = await file.text();
  // Strip all HTML tags
  const stripped = text.replace(/<[^>]*>/g, '');
  // Collapse multiple blank lines into a single blank line
  return stripped.replace(/\n{3,}/g, '\n\n').trim();
}

export async function convertDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export async function convertPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(pageText);
  }

  return pages.join('\n\n');
}

// ── Main import function ──────────────────────────────────────────────────

export async function importFiles(
  files: FileList | File[],
): Promise<ImportedFile[]> {
  const fileArray = Array.from(files);
  const results: ImportedFile[] = [];

  for (const file of fileArray) {
    const ext = getExtension(file.name);
    if (!ext) continue; // skip unsupported types

    let content: string;
    try {
      switch (ext) {
        case 'txt':  content = await convertTxt(file);      break;
        case 'md':   content = await convertMarkdown(file); break;
        case 'html': content = await convertHtml(file);     break;
        case 'docx': content = await convertDocx(file);     break;
        case 'pdf':  content = await convertPdf(file);      break;
      }
    } catch {
      // Skip files that fail to convert
      continue;
    }

    // Derive path from webkitRelativePath if available (folder import),
    // otherwise use the filename alone
    const relativePath = (file as File & { webkitRelativePath?: string })
      .webkitRelativePath || file.name;

    // Strip file extension from the last segment to get the document name
    const segments = relativePath.split('/').filter(Boolean);
    const lastName  = segments[segments.length - 1];
    const nameNoExt = stripExtension(lastName);
    segments[segments.length - 1] = nameNoExt;

    const path = segments.join('/');
    const name = nameNoExt;

    results.push({
      name,
      path,
      content,
      originalName: file.name,
    });
  }

  // Sort alphabetically by path
  results.sort((a, b) => a.path.localeCompare(b.path));
  return results;
}
