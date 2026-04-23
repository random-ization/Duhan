import { hasSafeReturnTo, sanitizeReturnToPath } from './navigation';

function applyReturnTo(params: URLSearchParams, returnTo?: string | null) {
  if (typeof returnTo !== 'string') return;
  const trimmed = returnTo.trim();
  if (!hasSafeReturnTo(trimmed)) return;
  params.set('returnTo', sanitizeReturnToPath(trimmed));
}

export function buildVideoPlayerPath(videoId: string, returnTo?: string | null): string {
  const params = new URLSearchParams();
  applyReturnTo(params, returnTo);
  const query = params.toString();
  return query ? `/video/${videoId}?${query}` : `/video/${videoId}`;
}
