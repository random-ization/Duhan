import React, { lazy, Suspense } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

const MobileCoursesOverview = lazy(() => import('../components/mobile/MobileCoursesOverview'));
const DesktopCoursesOverviewPage = lazy(() => import('./desktop/DesktopCoursesOverviewPage'));

const CoursesOverview: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      {isMobile ? <MobileCoursesOverview /> : <DesktopCoursesOverviewPage />}
    </Suspense>
  );
};

export default CoursesOverview;
