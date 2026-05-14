import React, { Suspense, lazy } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

const DesktopTypingPage = lazy(() => import('./desktop/DesktopTypingPage'));
const MobileTypingPage = lazy(() =>
  import('../components/mobile/MobileTypingPage').then(module => ({
    default: module.MobileTypingPage,
  }))
);

const TypingPage: React.FC = () => {
  const isMobile = useIsMobile();
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-card text-muted-foreground">
          Loading...
        </div>
      }
    >
      {isMobile ? <MobileTypingPage /> : <DesktopTypingPage />}
    </Suspense>
  );
};

export default TypingPage;
