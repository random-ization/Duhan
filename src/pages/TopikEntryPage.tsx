import React from 'react';
import { useConvexAuth } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from '../components/common/Loading';
import TopikPage from './TopikPage';
import TopikLandingPage from './TopikLandingPage';
import { useTranslation } from 'react-i18next';

// Public entry: show SEO landing for logged-out users, full exam center for logged-in users.
export const TopikEntryPage: React.FC = () => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { user } = useAuth();
  const { t } = useTranslation();

  if (isAuthenticated) {
    // Edge case: session says authenticated but user doc is still loading.
    if (isLoading || !user) {
      return <Loading fullScreen size="lg" text={t('loading')} />;
    }

    return <TopikPage />;
  }

  // Public landing (do not block on auth loading, so crawlers/users always get content).
  return <TopikLandingPage />;
};

export default TopikEntryPage;
