import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDashboardSurface } from '../../src/hooks/useDashboardSurface';

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
}));

describe('useDashboardSurface', () => {
  it('derives the mobile learning target and defers low-priority queries on first render', () => {
    const { result } = renderHook(() =>
      useDashboardSurface({
        language: 'en',
        selectedInstitute: 'course-1',
        selectedLevel: 1,
        institutes: [{ id: 'course-1', name: 'Course 1', levels: [1] }],
        user: {
          id: 'user-1',
          lastInstitute: 'course-1',
        },
      })
    );

    expect(result.current.mobileProps.learningEntryTarget).toEqual({
      instituteId: 'course-1',
      level: 1,
    });
    expect(result.current.desktopCourseProps.dailyPhrase).toBeNull();
    expect(result.current.desktopCourseProps.reviewSummary).toBeNull();
    expect(result.current.lowPriorityQueriesReady).toBe(false);
  });
});
