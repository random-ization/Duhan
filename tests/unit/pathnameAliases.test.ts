import { describe, expect, it } from 'vitest';
import { getPathWithoutLang } from '../../src/utils/pathname';

describe('pathname alias normalization', () => {
  it('normalizes legacy root aliases with language prefixes', () => {
    expect(getPathWithoutLang('/en/vocabbook')).toBe('/vocab-book');
    expect(getPathWithoutLang('/en/practice')).toBe('/courses');
  });

  it('normalizes legacy root aliases without language prefixes', () => {
    expect(getPathWithoutLang('/vocabbook')).toBe('/vocab-book');
    expect(getPathWithoutLang('/practice')).toBe('/courses');
  });
});
