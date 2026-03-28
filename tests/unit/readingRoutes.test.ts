import { describe, expect, it } from 'vitest';
import { buildPictureBookPath, buildReadingArticlePath } from '../../src/utils/readingRoutes';

describe('reading route builders', () => {
  it('builds a bare article path when there is no returnTo', () => {
    expect(buildReadingArticlePath('article-1')).toBe('/reading/article-1');
  });

  it('preserves returnTo when building reading article paths', () => {
    expect(buildReadingArticlePath('article-1', '/reading?difficulty=L2')).toBe(
      '/reading/article-1?returnTo=%2Freading%3Fdifficulty%3DL2'
    );
  });

  it('preserves returnTo when building picture book paths', () => {
    expect(buildPictureBookPath('story-book', '/reading?level=2')).toBe(
      '/reading/books/story-book?returnTo=%2Freading%3Flevel%3D2'
    );
  });
});
