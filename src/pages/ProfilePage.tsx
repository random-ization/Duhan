import React, { Suspense, lazy, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import type { Language } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { getPathWithoutLang } from '../utils/pathname';
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useLocalizedNavigate();

  const desktopCanonicalPath = useMemo(() => {
    if (isMobile) return null;

    const pathWithoutLang = getPathWithoutLang(location.pathname);
    const nextParams = new URLSearchParams(searchParams);
    const hadLegacySearchState = nextParams.has('tab') || nextParams.has('section');

    nextParams.delete('tab');
    nextParams.delete('section');

    if (pathWithoutLang === '/profile' && !hadLegacySearchState) {
      return null;
    }

    const nextQuery = nextParams.toString();
    return nextQuery ? `/profile?${nextQuery}` : '/profile';
  }, [isMobile, location.pathname, searchParams]);

  useEffect(() => {
    if (!desktopCanonicalPath) return;
    navigate(desktopCanonicalPath, { replace: true });
  }, [desktopCanonicalPath, navigate]);

  return (
    <Suspense fallback={<Loading fullScreen />}>
      {isMobile ? <LazyMobileProfilePage /> : <LazyDesktopProfilePage />}
    </Suspense>
  );
};

export default ProfilePage;
