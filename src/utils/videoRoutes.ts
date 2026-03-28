function applyReturnTo(params: URLSearchParams, returnTo?: string | null) {
  if (typeof returnTo !== 'string' || !returnTo.trim()) return;
  params.set('returnTo', returnTo);
}

export function buildVideoPlayerPath(videoId: string, returnTo?: string | null): string {
  const params = new URLSearchParams();
  applyReturnTo(params, returnTo);
  const query = params.toString();
  return query ? `/video/${videoId}?${query}` : `/video/${videoId}`;
}
