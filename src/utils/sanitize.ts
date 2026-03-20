import DOMPurify from 'dompurify';

export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'u',
      'ins',
      'del',
      'code',
      'sub',
      'sup',
      'a',
      'span',
      'div',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'mark',
      'blockquote',
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'className', 'id', 'data-annotation-id', 'style'],
  });
};

export const sanitizeStrictHtml = sanitizeHtml;
