import { describe, expect, it, vi } from 'vitest';

import { mergeRecentMaterial } from '../../src/contexts/LearningContext';

describe('mergeRecentMaterial', () => {
  it('returns the previous map when the material selection is unchanged', () => {
    const previous = {
      grammar: {
        instituteId: 'topik-grammar',
        level: 1,
        unit: 3,
        updatedAt: 123,
      },
    };

    const next = mergeRecentMaterial(previous, 'grammar', {
      instituteId: 'topik-grammar',
      level: 1,
      unit: 3,
    });

    expect(next).toBe(previous);
  });

  it('creates a new map when the material selection changes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T14:20:00+09:00'));

    const previous = {
      grammar: {
        instituteId: 'topik-grammar',
        level: 1,
        unit: 3,
        updatedAt: 123,
      },
    };

    const next = mergeRecentMaterial(previous, 'grammar', {
      instituteId: 'topik-grammar',
      level: 1,
      unit: 4,
    });

    expect(next).not.toBe(previous);
    expect(next.grammar).toMatchObject({
      instituteId: 'topik-grammar',
      level: 1,
      unit: 4,
    });
    expect(next.grammar?.updatedAt).toBe(new Date('2026-04-03T14:20:00+09:00').getTime());

    vi.useRealTimers();
  });
});
