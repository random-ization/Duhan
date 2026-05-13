import React, { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useIsMobile } from '../hooks/useIsMobile';
import { ContentSkeleton } from '../components/common';
import { getLabels } from '../utils/i18n';
import { useAuth } from '../contexts/AuthContext';
import { useVocabBookRouteState } from '../hooks/useVocabBookRouteState';

export type ExportMode = 'A4_DICTATION' | 'LANG_LIST' | 'KO_LIST';
export type VocabBookCategory = 'UNLEARNED' | 'DUE' | 'MASTERED';
export type LabelsBundle = ReturnType<typeof getLabels>;

const LazyMobileVocabDashboard = lazy(() =>
  import('../components/mobile/MobileVocabDashboard').then(module => ({
    default: module.MobileVocabDashboard,
  }))
);

const DesktopVocabHub = lazy(() =>
  import('./desktop/DesktopVocabHub').then(module => ({
    default: module.default,
  }))
);

const VocabBookPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const routeState = useVocabBookRouteState({ searchParams });

  if (isMobile && !routeState.isMobileListMode) {
    return (
      <Suspense fallback={<ContentSkeleton />}>
        <LazyMobileVocabDashboard
          language={language}
          onOpenSavedWords={() => navigate(routeState.listPath)}
          onOpenMistakes={() => navigate(routeState.mistakesPath)}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <DesktopVocabHub />
    </Suspense>
  );
};

export default VocabBookPage;
