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
