/**
 * Resolve Convex base URL.
 * Prefer configured env; otherwise fall back to current origin to avoid
 * constructing double `/api/api/...` paths that trigger 404s.
 */
export const getConvexUrl = () =>
  import.meta.env.VITE_CONVEX_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
