import React from 'react';
import { useConvexAuth } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from '../components/common/Loading';
import CoursesOverview from './CoursesOverview';
import CoursesLandingPage from './CoursesLandingPage';

// Public entry: show SEO landing for logged-out users, course library for logged-in users.
export const CoursesEntryPage: React.FC = () => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { user } = useAuth();

  if (isAuthenticated) {
    if (isLoading || !user) {
      return <Loading fullScreen size="lg" text="Loading..." />;
    }
    return <CoursesOverview />;
  }

  return <CoursesLandingPage />;
};

export default CoursesEntryPage;
