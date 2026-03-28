import { describe, expect, it } from 'vitest';
import {
  matchesVocabBookPracticeCategory,
  normalizeVocabBookPracticeCategory,
} from '../../src/utils/vocabBookPractice';

describe('vocab book practice helpers', () => {
  it('normalizes ALL categories from route params', () => {
    expect(normalizeVocabBookPracticeCategory('all')).toBe('ALL');
    expect(normalizeVocabBookPracticeCategory('MASTERED')).toBe('MASTERED');
    expect(normalizeVocabBookPracticeCategory('unknown')).toBe('DUE');
  });

  it('matches every item when category is ALL', () => {
    expect(matchesVocabBookPracticeCategory({ status: 'MASTERED', state: 3 }, 'ALL')).toBe(true);
    expect(matchesVocabBookPracticeCategory({ status: 'NEW', state: 0 }, 'ALL')).toBe(true);
    expect(matchesVocabBookPracticeCategory({ status: 'LEARNING', state: 2 }, 'ALL')).toBe(true);
  });

  it('matches due, unlearned, and mastered categories correctly', () => {
    expect(matchesVocabBookPracticeCategory({ status: 'MASTERED', state: 3 }, 'MASTERED')).toBe(
      true
    );
    expect(matchesVocabBookPracticeCategory({ status: 'NEW', state: 0 }, 'UNLEARNED')).toBe(true);
    expect(matchesVocabBookPracticeCategory({ status: 'LEARNING', state: 2 }, 'DUE')).toBe(true);
  });
});
