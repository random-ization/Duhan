import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearTranscriptLocalCache,
  loadTranscriptFromLocalCache,
  saveTranscriptToLocalCache,
} from '../../src/pages/PodcastPlayerPage';

describe('podcast player transcript cache helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads cached transcript segments for the matching language', () => {
    saveTranscriptToLocalCache('episode-1', 'zh', [
      { start: 0, end: 1, text: '안녕하세요', translation: '你好' },
    ]);

    expect(loadTranscriptFromLocalCache('episode-1', 'zh')).toEqual([
      { start: 0, end: 1, text: '안녕하세요', translation: '你好' },
    ]);
  });

  it('ignores cached transcripts saved under a different language', () => {
    window.localStorage.setItem(
      'transcript_episode-1_zh',
      JSON.stringify({
        language: 'en',
        segments: [{ start: 0, end: 1, text: '안녕하세요', translation: 'Hello' }],
      })
    );

    expect(loadTranscriptFromLocalCache('episode-1', 'zh')).toBeNull();
  });

  it('clears cached transcripts without throwing when storage is blocked', () => {
    const originalLocalStorage = window.localStorage;

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        removeItem: vi.fn(() => {
          throw new DOMException('Blocked', 'SecurityError');
        }),
      },
    });

    expect(() => clearTranscriptLocalCache('episode-1', ['zh', 'en'])).not.toThrow();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
  });
});
