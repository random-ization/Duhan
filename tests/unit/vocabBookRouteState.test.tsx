import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useVocabBookRouteState } from '../../src/hooks/useVocabBookRouteState';

describe('useVocabBookRouteState', () => {
  it('derives the safe return target and saved-by-user mode from search params', () => {
    const { result } = renderHook(() =>
      useVocabBookRouteState({
        searchParams: new URLSearchParams('returnTo=%2Fdashboard&courseId=course-1&all=true'),
      })
    );

    expect(result.current.returnToPath).toBe('/dashboard');
    expect(result.current.courseId).toBe('course-1');
    expect(result.current.savedByUserOnly).toBe(false);
    expect(result.current.queryArgs).toEqual({
      includeMastered: true,
      search: undefined,
      savedByUserOnly: false,
      category: 'DUE',
      cursor: undefined,
      courseId: 'course-1',
      limit: 80,
    });
  });
});
