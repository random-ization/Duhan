/**
 * Backward-compatible re-export surface for `AuthContext`.
 *
 * Historically this file exported BOTH the React context hook (`useAuth`)
 * AND the Convex-backed `AuthProvider`. Because every component that needs
 * the current user imports `useAuth` from here, the Convex imports in the
 * provider leaked into virtually every chunk — including the landing page.
 *
 * Split into two modules:
 *
 *   - `./authContextCore.tsx`          — no Convex imports, holds the
 *                                        context object, `useAuth`,
 *                                        `PublicAuthProvider`.
 *   - `./ConvexBoundAuthProvider.tsx`  — the real, live provider.
 *                                        Only imported from the lazy
 *                                        `AuthedAppProviders` chunk.
 *
 * This file keeps the legacy import path working for the ~70 consumers
 * that do `import { useAuth } from '../contexts/AuthContext'`.
 */

export {
  AuthContext,
  PublicAuthProvider,
  useAuth,
  type AuthContextType,
} from './authContextCore';
