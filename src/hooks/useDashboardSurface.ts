import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import type { Institute } from '../types';
import { resolveLearningEntryTarget } from '../utils/learningFlow';
import { VOCAB, DAILY_TASK, qRef } from '../utils/convexRefs';
import type { LearnerStatsDto } from '../../convex/learningStats';
import type { DailyTaskPlanDto } from '../../convex/dailyTask/shared';

type DashboardUserLike = {
  id?: string | null;
  lastInstitute?: string | null;
} | null;

type DashboardSurfaceArgs = {
  language: string | undefined;
  selectedInstitute?: string | null;
  selectedLevel?: number | null;
  institutes: Institute[] | undefined;
  user: DashboardUserLike;
};

type DashboardSurfaceResult = {
  desktopCourseProps: {
    courseProgress: {
      completedUnits: number[];
      totalUnits: number;
      progressPercent: number;
      lastUnitIndex?: number;
    } | null;
    reviewSummary: {
      dueNow?: number;
      dueSoon?: number;
    } | null;
    dailyPhrase: {
      id: string;
      korean: string;
      romanization: string;
      translation: string;
    } | null;
    stats: LearnerStatsDto | null;
    dailyTaskPlan: DailyTaskPlanDto | null;
  };
  lowPriorityQueriesReady: boolean;
  mobileProps: {
    learningEntryTarget: { instituteId: string; level: number } | null;
    institutes: Institute[] | undefined;
    institutesLoading: boolean;
  };
};

export function useDashboardSurface({
  language,
  selectedInstitute,
  selectedLevel,
  institutes,
  user,
}: DashboardSurfaceArgs): DashboardSurfaceResult {
  const [lowPriorityQueriesReady, setLowPriorityQueriesReady] = useState(
    () => typeof globalThis.window === 'undefined'
  );

  const currentLanguage = language || 'en';

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') {
      return;
    }

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const idleWindow = globalThis.window as IdleWindow;
    let timerId: number | null = null;
    let idleId: number | null = null;

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(() => setLowPriorityQueriesReady(true), {
        timeout: 1200,
      });
    } else {
      timerId = globalThis.window.setTimeout(() => setLowPriorityQueriesReady(true), 500);
    }

    return () => {
      if (idleId !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        globalThis.window.clearTimeout(timerId);
      }
    };
  }, []);

  const learningEntryTarget = useMemo(
    () =>
      resolveLearningEntryTarget({
        institutes,
        selectedInstitute,
        selectedLevel,
        userLastInstitute: user?.lastInstitute,
      }),
    [institutes, selectedInstitute, selectedLevel, user?.lastInstitute]
  );

  const dailyPhrase = useQuery(
    qRef<
      { language: string },
      { id: string; korean: string; romanization: string; translation: string } | null
    >('vocab:getDailyPhrase'),
    lowPriorityQueriesReady ? { language: currentLanguage } : 'skip'
  );
  const reviewSummary = useQuery(
    VOCAB.getReviewSummary,
    user && lowPriorityQueriesReady ? {} : 'skip'
  );
  const courseProgress = useQuery(
    qRef<
      { courseId: string },
      {
        completedUnits: number[];
        totalUnits: number;
        progressPercent: number;
        lastUnitIndex?: number;
      } | null
    >('progress:getCourseProgress'),
    !user || !selectedInstitute ? 'skip' : { courseId: selectedInstitute }
  );
  const stats = useQuery(qRef<Record<string, never>, LearnerStatsDto>('userStats:getStats'));
  const dailyTaskPlan = useQuery(
    DAILY_TASK.getTodayPlan,
    user ? { language: currentLanguage } : 'skip'
  );
  const generateTodayPlan = useMutation(DAILY_TASK.generateTodayPlan);

  useEffect(() => {
    if (user && dailyTaskPlan && !dailyTaskPlan.id && lowPriorityQueriesReady) {
      void generateTodayPlan({ language: currentLanguage });
    }
  }, [user, dailyTaskPlan, currentLanguage, generateTodayPlan, lowPriorityQueriesReady]);

  return {
    desktopCourseProps: {
      courseProgress: courseProgress ?? null,
      reviewSummary: reviewSummary ?? null,
      dailyPhrase: dailyPhrase ?? null,
      stats: stats ?? null,
      dailyTaskPlan: dailyTaskPlan ?? null,
    },
    lowPriorityQueriesReady,
    mobileProps: {
      learningEntryTarget,
      institutes,
      institutesLoading: institutes === undefined,
    },
  };
}
