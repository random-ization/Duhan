import { Suspense, lazy } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { ContentSkeleton } from '../components/common';

const LazyMobileMediaPage = lazy(() =>
  import('../components/mobile/MobileMediaPage').then(module => ({
    default: module.MobileMediaPage,
  }))
);

const DesktopMediaHubPage = lazy(() => import('./desktop/DesktopMediaHubPage'));

export default function MediaHubPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Suspense fallback={<ContentSkeleton />}>
        <LazyMobileMediaPage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <DesktopMediaHubPage />
    </Suspense>
  );
}
