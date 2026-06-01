import { lazy, Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { VOCAB, DAILY_TASK, qRef } from '../utils/convexRefs';
import type { NoArgs } from '../utils/convexRefs';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';
import { useLearningSelection } from '../contexts/LearningContext';
import { buildMobileCourseDefaultPath } from '../utils/learningFlow';
import { useCurrentLanguage } from '../hooks/useLocalizedNavigate';
import { localizeInternalPath } from '../utils/localizedRouting';
import type { LearnerStatsDto } from '../../convex/learningStats';
import type { DailyPhraseDto } from '../../convex/vocab/vocabTypes';

const DesktopCourseDetailPage = lazy(() => import('./desktop/DesktopCourseDetailPage'));

type CourseProgressDto = {
  courseId?: string;
  courseName?: string;
  lastUnitIndex?: number;
  completedUnits?: number[];
  totalUnits?: number;
  progressPercent?: number;
};

export default function CourseDetailPage() {
  const isMobile = useIsMobile();
  const { instituteId } = useParams<{ instituteId: string }>();
  const { user } = useAuth();
  const { selectedInstitute } = useLearningSelection();
  const currentLanguage = useCurrentLanguage();

  const activeCourseId = instituteId || selectedInstitute || user?.lastInstitute || null;

  // Hooks must be called before any early returns
  const courseProgress = useQuery(
    qRef<{ courseId: string }, CourseProgressDto>('progress:getCourseProgress'),
    activeCourseId ? { courseId: activeCourseId } : 'skip'
  );
  const reviewSummary = useQuery(VOCAB.getReviewSummary, user ? {} : 'skip');
  const dailyPhrase = useQuery(
    qRef<{ language?: string }, DailyPhraseDto | null>('vocab:getDailyPhrase'),
    { language: 'en' }
  );
  const stats = useQuery(qRef<NoArgs, LearnerStatsDto>('userStats:getStats'));
  const dailyTaskPlan = useQuery(
    DAILY_TASK.getTodayPlan,
    user ? { language: currentLanguage } : 'skip'
  );

  if (!instituteId) {
    if (activeCourseId) {
      return (
        <Navigate to={localizeInternalPath(`/course/${activeCourseId}`, currentLanguage)} replace />
      );
    }
    return <Navigate to={localizeInternalPath('/courses', currentLanguage)} replace />;
  }

  if (isMobile && instituteId) {
    return (
      <Navigate
        to={localizeInternalPath(buildMobileCourseDefaultPath(instituteId), currentLanguage)}
        replace
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground">
          Loading...
        </div>
      }
    >
      <DesktopCourseDetailPage
        courseProgress={courseProgress ?? null}
        reviewSummary={reviewSummary ?? null}
        dailyPhrase={dailyPhrase ?? null}
        stats={stats ?? null}
        dailyTaskPlan={dailyTaskPlan ?? null}
      />
    </Suspense>
  );
}
