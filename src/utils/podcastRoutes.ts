type PodcastRouteChannel = {
  _id?: string | number | null;
  id?: string | number | null;
  itunesId?: string | number | null;
  feedUrl?: string | null;
};

function applyReturnTo(params: URLSearchParams, returnTo?: string | null) {
  if (typeof returnTo !== 'string' || !returnTo.trim()) return;
  params.set('returnTo', returnTo);
}

export function buildPodcastSearchPath(query: string, returnTo?: string | null): string | null {
  const normalized = query.trim();
  if (!normalized) return null;
  const params = new URLSearchParams();
  params.set('q', normalized);
  applyReturnTo(params, returnTo);
  return `/podcasts/search?${params.toString()}`;
}

export function buildPodcastChannelPath(
  channel: PodcastRouteChannel,
  returnTo?: string | null
): string {
  const params = new URLSearchParams();
  const channelId = channel.itunesId ?? channel.id ?? channel._id;

  if (channelId !== undefined && channelId !== null && String(channelId).trim()) {
    params.set('id', String(channelId));
  }

  if (typeof channel.feedUrl === 'string' && channel.feedUrl.trim()) {
    params.set('feedUrl', channel.feedUrl);
  }

  applyReturnTo(params, returnTo);

  const query = params.toString();
  return query ? `/podcasts/channel?${query}` : '/podcasts/channel';
}
