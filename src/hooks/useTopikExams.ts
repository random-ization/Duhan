import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { TOPIK } from '../utils/convexRefs';
import type { TopikExam } from '../types';

export const useTopikExams = (): TopikExam[] => {
  const topikExamsData = useQuery(TOPIK.getExams, {});

  return useMemo(() => {
    if (!topikExamsData) return [];
    return Array.isArray(topikExamsData) ? topikExamsData : (topikExamsData.page ?? []);
  }, [topikExamsData]);
};
