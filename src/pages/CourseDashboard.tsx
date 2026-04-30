import { lazy, Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
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
      <DesktopCourseDashboard />
    </Suspense>
  );
}
