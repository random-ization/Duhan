export function resolveSafeReturnTo(rawValue: string | null | undefined, fallback: string): string {
  const normalizedFallback = fallback.startsWith('/') ? fallback : `/${fallback}`;
  const raw = (rawValue || '').trim();

  if (!raw) return normalizedFallback;
  if (!raw.startsWith('/')) return normalizedFallback;
  // Prevent protocol-relative targets like //example.com
  if (raw.startsWith('//')) return normalizedFallback;

  return raw;
}

export function hasSafeReturnTo(rawValue: string | null | undefined): boolean {
  const raw = (rawValue || '').trim();
  return raw.startsWith('/') && !raw.startsWith('//');
}

export function sanitizeReturnToPath(rawValue: string): string {
  const [targetWithoutHash, targetHash = ''] = rawValue.split('#');
  const [targetPathname, targetQuery = ''] = targetWithoutHash.split('?');
  const targetParams = new URLSearchParams(targetQuery);
  targetParams.delete('returnTo');
  const cleanedQuery = targetParams.toString();
  const cleanedPath = cleanedQuery ? `${targetPathname}?${cleanedQuery}` : targetPathname;
  return targetHash ? `${cleanedPath}#${targetHash}` : cleanedPath;
}

export function appendReturnToPath(path: string, returnTo: string | null | undefined): string {
  if (!hasSafeReturnTo(returnTo)) {
    return path;
  }
  const safeReturnTo = sanitizeReturnToPath((returnTo || '').trim());

  const [pathWithoutHash, hash = ''] = path.split('#');
  const [pathname, query = ''] = pathWithoutHash.split('?');
  const params = new URLSearchParams(query);
  params.set('returnTo', safeReturnTo);

  const nextQuery = params.toString();
  const nextPath = nextQuery ? `${pathname}?${nextQuery}` : pathname;
  return hash ? `${nextPath}#${hash}` : nextPath;
}
