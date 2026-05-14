import React, { Suspense, lazy } from 'react';
import type { Language } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { Loading } from '../components/common';

const LazyMobileProfilePage = lazy(() =>
  import('../components/mobile/MobileProfilePage').then(module => ({
    default: module.MobileProfilePage,
  }))
);

const LazyDesktopProfilePage = lazy(() =>
  import('./desktop/DesktopProfilePage').then(module => ({
    default: module.DesktopProfilePage,
  }))
);

interface ProfileProps {
  language: Language;
}

const ProfilePage: React.FC<ProfileProps> = () => {
  const isMobile = useIsMobile();

  return (
    <Suspense fallback={<Loading fullScreen />}>
      {isMobile ? <LazyMobileProfilePage /> : <LazyDesktopProfilePage />}
    </Suspense>
  );
};

export default ProfilePage;
