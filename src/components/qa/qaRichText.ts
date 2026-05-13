import type { JSONContent } from '@tiptap/core';
import { sanitizeHtml } from '../../utils/sanitize';

export const EMPTY_QA_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

type TiptapMark = {
  type?: string;
  attrs?: Record<string, unknown>;
};

type TiptapNode = JSONContent & {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  content?: TiptapNode[];
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeHref = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('javascript:')) return null;
  return trimmed;
};

const wrapMarks = (html: string, marks: TiptapMark[] | undefined): string => {
  if (!marks || marks.length === 0) return html;

  return marks.reduce((result, mark) => {
    if (mark.type === 'bold') return `<strong>${result}</strong>`;
    if (mark.type === 'italic') return `<em>${result}</em>`;
    if (mark.type === 'strike') return `<del>${result}</del>`;
    if (mark.type === 'code') return `<code>${result}</code>`;
    if (mark.type === 'underline') return `<u>${result}</u>`;
    if (mark.type === 'highlight') return `<mark>${result}</mark>`;
    if (mark.type === 'link') {
      const href = normalizeHref(mark.attrs?.href);
      return href ? `<a href="${escapeHtml(href)}" target="_blank">${result}</a>` : result;
    }
    return result;
  }, html);
};

const renderChildren = (node: TiptapNode): string =>
  (node.content ?? []).map((child: TiptapNode) => renderNode(child)).join('');

const extractNodeText = (value: unknown): string => {
  if (!value || typeof value !== 'object') return '';
  const node = value as TiptapNode;
  const text = typeof node.text === 'string' ? node.text : '';
  const children = (node.content ?? []).map((child: TiptapNode) => extractNodeText(child)).join(' ');
  return `${text} ${children}`.replace(/\s+/g, ' ').trim();
};

const renderNode = (node: TiptapNode): string => {
  if (node.type === 'text') {
    return wrapMarks(escapeHtml(node.text ?? ''), node.marks);
  }
  if (node.type === 'paragraph') {
    const html = renderChildren(node);
    return html.trim().length > 0 ? `<p>${html}</p>` : '<p><br /></p>';
  }
  if (node.type === 'heading') {
    return `<p><strong>${renderChildren(node)}</strong></p>`;
  }
  if (node.type === 'bulletList' || node.type === 'taskList') {
    return `<ul>${renderChildren(node)}</ul>`;
  }
  if (node.type === 'orderedList') {
    return `<ol>${renderChildren(node)}</ol>`;
  }
  if (node.type === 'listItem') {
    return `<li>${renderChildren(node)}</li>`;
  }
  if (node.type === 'taskItem') {
    const marker = node.attrs?.checked === true ? '☑ ' : '☐ ';
    return `<li>${marker}${renderChildren(node)}</li>`;
  }
  if (node.type === 'blockquote') {
    return `<blockquote>${renderChildren(node)}</blockquote>`;
  }
  if (node.type === 'codeBlock') {
    return `<div><code>${escapeHtml(extractNodeText(node))}</code></div>`;
  }
  if (node.type === 'horizontalRule') {
    return '<div>---</div>';
  }
  if (node.type === 'hardBreak') {
    return '<br />';
  }
  if (node.type === 'doc') {
    return renderChildren(node);
  }
  return renderChildren(node);
};

const isTiptapDoc = (value: unknown): value is TiptapNode => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.type === 'doc' && Array.isArray(record.content);
};

const parseStructuredContent = (value: string): TiptapNode | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    return isTiptapDoc(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const qaTextToEditorDoc = (value: string): JSONContent => {
  const lines = value
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return EMPTY_QA_DOC;

  return {
    type: 'doc',
    content: lines.map(line => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
};

export const serializeQADoc = (doc: JSONContent): string => JSON.stringify(doc ?? EMPTY_QA_DOC);

export const storedQAContentToEditorDoc = (value: string): JSONContent => {
  const doc = parseStructuredContent(value);
  return doc ?? qaTextToEditorDoc(value);
};

export const extractQAContentText = (value: string): string => {
  const doc = parseStructuredContent(value);
  if (doc) return extractNodeText(doc);
  return value.replace(/\s+/g, ' ').trim();
};

export const renderQAContentHtml = (value: string): string => {
  const doc = parseStructuredContent(value);
  if (doc) return sanitizeHtml(renderNode(doc));

  const html = value
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join('');

  return sanitizeHtml(html || '<p><br /></p>');
};
