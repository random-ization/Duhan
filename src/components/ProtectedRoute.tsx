import React from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useConvexAuth } from 'convex/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from './common/Loading';
import { ensureLocaleNamespaces } from '../utils/i18nNamespaceLoader';
import { DEFAULT_LANGUAGE, isValidLanguage } from './LanguageRouter';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
  redirectTo?: string;
}

export function buildProtectedAuthRedirectTarget(
  lang: string | undefined,
  pathname: string,
  search: string,
  hash: string
): string {
  const nextLang = lang && isValidLanguage(lang) ? lang : DEFAULT_LANGUAGE;
  const destination = `${pathname}${search}${hash}`;
  return `/${nextLang}/auth?redirect=${encodeURIComponent(destination)}`;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requireAdmin = false,
  redirectTo,
}) => {
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const { t } = useTranslation();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { user, loading: userDataLoading, language } = useAuth();
  useQuery({
    queryKey: ['i18n', 'namespace', 'app', language],
    queryFn: () => ensureLocaleNamespaces(language, ['app']),
    enabled: isAuthenticated && Boolean(language),
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
  if (isLoading || userDataLoading) {
    return (
      <Loading fullScreen size="lg" text={t('common.loading', { defaultValue: 'Loading...' })} />
    );
  }

  // Step 2: Only after ALL loading is complete, check authentication
  // At this point isAuthenticated has its final value
  if (!isAuthenticated) {
    const nextTarget =
      redirectTo ||
      buildProtectedAuthRedirectTarget(lang, location.pathname, location.search, location.hash);
    return <Navigate to={nextTarget} replace />;
  }

  // Step 3: Authenticated but no user record available (stale/broken session edge case)
  // AuthContext attempts repair by signing out; redirect as final fallback.
  if (!user) {
    const nextTarget =
      redirectTo ||
      buildProtectedAuthRedirectTarget(lang, location.pathname, location.search, location.hash);
    return <Navigate to={nextTarget} replace />;
  }

  // Step 4: Admin role check
  if (requireAdmin && user.role !== 'ADMIN') {
    return <Navigate to={redirectTo || '/dashboard'} replace />;
  }

  // Step 5: All checks passed
  return <Outlet />;
};
