export type ReadingDiscoveryDifficultyFilter = 'ALL' | 'L1' | 'L2' | 'L3';

const DIFFICULTY_FILTERS: ReadingDiscoveryDifficultyFilter[] = ['ALL', 'L1', 'L2', 'L3'];

export function normalizeReadingDifficultyFilter(
  value: string | null | undefined
): ReadingDiscoveryDifficultyFilter {
  if (value && DIFFICULTY_FILTERS.includes(value as ReadingDiscoveryDifficultyFilter)) {
    return value as ReadingDiscoveryDifficultyFilter;
  }
  return 'ALL';
}

export function resolvePictureBookLevelFilter(params: {
  requestedLevel: string | null | undefined;
  availableLevels: string[];
  fallbackLevel?: string;
}): string {
  const normalizedRequested = params.requestedLevel?.trim() || '';
  if (normalizedRequested) {
    return normalizedRequested;
  }
  if (params.availableLevels.length > 0) {
    return params.availableLevels[0];
  }
  return params.fallbackLevel ?? '1단계';
}

export function buildReadingDiscoveryPath(params: {
  pathname?: string;
  difficultyFilter: ReadingDiscoveryDifficultyFilter;
  pictureBookLevelFilter: string;
}): string {
  const searchParams = new URLSearchParams();
  if (params.difficultyFilter !== 'ALL') {
    searchParams.set('difficulty', params.difficultyFilter);
  }
  if (params.pictureBookLevelFilter.trim()) {
    searchParams.set('level', params.pictureBookLevelFilter);
  }
  const query = searchParams.toString();
  return query ? `${params.pathname ?? '/reading'}?${query}` : (params.pathname ?? '/reading');
}
