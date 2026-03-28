import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildVocabBookPracticeSessionStorageKey,
  loadVocabBookDictationSessionState,
  loadVocabBookImmersiveSessionState,
  loadVocabBookListenSessionState,
  persistVocabBookDictationSessionState,
  persistVocabBookImmersiveSessionState,
  persistVocabBookListenSessionState,
} from '../../src/utils/vocabBookPracticeSession';

describe('vocab book practice session storage helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('builds stable session storage keys per practice mode', () => {
    expect(buildVocabBookPracticeSessionStorageKey('listen', 'category=DUE')).toBe(
      'vocab-book-listen-session:category=DUE'
    );
    expect(buildVocabBookPracticeSessionStorageKey('dictation', 'category=DUE')).toBe(
      'vocab-book-dictation-session:category=DUE'
    );
    expect(buildVocabBookPracticeSessionStorageKey('immersive', 'category=DUE')).toBe(
      'vocab-book-immersive-session:category=DUE'
    );
  });

  it('loads persisted listen, dictation, and immersive states', () => {
    const listenKey = buildVocabBookPracticeSessionStorageKey('listen', 'category=DUE');
    const dictationKey = buildVocabBookPracticeSessionStorageKey('dictation', 'category=DUE');
    const immersiveKey = buildVocabBookPracticeSessionStorageKey('immersive', 'category=DUE');

    persistVocabBookListenSessionState(listenKey, {
      index: 2,
      mode: 'ADVANCED',
      playMeaning: false,
      playExampleTranslation: true,
      repeatCount: 'INFINITE',
      speed: 1.2,
      timestamp: 1,
    });
    persistVocabBookDictationSessionState(dictationKey, {
      index: 1,
      started: true,
      mode: 'HEAR_MEANING',
      playCount: 3,
      gapSeconds: 4,
      autoNext: false,
      timestamp: 2,
    });
    persistVocabBookImmersiveSessionState(immersiveKey, {
      index: 5,
      mode: 'RECALL',
      revealed: true,
      timestamp: 3,
    });

    expect(loadVocabBookListenSessionState(listenKey)?.mode).toBe('ADVANCED');
    expect(loadVocabBookDictationSessionState(dictationKey)?.started).toBe(true);
    expect(loadVocabBookImmersiveSessionState(immersiveKey)?.revealed).toBe(true);
  });

  it('ignores malformed payloads', () => {
    const key = buildVocabBookPracticeSessionStorageKey('listen', 'category=DUE');
    sessionStorage.setItem(key, '{"bad":true}');

    expect(loadVocabBookListenSessionState(key)).toBeNull();
  });
});
