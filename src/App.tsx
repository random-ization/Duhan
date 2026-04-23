import { Suspense, lazy, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';

import { useAuth } from './contexts/AuthContext';
import { Loading } from './components/common/Loading';
import ErrorBoundary from './components/common/ErrorBoundary';
import { PostHogTracker } from './components/common/PostHogTracker';
// `useUpdateLearningProgress` pulls `useMutation` from `convex/react`, which
// used to drag the full Convex SDK into the entry chunk. The side-effect
// that consumed it has moved into `<LearningProgressTracker />`, mounted
// inside the lazy `AuthedAppProviders` subtree so pre-auth pages no longer
// import any Convex code.
import { GlobalModalProvider } from './contexts/GlobalModalContext';
import { finalizeStaleChunkRecovery } from './utils/staleChunkRecovery';

const AppRoutes = lazy(() => import('./routes').then(m => ({ default: m.AppRoutes })));
const LazyUpgradePrompt = lazy(() => import('./components/UpgradePrompt'));

function App() {
  const { t } = useTranslation();
  const { language, showUpgradePrompt, setShowUpgradePrompt } = useAuth();

  useEffect(() => {
    finalizeStaleChunkRecovery();
  }, []);

  // Learning-progress sync used to live here, but it required `useMutation`
  // from `convex/react`, which forced the Convex SDK into the entry chunk.
  // It has moved to `<LearningProgressTracker />`, rendered inside the
  // lazy `AuthedAppProviders` subtree.

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
    <ErrorBoundary moduleName={t('common.appName', 'DuHan')}>
      <GlobalModalProvider>
        <PostHogTracker />
        <Suspense fallback={<Loading fullScreen size="lg" text={t('loading')} />}>
          <AppRoutes />
        </Suspense>

        {showUpgradePrompt ? (
          <Suspense fallback={null}>
            <LazyUpgradePrompt
              isOpen={showUpgradePrompt}
              onClose={() => setShowUpgradePrompt(false)}
              language={language}
            />
          </Suspense>
        ) : null}
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
  );
}

export default App;
