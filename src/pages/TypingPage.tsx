import React, { Suspense, lazy } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileTypingPage } from '../components/mobile/MobileTypingPage';

const DesktopTypingPage = lazy(() => import('./desktop/DesktopTypingPage'));

const TypingPage: React.FC = () => {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileTypingPage />;
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-card text-muted-foreground">
          Loading...
        </div>
      }
    >
      <DesktopTypingPage />
    </Suspense>
  );
};

export default TypingPage;
