import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExamStats } from '../../src/pages/profile/hooks/useExamStats';
import type { ExamAttempt } from '../../src/types';

describe('useExamStats', () => {
  it('returns 0 when no history', () => {
    const { result } = renderHook(() => useExamStats([]));
    expect(result.current.examsTaken).toBe(0);
    expect(result.current.averageScore).toBe(0);
  });

  it('computes examsTaken and averageScore', () => {
    const history: ExamAttempt[] = [
      {
        id: 'a',
        examId: 'e1',
        examTitle: 'Exam 1',
        score: 30,
        maxScore: 50,
        timestamp: Date.now(),
        userAnswers: {},
      },
      {
        id: 'b',
        examId: 'e2',
        examTitle: 'Exam 2',
        score: 40,
        maxScore: 40,
        timestamp: Date.now(),
        userAnswers: {},
      },
    ];

    const { result } = renderHook(() => useExamStats(history));
    expect(result.current.examsTaken).toBe(2);
    expect(result.current.averageScore).toBe(80);
  });
});
