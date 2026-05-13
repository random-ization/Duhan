import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import type { Institute } from '../types';
import { resolveLearningEntryTarget } from '../utils/learningFlow';
import { VOCAB, qRef } from '../utils/convexRefs';
import type { LearnerStatsDto } from '../../convex/learningStats';

type DashboardUserLike = {
  id?: string | null;
  lastInstitute?: string | null;
} | null;

type DashboardSurfaceArgs = {
  searchParams: URLSearchParams;
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
  };
  enableDesktopKsoftDashboard: boolean;
  lowPriorityQueriesReady: boolean;
  mobileProps: {
    learningEntryTarget: { instituteId: string; level: number } | null;
    institutes: Institute[] | undefined;
    institutesLoading: boolean;
  };
  shouldRedirectToCourses: boolean;
  view: 'learn' | 'practice';
};

export function useDashboardSurface({
  searchParams,
  language,
  selectedInstitute,
  selectedLevel,
  institutes,
  user,
}: DashboardSurfaceArgs): DashboardSurfaceResult {
  const [lowPriorityQueriesReady, setLowPriorityQueriesReady] = useState(
    () => typeof globalThis.window === 'undefined'
  );

  const view = searchParams.get('view') === 'practice' ? 'practice' : 'learn';
  const shouldRedirectToCourses = view === 'practice';
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
  const reviewSummary = useQuery(VOCAB.getReviewSummary, user && lowPriorityQueriesReady ? {} : 'skip');
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
    view === 'practice' || !user || !selectedInstitute ? 'skip' : { courseId: selectedInstitute }
  );
  const stats = useQuery(qRef<Record<string, never>, LearnerStatsDto>('userStats:getStats'));

  return {
    desktopCourseProps: {
      courseProgress: courseProgress ?? null,
      reviewSummary: reviewSummary ?? null,
      dailyPhrase: dailyPhrase ?? null,
      stats: stats ?? null,
    },
    enableDesktopKsoftDashboard: import.meta.env.VITE_ENABLE_DESKTOP_KSOFT_DASHBOARD === '1',
    lowPriorityQueriesReady,
    mobileProps: {
      learningEntryTarget,
      institutes,
      institutesLoading: institutes === undefined,
    },
    shouldRedirectToCourses,
    view,
  };
}
