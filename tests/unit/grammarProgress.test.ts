import { describe, expect, it } from 'vitest';

import {
  getNextGrammarSelection,
  isGrammarCompleted,
  normalizeGrammarProgressStatus,
  sortGrammarProgressItems,
} from '../../src/utils/grammarProgress';
import type { GrammarPointData } from '../../src/types';

const makeGrammarPoint = (
  overrides: Partial<GrammarPointData> & Pick<GrammarPointData, 'id' | 'title'>
): GrammarPointData => ({
  id: overrides.id,
  title: overrides.title,
  summary: overrides.summary ?? '',
  type: overrides.type ?? 'ENDING',
  explanation: overrides.explanation ?? '',
  examples: overrides.examples ?? [],
  ...overrides,
});

describe('grammarProgress', () => {
  it('normalizes unknown status values to NEW', () => {
    expect(normalizeGrammarProgressStatus('MASTERED')).toBe('MASTERED');
    expect(normalizeGrammarProgressStatus('NOT_STARTED')).toBe('NEW');
    expect(normalizeGrammarProgressStatus(null)).toBe('NEW');
    expect(isGrammarCompleted('MASTERED')).toBe(true);
    expect(isGrammarCompleted('LEARNING')).toBe(false);
  });

  it('returns the first non-mastered grammar in unit order', () => {
    const selection = getNextGrammarSelection({
      grammarPoints: [
        makeGrammarPoint({ id: 'g-3', title: 'Third', unitId: 2, status: 'LEARNING' }),
        makeGrammarPoint({ id: 'g-1', title: 'First', unitId: 1, status: 'MASTERED' }),
        makeGrammarPoint({ id: 'g-2', title: 'Second', unitId: 1, status: 'NEW' }),
      ],
    });

    expect(selection?.id).toBe('g-2');
  });

  it('falls back to the last viewed grammar when all grammar points are mastered', () => {
    const grammarPoints = [
      makeGrammarPoint({ id: 'g-1', title: 'First', unitId: 1, status: 'MASTERED' }),
      makeGrammarPoint({ id: 'g-2', title: 'Second', unitId: 2, status: 'MASTERED' }),
    ];

    expect(
      getNextGrammarSelection({
        grammarPoints,
        lastGrammarId: 'g-2',
      })?.id
    ).toBe('g-2');
  });

  it('falls back to the first grammar when the saved grammar no longer exists', () => {
    const grammarPoints = [
      makeGrammarPoint({ id: 'g-2', title: 'Second', unitId: 2, status: 'MASTERED' }),
      makeGrammarPoint({ id: 'g-1', title: 'First', unitId: 1, status: 'MASTERED' }),
    ];

    expect(sortGrammarProgressItems(grammarPoints).map(point => point.id)).toEqual(['g-1', 'g-2']);
    expect(
      getNextGrammarSelection({
        grammarPoints,
        lastGrammarId: 'missing-grammar',
      })?.id
    ).toBe('g-1');
  });
});
