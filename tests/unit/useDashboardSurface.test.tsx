import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDashboardSurface } from '../../src/hooks/useDashboardSurface';

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => undefined),
}));

describe('useDashboardSurface', () => {
  it('derives the dashboard view and defers low-priority queries on first render', () => {
    const { result } = renderHook(() =>
      useDashboardSurface({
        searchParams: new URLSearchParams('view=practice'),
        language: 'en',
        selectedInstitute: 'course-1',
        selectedLevel: 1,
        institutes: [],
        user: {
          id: 'user-1',
          lastInstitute: 'course-1',
        },
      })
    );

    expect(result.current.view).toBe('practice');
    expect(result.current.shouldRedirectToCourses).toBe(true);
    expect(result.current.lowPriorityQueriesReady).toBe(false);
  });
});
