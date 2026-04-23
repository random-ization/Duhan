import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';

import { PublicAuthProvider } from './authContextCore';
import { LearningProvider } from './LearningContext';
import { isValidLanguage, normalizeLocalizedPathname } from '../components/LanguageRouter';

// The authenticated-app provider stack (ConvexAuthProvider,
// ConvexBoundAuthProvider, DataProvider, NotebookPickerProvider,
// ConfirmDialogProvider, LayoutProvider) is loaded lazily so none of those
// modules — including the full Convex React SDK — ship in the entry chunk
// that every pre-auth page must download before first paint. Public routes
// get their auth context from `<PublicAuthProvider>` instead, which has zero
// Convex imports. See ./AuthedAppProviders.tsx for the invariants.
const AuthedAppProviders = React.lazy(() => import('./AuthedAppProviders'));

function isPublicPathname(pathname: string): boolean {
  if (pathname === '/') {
    return true;
  }

  const normalizedPathname = normalizeLocalizedPathname(pathname);
  const segments = normalizedPathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  const routeOffset = firstSegment && isValidLanguage(firstSegment) ? 1 : 0;
  const routeRoot = segments[routeOffset] ?? '';
  const routeChild = segments[routeOffset + 1] ?? '';

  if (!routeRoot) {
    return true;
  }

  if (
    routeRoot === 'login' ||
    routeRoot === 'register' ||
    routeRoot === 'auth' ||
    routeRoot === 'verify-email' ||
    routeRoot === 'forgot-password' ||
    routeRoot === 'reset-password' ||
    routeRoot === 'terms' ||
    routeRoot === 'privacy' ||
    routeRoot === 'refund' ||
    routeRoot === 'pricing' ||
    routeRoot === 'learn'
  ) {
    return true;
  }

  if (routeRoot === 'payment' && routeChild === 'success') {
    return true;
  }

  if (routeRoot === 'preview' && routeChild === 'mobile') {
    return true;
  }

  if (routeRoot === 'admin' && routeChild === 'login') {
    return true;
  }

  return false;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const shouldUsePublicProviders = isPublicPathname(location.pathname);

  // On public paths we render only the lightweight `<PublicAuthProvider>`
  // stub. Its `useAuth()` always reports a signed-out visitor, and it
  // imports nothing from Convex — so visitors to landing / login / pricing
  // never pull in the Convex React SDK or open a WebSocket.
  //
  // On authed paths we lazy-load `AuthedAppProviders`, which mounts its
  // OWN `<ConvexAuthProvider>` + `<ConvexBoundAuthProvider>` (plus the
  // Data/NotebookPicker/ConfirmDialog/Layout providers) inside the same
  // chunk. That chunk is only fetched after the user navigates to an
  // authed route.
  if (shouldUsePublicProviders) {
    return (
      <PublicAuthProvider>
        <LearningProvider>{children}</LearningProvider>
      </PublicAuthProvider>
    );
  }

  // Suspense fallback is `null` on purpose: the authed routes that this
  // tree wraps are already rendered inside `routes.tsx`'s own Suspense
  // boundary (fed by AppLayout's <ContentSkeleton />), so users still see
  // a skeleton — they never see a blank screen, and we avoid stacking two
  // skeleton UIs.
  return (
    <Suspense fallback={null}>
      <AuthedAppProviders>
        <LearningProvider>{children}</LearningProvider>
      </AuthedAppProviders>
    </Suspense>
  );
};
