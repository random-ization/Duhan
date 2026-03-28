import { describe, expect, it } from 'vitest';
import { buildVocabBookModePath, buildVocabBookPath } from '../../src/utils/vocabBookRoutes';

describe('vocab book route builders', () => {
  it('builds a bare vocab book path when there is no query', () => {
    expect(buildVocabBookPath()).toBe('/vocab-book');
  });

  it('preserves existing filters when building the vocab book return path', () => {
    expect(buildVocabBookPath('category=DUE&q=hello&selected=1,2')).toBe(
      '/vocab-book?category=DUE&q=hello&selected=1,2'
    );
  });

  it('builds vocab book mode paths with the current query string', () => {
    expect(buildVocabBookModePath('listen', 'category=MASTERED&q=test')).toBe(
      '/vocab-book/listen?category=MASTERED&q=test'
    );
  });
});
