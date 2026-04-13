import { Suspense, lazy, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';

import UpgradePrompt from './components/UpgradePrompt';
import { useAuth } from './contexts/AuthContext';
import { useLearningSelection } from './contexts/LearningContext';
import { Loading } from './components/common/Loading';
import ErrorBoundary from './components/common/ErrorBoundary';
import { PostHogTracker } from './components/common/PostHogTracker';
import { useUpdateLearningProgress } from './hooks/useUpdateLearningProgress';
import { GlobalModalProvider } from './contexts/GlobalModalContext';
import { finalizeStaleChunkRecovery } from './utils/staleChunkRecovery';

const AppRoutes = lazy(() => import('./routes').then(m => ({ default: m.AppRoutes })));

// Create a client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for 5 min, no refetch
      gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache
      refetchOnWindowFocus: false, // Disable refetch on tab focus
      retry: 1, // Only retry once on failure
    },
  },
});

function App() {
  const { t } = useTranslation();
  const { user, language, showUpgradePrompt, setShowUpgradePrompt } = useAuth();
  const updateLearningProgress = useUpdateLearningProgress();
  const { selectedInstitute, selectedLevel } = useLearningSelection();

  // Track learning progress when user changes institute/level
  useEffect(() => {
    finalizeStaleChunkRecovery();
  }, []);

  useEffect(() => {
    if (user && selectedInstitute && Number.isFinite(selectedLevel)) {
      // Prevent feedback loop/concurrent updates
      if (user.lastInstitute === selectedInstitute && user.lastLevel === selectedLevel) {
        return;
      }
      updateLearningProgress(selectedInstitute, selectedLevel);
    }
  }, [selectedInstitute, selectedLevel, user, updateLearningProgress]);

  // Warm likely next-route chunks after login-area entry.
  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;

    const navWithConnection = globalThis.navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
      deviceMemory?: number;
    };
    const connection = navWithConnection.connection;
    const pathname = globalThis.window.location.pathname;
    const inLearningArea =
      /^\/(?:en|zh|vi|mn)\/(?:dashboard|course|courses|practice|review|media|reading|vocab-book|topik|notebook|typing|dictionary)/.test(
        pathname
      );

    // Keep the public landing/auth experience light; prefetch only after entering learning pages.
    if (!inLearningArea) return;
    if (connection?.saveData) return;
    const effectiveType = connection?.effectiveType || '4g';
    if (effectiveType.includes('2g') || effectiveType === 'slow-2g') return;

    const deviceMemory = navWithConnection.deviceMemory ?? 4;
    const canPrefetchSecondary =
      (effectiveType === '4g' || effectiveType === '5g') && deviceMemory >= 4;
    const canPrefetchHeavy = effectiveType === '4g' && deviceMemory >= 8;

    const prefetchCoreRoutes = () => {
      void import('./pages/CoursesOverview');
      void import('./pages/CourseDashboard');
      void import('./pages/ModulePage');
      void import('./pages/PracticeHubPage');
      void import('./pages/MediaHubPage');
    };

    const prefetchSecondaryRoutes = () => {
      if (!canPrefetchSecondary) return;
      void import('./pages/VocabModulePage');
      void import('./pages/TopikPage');
      void import('./pages/ReadingDiscoveryPage');
    };

    const prefetchHeavyRoutes = () => {
      if (!canPrefetchHeavy) return;
      void import('./pages/NotebookPage');
    };

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleWindow = globalThis.window as IdleWindow;

    let timeoutId: number | null = null;
    let timeoutIdSecondary: number | null = null;
    let timeoutIdHeavy: number | null = null;
    let idleId: number | null = null;
    let idleIdSecondary: number | null = null;

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(prefetchCoreRoutes, { timeout: 1500 });
      idleIdSecondary = idleWindow.requestIdleCallback(prefetchSecondaryRoutes, { timeout: 4000 });
      timeoutIdHeavy = globalThis.window.setTimeout(prefetchHeavyRoutes, 7000);
    } else {
      timeoutId = globalThis.window.setTimeout(prefetchCoreRoutes, 1200);
      timeoutIdSecondary = globalThis.window.setTimeout(prefetchSecondaryRoutes, 3200);
      timeoutIdHeavy = globalThis.window.setTimeout(prefetchHeavyRoutes, 7000);
    }

    return () => {
      if (idleId !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (idleIdSecondary !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleIdSecondary);
      }
      if (timeoutId !== null) {
        globalThis.window.clearTimeout(timeoutId);
      }
      if (timeoutIdSecondary !== null) {
        globalThis.window.clearTimeout(timeoutIdSecondary);
      }
      if (timeoutIdHeavy !== null) {
        globalThis.window.clearTimeout(timeoutIdHeavy);
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary moduleName={t('common.appName', 'DuHan')}>
        <GlobalModalProvider>
          <PostHogTracker />
          <Suspense fallback={<Loading fullScreen size="lg" text={t('loading')} />}>
            <AppRoutes />
          </Suspense>

          <UpgradePrompt
            isOpen={showUpgradePrompt}
            onClose={() => setShowUpgradePrompt(false)}
            language={language}
          />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 2800,
              className:
                'rounded-xl border border-border bg-card text-foreground font-bold shadow-pop-sm',
            }}
          />
        </GlobalModalProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
