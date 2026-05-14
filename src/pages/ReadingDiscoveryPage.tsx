import React, { Suspense, lazy } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { ContentSkeleton } from '../components/common';

const LazyMobileMediaPage = lazy(() =>
  import('../components/mobile/MobileMediaPage').then(module => ({
    default: module.MobileMediaPage,
  }))
);
const LazyDesktopReadingDiscoveryPage = lazy(() => import('./desktop/DesktopReadingDiscoveryPage'));

export default function ReadingDiscoveryPage() {
  const isMobile = useIsMobile();
  return (
    <Suspense fallback={<ContentSkeleton />}>
      {isMobile ? <LazyMobileMediaPage /> : <LazyDesktopReadingDiscoveryPage />}
    </Suspense>
  );
}
