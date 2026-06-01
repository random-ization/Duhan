import { isValidLanguage } from '../components/LanguageRouter';

const LEGACY_ROOT_SEGMENT_ALIASES = {
  practice: 'courses',
  vocabbook: 'vocab-book',
} as const;

export function getPathWithoutLang(pathname: string): string {
  const normalized = pathname || '/';
  const segments = normalized.split('/').filter(Boolean);
  const contentRootIndex = segments[0] && isValidLanguage(segments[0]) ? 1 : 0;
  const contentRoot = segments[contentRootIndex]?.toLowerCase();
  if (contentRoot && contentRoot in LEGACY_ROOT_SEGMENT_ALIASES) {
    segments[contentRootIndex] =
      LEGACY_ROOT_SEGMENT_ALIASES[contentRoot as keyof typeof LEGACY_ROOT_SEGMENT_ALIASES];
  }

  if (segments[0] && isValidLanguage(segments[0])) {
    const rest = segments.slice(1).join('/');
    return rest ? `/${rest}` : '/';
  }
  if (segments.length === 0) return '/';
  return `/${segments.join('/')}`;
}

export function getPathSegments(pathname: string): string[] {
  return getPathWithoutLang(pathname).split('/').filter(Boolean);
}
