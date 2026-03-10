import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useConvexAuth } from 'convex/react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from './common/Loading';
import { ensureLocaleNamespaces } from '../utils/i18nNamespaceLoader';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requireAdmin = false,
  redirectTo,
}) => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { user, loading: userDataLoading, language } = useAuth();
  const { isPending: appLocaleLoading } = useQuery({
    queryKey: ['i18n', 'namespace', 'app', language],
    queryFn: () => ensureLocaleNamespaces(language, ['app']),
    enabled: isAuthenticated,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  // Monitor session expiration - removed modal logic
  // useEffect(() => {
  //   if (sessionExpired && !isLoading && !userDataLoading) {
  //     // Logic to show modal removed
  //   }
  // }, [sessionExpired, isLoading, userDataLoading]);

  // Step 1: ANY loading state = show loading, DO NOT redirect
  // This is CRITICAL to avoid the race condition
  if (isLoading || userDataLoading || appLocaleLoading) {
    return <Loading fullScreen size="lg" text="Loading..." />;
  }

  // Step 2: Only after ALL loading is complete, check authentication
  // At this point isAuthenticated has its final value
  if (!isAuthenticated) {
    return <Navigate to={redirectTo || '/'} replace />;
  }

  // Step 3: Authenticated but no user record available (stale/broken session edge case)
  // AuthContext attempts repair by signing out; redirect as final fallback.
  if (!user) {
    return <Navigate to={redirectTo || '/'} replace />;
  }

  // Step 4: Admin role check
  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to={redirectTo || '/dashboard'} replace />;
  }

  // Step 5: All checks passed
  return <Outlet />;
};
