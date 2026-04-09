const DEFAULT_CONVEX_DEV_URL = 'http://localhost:3001';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith('.local');
}

const resolvedConvexUrl = (() => {
  if (import.meta.env.VITE_CONVEX_URL) return import.meta.env.VITE_CONVEX_URL;
  if (globalThis.window !== undefined) {
    const origin = globalThis.location.origin;
    const hostname = globalThis.location.hostname;
    // Guard against non-http(s) schemes in custom embeds/tests.
    if (
      (origin.startsWith('http://') || origin.startsWith('https://')) &&
      isLocalHostname(hostname)
    ) {
      return origin;
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
export const getConvexUrl = (): string => {
  if (
    import.meta.env.PROD &&
    !import.meta.env.VITE_CONVEX_URL &&
    globalThis.window !== undefined &&
    !isLocalHostname(globalThis.location.hostname)
  ) {
    console.warn(
      '[Convex] Missing VITE_CONVEX_URL in production. Configure the public Convex URL in Vercel env vars or add an explicit same-origin /api proxy.'
    );
  }

  return resolvedConvexUrl;
};
