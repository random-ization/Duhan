import { isValidLanguage } from '../components/LanguageRouter';

export function getPathWithoutLang(pathname: string): string {
  const normalized = pathname || '/';
  const segments = normalized.split('/').filter(Boolean);
  if (segments[0] && isValidLanguage(segments[0])) {
    const rest = segments.slice(1).join('/');
    return rest ? `/${rest}` : '/';
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function getPathSegments(pathname: string): string[] {
  return getPathWithoutLang(pathname).split('/').filter(Boolean);
}
