import { lazy, Suspense } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

const DesktopLeaderboardPage = lazy(() => import('./desktop/DesktopLeaderboardPage'));
const MobileLeaderboardPage = lazy(() => import('../components/mobile/MobileLeaderboardPage'));

export default function LeaderboardPage() {
  const isMobile = useIsMobile();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          Loading...
        </div>
      }
    >
      {isMobile ? <MobileLeaderboardPage /> : <DesktopLeaderboardPage />}
    </Suspense>
  );
}
