import { Suspense, lazy, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';

import UpgradePrompt from './components/UpgradePrompt';
import { useAuth } from './contexts/AuthContext';
import { useLearningSelection } from './contexts/LearningContext';
import { Loading } from './components/common/Loading';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useUserActions } from './hooks/useUserActions';
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
  const { updateLearningProgress } = useUserActions();
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

  // Warm critical route chunks on idle to reduce first navigation latency on mobile/PWA.
  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;

    const navWithConnection = globalThis.navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    const connection = navWithConnection.connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType?.includes('2g')) return;

    const prefetchRoutes = () => {
      void import('./pages/CoursesOverview');
      void import('./pages/CourseDashboard');
      void import('./pages/ModulePage');
      void import('./pages/VocabModulePage');
      void import('./pages/TopikPage');
      void import('./pages/NotebookPage');
      void import('./pages/PracticeHubPage');
      void import('./pages/MediaHubPage');
    };

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleWindow = globalThis.window as IdleWindow;

    let timeoutId: number | null = null;
    let idleId: number | null = null;

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(prefetchRoutes, { timeout: 2000 });
    } else {
      timeoutId = globalThis.window.setTimeout(prefetchRoutes, 1200);
    }

    return () => {
      if (idleId !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        globalThis.window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary moduleName={t('common.appName', 'DuHan')}>
        <GlobalModalProvider>
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
