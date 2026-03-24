import { afterEach, describe, expect, it } from 'vitest';
import {
  detectLanguageFastPath,
  normalizeLocalizedPathname,
} from '../../src/components/LanguageRouter';

afterEach(() => {
  localStorage.clear();
});

describe('normalizeLocalizedPathname', () => {
  it('normalizes language prefix casing and trims trailing slash', () => {
    expect(normalizeLocalizedPathname('/EN/dashboard/')).toBe('/en/dashboard');
  });

  it('canonicalizes legacy vocabbook root route without language', () => {
    expect(normalizeLocalizedPathname('/vocabbook')).toBe('/vocab-book');
    expect(normalizeLocalizedPathname('/vocabbook/listen')).toBe('/vocab-book/listen');
  });

  it('canonicalizes legacy vocabbook route with language prefix', () => {
    expect(normalizeLocalizedPathname('/mn/vocabbook')).toBe('/mn/vocab-book');
    expect(normalizeLocalizedPathname('/zh/vocabbook/spelling')).toBe('/zh/vocab-book/spelling');
  });

  it('collapses duplicate slashes while preserving normalized route', () => {
    expect(normalizeLocalizedPathname('//vi//vocabbook//dictation//')).toBe(
      '/vi/vocab-book/dictation'
    );
  });

  it('keeps unrelated routes unchanged', () => {
    expect(normalizeLocalizedPathname('/en/media')).toBe('/en/media');
  });
});

describe('detectLanguageFastPath', () => {
  it('returns user-selected language first', () => {
    localStorage.setItem('preferredLanguage', 'zh');
    localStorage.setItem('preferredLanguageSource', 'user');
    expect(detectLanguageFastPath()).toBe('zh');
  });

  it('falls back to browser language when user preference is absent', () => {
    localStorage.removeItem('preferredLanguage');
    localStorage.removeItem('preferredLanguageSource');
    const originalNavigator = globalThis.navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          ...originalNavigator,
          languages: ['vi-VN', 'en-US'],
          language: 'vi-VN',
        },
        configurable: true,
      });
      expect(detectLanguageFastPath()).toBe('vi');
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    }
  });
});
