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

// ── HTML → editor format conversion ──────────────────────────────────────
//
// Converts an arbitrary HTML string into the editor's storage format:
// only the tags the editor understands (<p>, <h1>–<h4>, <strong>, <em>,
// <ul>, <ol>, <li>, <hr>) are preserved; everything else is normalised.
// Uses DOMParser so entity decoding and malformed-markup recovery are
// handled by the browser's own HTML parser.

function htmlStringToEditorHtml(htmlString: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const blocks: string[] = [];

  // Escape text-node content for safe embedding in an HTML string.
  // DOMParser already decoded entities (&amp; → &), so we must re-encode
  // them when serialising back to HTML.
  function escHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Serialise a single inline node to an HTML string.
  // Preserves <strong>/<b> and <em>/<i>; strips everything else to text.
  function inlineNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return escHtml(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el  = node as Element;
    const tag = el.tagName.toLowerCase();

    // Silently drop non-visible metadata
    if (['style', 'script', 'meta', 'link', 'head', 'noscript', 'template'].includes(tag)) return '';
    // <br> is handled at block level, not inline
    if (tag === 'br') return '';

    const inner = Array.from(el.childNodes).map(inlineNode).join('');
    if (tag === 'strong' || tag === 'b') return inner ? `<strong>${inner}</strong>` : '';
    if (tag === 'em'     || tag === 'i') return inner ? `<em>${inner}</em>`         : '';

    // Any other inline element (span, a, abbr, …) — just its text content
    return inner;
  }

  // Collect the inline content of a block element's children, splitting into
  // separate strings whenever a direct-child <br> is encountered.
  // Returns one string per eventual <p> (may be empty strings for blank lines).
  function splitOnBr(el: Element): string[] {
    const paras: string[] = [];
    let current: string[] = [];
    for (const child of Array.from(el.childNodes)) {
      if (
        child.nodeType === Node.ELEMENT_NODE &&
        (child as Element).tagName.toLowerCase() === 'br'
      ) {
        paras.push(current.join(''));
        current = [];
      } else {
        current.push(inlineNode(child));
      }
    }
    paras.push(current.join(''));
    return paras;
  }

  // Tags whose content should be skipped entirely
  const SKIP = new Set([
    'head', 'style', 'script', 'meta', 'link', 'noscript', 'template',
  ]);

  // Tags that are structural wrappers with no semantic block meaning —
  // we just recurse into their children without emitting a block of their own.
  const TRANSPARENT = new Set([
    'html', 'body', 'main', 'header', 'footer', 'nav', 'aside',
    'figure', 'figcaption',
    // Table structure — flatten cells into paragraphs
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption',
  ]);

  // Tags that count as "block" children for the purpose of deciding whether
  // a generic container (div, section, …) should be recursed or treated as <p>.
  const BLOCK_TAGS = new Set([
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'hr', 'div', 'section', 'article', 'blockquote',
    'pre', 'address', 'details', 'summary', 'table',
  ]);

  function walkBlock(node: Node): void {
    // Bare text node at block level → wrap in <p>
    if (node.nodeType === Node.TEXT_NODE) {
      const text = escHtml((node.textContent || '').replace(/\s+/g, ' ').trim());
      if (text) blocks.push(`<p>${text}</p>`);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el  = node as Element;
    const tag = el.tagName.toLowerCase();

    if (SKIP.has(tag)) return;

    if (TRANSPARENT.has(tag)) {
      for (const child of Array.from(el.childNodes)) walkBlock(child);
      return;
    }

    // ── Explicit block handlers ──────────────────────────────────────

    if (tag === 'hr') {
      blocks.push('<hr>');
      return;
    }

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const inner = Array.from(el.childNodes).map(inlineNode).join('').trim();
      if (inner) blocks.push(`<${tag}>${inner}</${tag}>`);
      return;
    }

    // h4–h6 all map to <h4> (the deepest heading the editor supports)
    if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
      const inner = Array.from(el.childNodes).map(inlineNode).join('').trim();
      if (inner) blocks.push(`<h4>${inner}</h4>`);
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items: string[] = [];
      for (const child of Array.from(el.childNodes)) {
        if (
          child.nodeType === Node.ELEMENT_NODE &&
          (child as Element).tagName.toLowerCase() === 'li'
        ) {
          const inner = Array.from((child as Element).childNodes)
            .map(inlineNode).join('').trim();
          if (inner) items.push(`<li>${inner}</li>`);
        }
      }
      if (items.length) blocks.push(`<${tag}>${items.join('')}</${tag}>`);
      return;
    }

    if (tag === 'p') {
      const parts = splitOnBr(el);
      for (const part of parts) {
        const trimmed = part.trim();
        // Preserve intentional blank paragraphs; they may be collapsed later.
        blocks.push(trimmed ? `<p>${trimmed}</p>` : '<p></p>');
      }
      return;
    }

    // ── Generic block container (div, section, article, blockquote, pre, …) ──
    // If it contains block-level children → recurse so we don't lose structure.
    // Otherwise treat the whole thing as a single <p>.
    const hasBlockChild = Array.from(el.children).some(c =>
      BLOCK_TAGS.has(c.tagName.toLowerCase()),
    );

    if (hasBlockChild) {
      for (const child of Array.from(el.childNodes)) walkBlock(child);
    } else {
      const parts = splitOnBr(el);
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) blocks.push(`<p>${trimmed}</p>`);
      }
    }
  }

  walkBlock(doc.documentElement);

  // Collapse three or more consecutive empty paragraphs to one.
  let html = blocks.join('');
  html = html.replace(/(<p><\/p>){3,}/g, '<p></p>');

  // Strip leading / trailing empty paragraphs produced by <body> padding.
  html = html.replace(/^(<p><\/p>)+/, '').replace(/(<p><\/p>)+$/, '');

  return html || '<p></p>';
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
  return htmlStringToEditorHtml(text);
}

export async function convertDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // Use convertToHtml (not extractRawText) so mammoth preserves headings,
  // bold, italic, and lists as HTML tags; then normalise to editor format.
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return htmlStringToEditorHtml(result.value);
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
