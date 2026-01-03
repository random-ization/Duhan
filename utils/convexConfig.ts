const DEFAULT_CONVEX_DEV_URL = 'http://localhost:3001';

const resolvedConvexUrl = (() => {
  if (import.meta.env.VITE_CONVEX_URL) return import.meta.env.VITE_CONVEX_URL;
  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    try {
      const url = new URL(window.location.origin);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.origin;
      }
    } catch {
      // fall through to default
    }
  }
  return DEFAULT_CONVEX_DEV_URL;
})();

/**
 * Resolve Convex base URL.
 * Prefer configured env; otherwise fall back to browser origin (or a localhost
 * default in non-browser contexts) to avoid constructing double `/api/api/...`
 * paths that trigger 404s.
 */
export const getConvexUrl = () => resolvedConvexUrl;
