export type MediaTab = 'podcast' | 'video' | 'reading';

export function buildMediaPath(tab: MediaTab = 'podcast'): string {
  if (tab === 'podcast') return '/media';

  const params = new URLSearchParams();
  params.set('tab', tab);
  return `/media?${params.toString()}`;
}
