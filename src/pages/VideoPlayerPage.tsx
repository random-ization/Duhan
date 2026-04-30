import React, { Suspense } from 'react';
import { ContentSkeleton } from '../components/common';
import { useIsMobile } from '../hooks/useIsMobile';

const LazyMobileVideoPlayerPage = React.lazy(() =>
  import('../components/mobile/MobileVideoPlayerPage').then(module => ({
    default: module.MobileVideoPlayerPage,
  }))
);

const DesktopVideoPlayerPage = React.lazy(() => import('./desktop/DesktopVideoPlayerPage'));

const VideoPlayerPage: React.FC = () => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <Suspense fallback={<ContentSkeleton />}>
        <LazyMobileVideoPlayerPage />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <DesktopVideoPlayerPage />
    </Suspense>
  );
};

export default VideoPlayerPage;
