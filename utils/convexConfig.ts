const DEFAULT_CONVEX_DEV_URL = 'http://localhost:3001';

/**
 * Resolve Convex base URL.
 * Prefer configured env; otherwise fall back to browser origin (or a localhost
 * default in non-browser contexts) to avoid constructing double `/api/api/...`
 * paths that trigger 404s.
 */
export const getConvexUrl = () =>
  import.meta.env.VITE_CONVEX_URL ||
  (() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return origin && origin.startsWith('http') ? origin : DEFAULT_CONVEX_DEV_URL;
  })();
