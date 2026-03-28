export function formatSafeDateLabel(
  value: number | string | Date | null | undefined,
  locale?: string,
  fallback = '—',
  options?: Intl.DateTimeFormatOptions
): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' && !value.trim()) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return fallback;
  }
}
