import { describe, expect, it } from 'vitest';
import {
  buildFallbackSentenceTokens,
  normalizeSentenceText,
} from '../../convex/sentenceExplainer/shared';

describe('buildFallbackSentenceTokens', () => {
  it('returns useful word tokens with offsets for normalized Korean text', () => {
    const input = '  저는   오늘 한국어를 공부해요. ';
    const normalized = normalizeSentenceText(input);
    const tokens = buildFallbackSentenceTokens(input);

    expect(normalized).toBe('저는 오늘 한국어를 공부해요.');
    expect(tokens.map(token => token.surface)).toEqual([
      '저는',
      '오늘',
      '한국어를',
      '공부해요',
    ]);
    expect(tokens.map(token => [token.start, token.end])).toEqual([
      [0, 2],
      [3, 5],
      [6, 10],
      [11, 15],
    ]);
    expect(tokens.every(token => token.lemma === token.surface)).toBe(true);
  });

  it('skips punctuation while retaining Latin letters and numbers', () => {
    expect(buildFallbackSentenceTokens('TOPIK Ⅱ: 3급!').map(token => token.surface)).toEqual([
      'TOPIK',
      'Ⅱ',
      '3급',
    ]);
  });
});
