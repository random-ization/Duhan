import { beforeEach, describe, expect, it } from 'vitest';
import type { LearningSessionSnapshot } from '../../src/features/vocab/components/VocabQuiz';
import {
  buildVocabBookSpellingSessionStorageKey,
  clearLearningSessionSnapshot,
  loadLearningSessionSnapshot,
  persistLearningSessionSnapshot,
} from '../../src/utils/vocabLearningSession';

const snapshot: LearningSessionSnapshot = {
  wordIds: ['word-1'],
  questionIndex: 1,
  wrongWordIds: [],
  correctCount: 1,
  totalAnswered: 1,
  currentBatchNum: 1,
  settings: {
    multipleChoice: false,
    writingMode: true,
    mcDirection: 'KR_TO_NATIVE',
    writingDirection: 'NATIVE_TO_KR',
    autoTTS: true,
    soundEffects: false,
  },
  timestamp: 123,
};

describe('vocab learning session storage helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('builds a stable spelling session key from search params', () => {
    expect(buildVocabBookSpellingSessionStorageKey('category=DUE&q=test')).toBe(
      'vocab-book-spelling-session:category=DUE&q=test'
    );
  });

  it('loads persisted learning snapshots', () => {
    const key = buildVocabBookSpellingSessionStorageKey('category=DUE');
    persistLearningSessionSnapshot(key, snapshot);

    expect(loadLearningSessionSnapshot(key)).toEqual(snapshot);
  });

  it('drops malformed stored payloads instead of restoring them', () => {
    const key = buildVocabBookSpellingSessionStorageKey('category=DUE');
    sessionStorage.setItem(key, '{"bad":true}');

    expect(loadLearningSessionSnapshot(key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('clears persisted snapshots explicitly', () => {
    const key = buildVocabBookSpellingSessionStorageKey('category=DUE');
    persistLearningSessionSnapshot(key, snapshot);
    clearLearningSessionSnapshot(key);

    expect(sessionStorage.getItem(key)).toBeNull();
  });
});
