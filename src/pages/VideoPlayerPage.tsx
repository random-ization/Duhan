import React, { Suspense } from 'react';
import { ContentSkeleton } from '../components/common';

const LazyVideoLearningPlayer = React.lazy(() =>
  import('../components/mobile/MobileVideoPlayerPage').then(module => ({
    default: module.MobileVideoPlayerPage,
  }))
);

const VideoPlayerPage: React.FC = () => {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <LazyVideoLearningPlayer />
    </Suspense>
  );
};

export default VideoPlayerPage;
