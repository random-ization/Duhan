import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildPictureBookReaderSessionStorageKey,
  buildReadingArticleSessionStorageKey,
  loadPictureBookReaderSessionState,
  loadReadingArticleSessionState,
  persistPictureBookReaderSessionState,
  persistReadingArticleSessionState,
} from '../../src/utils/readingSession';

describe('readingSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('persists and restores reading article session state', () => {
    const key = buildReadingArticleSessionStorageKey('article-1');
    persistReadingArticleSessionState(key, {
      scrollTop: 180,
      fontSize: 20,
      translationEnabled: true,
      panelTab: 'notes',
      activeWord: '경제',
      timestamp: 123,
    });

    expect(loadReadingArticleSessionState(key)).toEqual({
      scrollTop: 180,
      fontSize: 20,
      translationEnabled: true,
      panelTab: 'notes',
      activeWord: '경제',
      timestamp: 123,
    });
  });

  it('drops malformed reading article session state', () => {
    const key = buildReadingArticleSessionStorageKey('article-2');
    sessionStorage.setItem(key, '{"scrollTop":"bad"}');

    expect(loadReadingArticleSessionState(key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('persists and restores picture book reader state', () => {
    const key = buildPictureBookReaderSessionStorageKey('storybook');
    persistPictureBookReaderSessionState(key, {
      pageIndex: 2,
      activeSentenceIndex: 1,
      playbackRate: 1.2,
      autoFlip: false,
      timestamp: 456,
    });

    expect(loadPictureBookReaderSessionState(key)).toEqual({
      pageIndex: 2,
      activeSentenceIndex: 1,
      playbackRate: 1.2,
      autoFlip: false,
      timestamp: 456,
    });
  });

  it('drops malformed picture book reader state', () => {
    const key = buildPictureBookReaderSessionStorageKey('storybook');
    sessionStorage.setItem(key, '{"pageIndex":1,"playbackRate":9}');

    expect(loadPictureBookReaderSessionState(key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  });
});
