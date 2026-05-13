import type { JSONContent } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import {
  extractQAContentText,
  qaTextToEditorDoc,
  renderQAContentHtml,
  serializeQADoc,
} from '../../src/components/qa/qaRichText';

describe('qaRichText', () => {
  it('serializes tiptap docs and preserves rich formatting in rendered html', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Need ' },
            { type: 'text', text: 'help', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' with ' },
            {
              type: 'text',
              text: 'particles',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
            },
          ],
        },
      ],
    };

    const stored = serializeQADoc(doc);
    const html = renderQAContentHtml(stored);

    expect(html).toContain('<strong>help</strong>');
    expect(html).toContain('href="https://example.com"');
    expect(extractQAContentText(stored)).toBe('Need help with particles');
  });

  it('converts legacy plain text into an editor doc and readable html', () => {
    const doc = qaTextToEditorDoc('First line\n\nSecond line');
    const stored = serializeQADoc(doc);
    const html = renderQAContentHtml(stored);

    expect(extractQAContentText(stored)).toBe('First line Second line');
    expect(html).toContain('First line');
    expect(html).toContain('Second line');
  });
});
