import { describe, it, expect } from 'vitest';
import {
  normalizeTranscriptWords,
  buildSegmentsFromWords,
  mergeShortSegments,
  extractSegmentsFromDeepgramResult,
  applyTranslationsToSegments,
} from '../../convex/ai/transcriptProcessors';

describe('normalizeTranscriptWords', () => {
  it('returns undefined for non-array input', () => {
    expect(normalizeTranscriptWords(null)).toBeUndefined();
    expect(normalizeTranscriptWords(undefined)).toBeUndefined();
    expect(normalizeTranscriptWords('string')).toBeUndefined();
    expect(normalizeTranscriptWords(42)).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    expect(normalizeTranscriptWords([])).toBeUndefined();
  });

  it('extracts valid words with word/start/end', () => {
    const input = [
      { word: 'hello', start: 0.5, end: 1.0 },
      { word: 'world', start: 1.1, end: 1.5 },
    ];
    const result = normalizeTranscriptWords(input);
    expect(result).toEqual([
      { word: 'hello', start: 0.5, end: 1.0 },
      { word: 'world', start: 1.1, end: 1.5 },
    ]);
  });

  it('prefers word over punctuated_word', () => {
    const input = [{ word: 'hello', punctuated_word: 'Hello,', start: 0, end: 1 }];
    expect(normalizeTranscriptWords(input)).toEqual([{ word: 'hello', start: 0, end: 1 }]);
  });

  it('falls back to punctuated_word when word is missing', () => {
    const input = [{ punctuated_word: 'Hello,', start: 0, end: 1 }];
    expect(normalizeTranscriptWords(input)).toEqual([{ word: 'Hello,', start: 0, end: 1 }]);
  });

  it('filters out items missing required fields', () => {
    const input = [
      { word: 'good', start: 0, end: 1 },
      { word: '', start: 2, end: 3 }, // empty word
      { word: 'bad', start: null, end: 5 }, // null start
      { word: 'also bad' }, // missing start/end
      null,
      42,
    ];
    expect(normalizeTranscriptWords(input)).toEqual([{ word: 'good', start: 0, end: 1 }]);
  });
});

describe('buildSegmentsFromWords', () => {
  it('returns empty array for empty input', () => {
    expect(buildSegmentsFromWords([])).toEqual([]);
  });

  it('builds a single segment for short input', () => {
    const words = [
      { word: 'hello', start: 0, end: 0.5 },
      { word: 'world.', start: 0.6, end: 1.0 },
    ];
    // duration = 1.0 - 0 = 1s, ends with punctuation but < 2s threshold
    // So it won't flush mid-loop; flush happens at the end
    const result = buildSegmentsFromWords(words);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].text).toContain('hello');
    expect(result[0].text).toContain('world');
  });

  it('splits segments at punctuation boundaries when duration >= 2', () => {
    const words = [
      { word: 'sentence', start: 0, end: 1 },
      { word: 'one.', start: 1.1, end: 2.5 },
      { word: 'sentence', start: 3, end: 3.5 },
      { word: 'two.', start: 3.6, end: 5 },
    ];
    const result = buildSegmentsFromWords(words);
    expect(result.length).toBe(2);
  });
});

describe('mergeShortSegments', () => {
  it('returns empty array for empty input', () => {
    expect(mergeShortSegments([])).toEqual([]);
  });

  it('passes through single segment', () => {
    const segments = [{ start: 0, end: 5, text: 'hello', translation: '' }];
    const result = mergeShortSegments(segments);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('hello');
  });

  it('merges segments shorter than 2 seconds', () => {
    const segments = [
      { start: 0, end: 0.5, text: 'a', translation: '' },
      { start: 0.6, end: 5, text: 'b', translation: '' },
    ];
    const result = mergeShortSegments(segments);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('a b');
  });

  it('keeps segments longer than 2 seconds separate', () => {
    const segments = [
      { start: 0, end: 5, text: 'first', translation: '' },
      { start: 5.1, end: 10, text: 'second', translation: '' },
    ];
    const result = mergeShortSegments(segments);
    expect(result).toHaveLength(2);
  });
});

describe('extractSegmentsFromDeepgramResult', () => {
  it('returns empty for null input', () => {
    expect(extractSegmentsFromDeepgramResult(null)).toEqual([]);
  });

  it('returns empty for empty object', () => {
    expect(extractSegmentsFromDeepgramResult({})).toEqual([]);
  });

  it('extracts from utterances', () => {
    const result = extractSegmentsFromDeepgramResult({
      utterances: [
        { start: 0, end: 5, transcript: 'Hello world' },
        { start: 6, end: 10, transcript: 'How are you' },
      ],
    });
    expect(result.length).toBe(2);
    expect(result[0].text).toBe('Hello world');
    expect(result[1].text).toBe('How are you');
  });

  it('extracts from paragraphs.paragraphs.sentences', () => {
    const result = extractSegmentsFromDeepgramResult({
      paragraphs: {
        paragraphs: [
          {
            sentences: [
              { start: 0, end: 5, text: 'First sentence' },
              { start: 6, end: 10, text: 'Second sentence' },
            ],
          },
        ],
      },
    });
    expect(result.length).toBe(2);
    expect(result[0].text).toBe('First sentence');
  });

  it('falls back to transcript-only', () => {
    const result = extractSegmentsFromDeepgramResult({
      transcript: '  Just a transcript  ',
    });
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Just a transcript');
  });

  it('filters empty text segments', () => {
    const result = extractSegmentsFromDeepgramResult({
      utterances: [
        { start: 0, end: 5, transcript: 'Valid' },
        { start: 6, end: 10, transcript: '   ' },
        { start: 11, end: 15, transcript: '' },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Valid');
  });
});

describe('applyTranslationsToSegments', () => {
  it('maps translations 1:1 when lengths match', () => {
    const segments = [
      { start: 0, end: 5, text: '안녕하세요', translation: '' },
      { start: 6, end: 10, text: '감사합니다', translation: '' },
    ];
    const translations = ['Hello', 'Thank you'];
    const result = applyTranslationsToSegments(segments, translations);
    expect(result[0].translation).toBe('Hello');
    expect(result[1].translation).toBe('Thank you');
  });

  it('handles fewer translations than segments', () => {
    const segments = [
      { start: 0, end: 5, text: 'a', translation: '' },
      { start: 6, end: 10, text: 'b', translation: '' },
      { start: 11, end: 15, text: 'c', translation: '' },
    ];
    const translations = ['X'];
    const result = applyTranslationsToSegments(segments, translations);
    expect(result[0].translation).toBe('X');
    expect(result[1].translation).toBe('');
    expect(result[2].translation).toBe('');
  });

  it('returns original segments for empty translations', () => {
    const segments = [{ start: 0, end: 5, text: 'a', translation: 'old' }];
    const result = applyTranslationsToSegments(segments, []);
    expect(result[0].translation).toBe('old');
  });
});
