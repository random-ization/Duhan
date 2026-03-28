import { describe, expect, it } from 'vitest';
import {
  buildReadingDiscoveryPath,
  normalizeReadingDifficultyFilter,
  resolvePictureBookLevelFilter,
} from '../../src/utils/readingDiscoveryFilters';

describe('readingDiscoveryFilters', () => {
  it('normalizes invalid difficulty filters to ALL', () => {
    expect(normalizeReadingDifficultyFilter('L2')).toBe('L2');
    expect(normalizeReadingDifficultyFilter('bad')).toBe('ALL');
    expect(normalizeReadingDifficultyFilter(null)).toBe('ALL');
  });

  it('falls back to the first available picture book level when none is requested', () => {
    expect(
      resolvePictureBookLevelFilter({
        requestedLevel: null,
        availableLevels: ['2단계', '3단계'],
      })
    ).toBe('2단계');
  });

  it('builds a discovery path that preserves non-default filters', () => {
    expect(
      buildReadingDiscoveryPath({
        pathname: '/reading',
        difficultyFilter: 'L2',
        pictureBookLevelFilter: '2단계',
      })
    ).toBe('/reading?difficulty=L2&level=2%EB%8B%A8%EA%B3%84');
  });
});
