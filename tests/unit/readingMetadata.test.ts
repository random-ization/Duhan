import { describe, expect, it } from 'vitest';
import {
  formatReadingPublishedDate,
  formatReadingRelativeTime,
  getReadingSourceLabel,
} from '../../src/utils/readingMetadata';

describe('readingMetadata', () => {
  it('falls back when the source key is blank', () => {
    expect(getReadingSourceLabel('', 'Unknown source')).toBe('Unknown source');
    expect(getReadingSourceLabel('khan', 'Unknown source')).toBe('경향신문');
  });

  it('falls back when the published date is invalid', () => {
    expect(formatReadingPublishedDate(Number.NaN, 'en-US', 'Date unavailable')).toBe(
      'Date unavailable'
    );
  });

  it('falls back when relative time receives invalid input', () => {
    expect(formatReadingRelativeTime(undefined, 'en-US', 'Recently updated')).toBe(
      'Recently updated'
    );
  });
});
