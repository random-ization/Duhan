import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import UpgradePrompt from './components/UpgradePrompt';
import { PhoneVerifyModal } from './components/PhoneVerifyModal';
import { AppRoutes } from './routes';
import { useAuth } from './contexts/AuthContext';
import { useLearning } from './contexts/LearningContext';
import { Loading } from './components/common/Loading';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useUserActions } from './hooks/useUserActions';
import { PhoneVerifyModalProvider } from './contexts/PhoneVerifyModalContext';

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
  const { user, loading, language, canAccessContent } = useAuth();
  const { updateLearningProgress } = useUserActions();
  const { selectedInstitute, selectedLevel } = useLearning();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Track learning progress when user changes institute/level
  useEffect(() => {
    if (user && selectedInstitute && selectedLevel) {
      // Prevent feedback loop/concurrent updates
      if (user.lastInstitute === selectedInstitute && user.lastLevel === selectedLevel) {
        return;
      }
      updateLearningProgress(selectedInstitute, selectedLevel);
    }
  }, [selectedInstitute, selectedLevel, user, updateLearningProgress]);

  if (loading) return <Loading fullScreen size="lg" text={t('loading')} />;

  /* 
  const handleNavigate = (page: string) => {
    // Clear module state when navigating away from module page
    if (page !== 'module') {
      setActiveModule(null);
      setActiveCustomList(null);
      setActiveListType(null);
    }
    navigate(`/${page}`);
  };
  */

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary moduleName={t('common.appName', 'DuHan')}>
        <PhoneVerifyModalProvider>
          <Routes>
            <Route
              path="/*"
              element={
                <AppRoutes
                  canAccessContent={canAccessContent}
                  onShowUpgradePrompt={() => setShowUpgradePrompt(true)}
                />
              }
            />
          </Routes>

          <UpgradePrompt
            isOpen={showUpgradePrompt}
            onClose={() => setShowUpgradePrompt(false)}
            language={language}
            contentType="textbook"
          />
          <PhoneVerifyModal />
        </PhoneVerifyModalProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
