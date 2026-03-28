import { describe, expect, it } from 'vitest';
import { formatSafeDateLabel } from '../../src/utils/dateLabel';

describe('formatSafeDateLabel', () => {
  it('returns the fallback when the timestamp is invalid', () => {
    expect(formatSafeDateLabel(Number.NaN, 'en-US', 'Recently')).toBe('Recently');
    expect(formatSafeDateLabel('   ', 'en-US', 'Recently')).toBe('Recently');
  });

  it('formats valid dates with locale options', () => {
    expect(
      formatSafeDateLabel(Date.UTC(2026, 2, 29), 'en-US', 'Recently', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })
    ).toBe('Mar 29');
  });
});
