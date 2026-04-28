import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';

import { DataProvider } from './DataContext';
import { LayoutProvider } from './LayoutContext';
import { ConfirmDialogProvider } from './ConfirmDialogContext';
import { NotebookPickerProvider } from './NotebookPickerContext';
import { ConvexBoundAuthProvider } from './ConvexBoundAuthProvider';
import { LearningProgressTracker } from './LearningProgressTracker';
import { LearningProvider } from './LearningContext';
import { getConvexUrl } from '../utils/convexConfig';

/**
 * Provider stack that only applies on authenticated routes.
 *
 * This component is loaded via `React.lazy()` from `AppContext.tsx`, so none
 * of these providers (and the modules they transitively pull in) land in the
 * entry chunk — pre-auth pages (landing / auth / legal / pricing / learn)
 * never download this code.
 *
 * The Convex React client + `<ConvexAuthProvider>` + `<ConvexBoundAuthProvider>`
 * also live here (moved out of `src/index.tsx`) so that `vendor-convex`
 * (~25 kB gz) is not preloaded on pre-auth pages. Public routes get their
 * auth context from `<PublicAuthProvider>` in `AppContext.tsx` instead.
 *
 * Invariant: every hook re-exported from these providers must be called from
 * a component rendered inside an authenticated route (i.e. under
 * `AppLayout`). Pre-auth pages that reach for one of these hooks will crash
 * at runtime. If you add a new public page that needs one of these
 * providers, add its path to `isPublicPathname` in `AppContext.tsx` *OR*
 * move the provider out of this file.
 */

// Module-level singleton. Because `AuthedAppProviders` is loaded via
// `React.lazy()` the first time an authed route is visited, the client is
// constructed exactly once per page load regardless of how many times the
// provider re-mounts during navigation. We avoid `useMemo` inside the
// component body so HMR / StrictMode double-invocations can't create
// two parallel WebSockets to Convex.
let convexClient: ConvexReactClient | null = null;
let queryClient: QueryClient | null = null;

function getConvexClient(): ConvexReactClient {
  if (convexClient === null) {
    convexClient = new ConvexReactClient(getConvexUrl());
  }
  return convexClient;
}

function getQueryClient(): QueryClient {
  if (queryClient === null) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5,
          gcTime: 1000 * 60 * 30,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }
  return queryClient;
}

const AuthedAppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <ConvexAuthProvider client={getConvexClient()}>
        <ConvexBoundAuthProvider>
          <DataProvider>
            <NotebookPickerProvider>
              <ConfirmDialogProvider>
                <LayoutProvider>
                  <LearningProvider>
                    {/* Side-effect-only; syncs selected institute/level to the
                        backend on change. Must sit inside ConvexBoundAuthProvider
                        so `useMutation` can resolve the Convex client. */}
                    <LearningProgressTracker />
                    {children}
                  </LearningProvider>
                </LayoutProvider>
              </ConfirmDialogProvider>
            </NotebookPickerProvider>
          </DataProvider>
        </ConvexBoundAuthProvider>
      </ConvexAuthProvider>
    </QueryClientProvider>
  );
};

export default AuthedAppProviders;
