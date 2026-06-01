import React, { Suspense, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLearningSelection } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { ContentSkeleton } from '../components/common';
import { useDashboardSurface } from '../hooks/useDashboardSurface';

const LazyMobileDashboard = lazy(() =>
  import('../components/mobile/MobileDashboard').then(module => ({
    default: module.MobileDashboard,
  }))
);

const DesktopDashboardPage = lazy(() => import('./desktop/DesktopDashboardPage'));

function DashboardPage() {
  const { user, language } = useAuth();
  const { selectedInstitute, selectedLevel } = useLearningSelection();
  const { institutes } = useData();
  const isMobile = useIsMobile();
  const dashboardSurface = useDashboardSurface({
    language,
    selectedInstitute,
    selectedLevel,
    institutes,
    user,
  });

  if (isMobile) {
    return (
      <Suspense fallback={<ContentSkeleton />}>
        <LazyMobileDashboard {...dashboardSurface.mobileProps} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <DesktopDashboardPage />
    </Suspense>
  );
}

export default React.memo(DashboardPage);
