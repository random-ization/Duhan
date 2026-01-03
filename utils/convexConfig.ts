/**
 * Resolve Convex base URL.
 * Prefer configured env; otherwise fall back to relative /api so Vite proxy
 * and same-origin deployments work without localhost hardcoding.
 */
export const getConvexUrl = () => import.meta.env.VITE_CONVEX_URL || '/api';
