import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeStrictHtml } from '../../src/utils/sanitize';

describe('sanitizeHtml', () => {
  it('should allow safe tags', () => {
    const input = '<b>Bold</b> and <i>Italic</i>';
    expect(sanitizeHtml(input)).toBe('<b>Bold</b> and <i>Italic</i>');
  });

  it('should allow links with safe attributes', () => {
    const input = '<a href="https://example.com" target="_blank">Link</a>';
    expect(sanitizeHtml(input)).toBe('<a href="https://example.com" target="_blank">Link</a>');
  });

  it('should remove script tags', () => {
    const input = 'Hello <script>alert(1)</script> World';
    expect(sanitizeHtml(input)).toBe('Hello  World');
  });

  it('should remove event handlers', () => {
    const input = '<div onclick="alert(1)">Click me</div>';
    expect(sanitizeHtml(input)).toBe('<div>Click me</div>');
  });

  it('should remove javascript: URLs', () => {
    const input = '<a href="javascript:alert(1)">Link</a>';
    expect(sanitizeHtml(input)).toBe('<a>Link</a>');
  });
});

describe('sanitizeStrictHtml', () => {
  it('should allow mark tags with data attributes', () => {
    const input = '<mark data-annotation-id="123" class="highlight">Text</mark>';
    expect(sanitizeStrictHtml(input)).toBe(
      '<mark data-annotation-id="123" class="highlight">Text</mark>'
    );
  });

  it('should remove unsafe tags', () => {
    const input = '<script>alert(1)</script>';
    expect(sanitizeStrictHtml(input)).toBe('');
  });

  it('should remove unsafe attributes', () => {
    const input = '<mark onclick="alert(1)">Text</mark>';
    expect(sanitizeStrictHtml(input)).toBe('<mark>Text</mark>');
  });
});
