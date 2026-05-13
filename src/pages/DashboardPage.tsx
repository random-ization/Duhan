import React, { Suspense, lazy, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLearningSelection } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useIsMobile } from '../hooks/useIsMobile';
import { ContentSkeleton } from '../components/common';
import { useDashboardSurface } from '../hooks/useDashboardSurface';

const LazyMobileDashboard = lazy(() =>
  import('../components/mobile/MobileDashboard').then(module => ({
    default: module.MobileDashboard,
  }))
);

const DesktopDashboardPage = lazy(() => import('./desktop/DesktopDashboardPage'));
const DesktopCourseDashboard = lazy(() => import('./desktop/DesktopCourseDashboard'));

function DashboardPage() {
  const { user, language } = useAuth();
  const { selectedInstitute, selectedLevel } = useLearningSelection();
  const { institutes } = useData();
  const isMobile = useIsMobile();
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const dashboardSurface = useDashboardSurface({
    searchParams,
    language,
    selectedInstitute,
    selectedLevel,
    institutes,
    user,
  });

  useEffect(() => {
    if (!dashboardSurface.shouldRedirectToCourses) {
      return;
    }
    navigate('/courses', { replace: true });
  }, [dashboardSurface.shouldRedirectToCourses, navigate]);

  if (isMobile) {
    return (
      <Suspense fallback={<ContentSkeleton />}>
        <LazyMobileDashboard {...dashboardSurface.mobileProps} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      {dashboardSurface.enableDesktopKsoftDashboard ? (
        <DesktopCourseDashboard {...dashboardSurface.desktopCourseProps} />
      ) : (
        <DesktopDashboardPage />
      )}
    </Suspense>
  );
}

export default React.memo(DashboardPage);
