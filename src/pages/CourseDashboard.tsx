import { lazy, Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { VOCAB, qRef } from '../utils/convexRefs';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';
import { useLearningSelection } from '../contexts/LearningContext';
import { buildMobileCourseDefaultPath } from '../utils/learningFlow';

const DesktopCourseDashboard = lazy(() => import('./desktop/DesktopCourseDashboard'));

export default function CourseDashboard() {
  const isMobile = useIsMobile();
  const { instituteId } = useParams<{ instituteId: string }>();
  const { user } = useAuth();
  const { selectedInstitute } = useLearningSelection();

  const activeCourseId = instituteId || selectedInstitute || user?.lastInstitute || null;

  // Hooks must be called before any early returns
  const courseProgress = useQuery(qRef<any, any>('progress:getCourseProgress'), activeCourseId ? { courseId: activeCourseId } : 'skip');
  const reviewSummary = useQuery(VOCAB.getReviewSummary, user ? {} : 'skip');
  const dailyPhrase = useQuery(qRef<any, any>('vocab:getDailyPhrase'), { language: 'en' });
  const stats = useQuery(qRef<any, any>('userStats:getStats'));

  if (!instituteId) {
    if (activeCourseId) {
      return <Navigate to={`/course/${activeCourseId}`} replace />;
    }
    return <Navigate to="/courses" replace />;
  }

  if (isMobile && instituteId) {
    return <Navigate to={buildMobileCourseDefaultPath(instituteId)} replace />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground">Loading...</div>}>
      <DesktopCourseDashboard 
        courseProgress={courseProgress ?? null}
        reviewSummary={reviewSummary ?? null}
        dailyPhrase={dailyPhrase ?? null}
        stats={stats ?? null}
      />
    </Suspense>
  );
}
