const SOURCE_LABELS: Record<string, string> = {
  khan: '경향신문',
  donga: '동아일보',
  hankyung: '한국경제',
  mk: '매일경제',
  itdonga: 'IT동아',
  voa_ko: 'VOA 한국어',
  naver_news_search: 'NAVER News',
  wiki_ko_featured: '위키백과 알찬 글',
};

export function getReadingSourceLabel(
  sourceKey: string | null | undefined,
  fallback: string
): string {
  const normalized = typeof sourceKey === 'string' ? sourceKey.trim() : '';
  if (!normalized) return fallback;
  return SOURCE_LABELS[normalized] || normalized;
}

export function formatReadingPublishedDate(
  publishedAt: number | null | undefined,
  locale: string,
  fallback: string
): string {
  if (typeof publishedAt !== 'number' || !Number.isFinite(publishedAt)) {
    return fallback;
  }

  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleDateString(locale);
}

export function formatReadingRelativeTime(
  publishedAt: number | null | undefined,
  locale: string,
  fallback: string
): string {
  if (typeof publishedAt !== 'number' || !Number.isFinite(publishedAt)) {
    return fallback;
  }

  const diffMs = Date.now() - publishedAt;
  if (!Number.isFinite(diffMs)) {
    return fallback;
  }

  const diffMinutes = Math.floor(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diffMinutes < 1) return rtf.format(0, 'minute');
  if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute');
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return rtf.format(-diffHours, 'hour');
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return rtf.format(-diffDays, 'day');
  return formatReadingPublishedDate(publishedAt, locale, fallback);
}
