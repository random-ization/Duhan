import { useMemo } from 'react';
import type { ExamAttempt } from '../../../types';

export const useExamStats = (examHistory: ExamAttempt[]) => {
  return useMemo(() => {
    const examsTaken = examHistory.length;
    const averageScore =
      examsTaken > 0
        ? Math.round(
            examHistory.reduce((sum, exam) => sum + (exam.score / exam.maxScore) * 100, 0) /
              examsTaken
          )
        : 0;
    return { examsTaken, averageScore };
  }, [examHistory]);
};
