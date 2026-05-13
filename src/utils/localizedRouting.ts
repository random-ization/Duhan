import {
  DEFAULT_LANGUAGE,
  isValidLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../components/LanguageRouter';

const EXTERNAL_PATH_RE = /^[a-z][a-z\d+\-.]*:/i;

const normalizeLanguage = (lang: string): SupportedLanguage => {
  return isValidLanguage(lang) ? lang : DEFAULT_LANGUAGE;
};

export const localizeInternalPath = (path: string, lang: string): string => {
  if (EXTERNAL_PATH_RE.test(path) || path.startsWith('//')) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const currentLanguage = normalizeLanguage(lang);
  if (normalizedPath === '/') {
    return `/${currentLanguage}`;
  }
  const hasLangPrefix = SUPPORTED_LANGUAGES.some(
    candidate => normalizedPath === `/${candidate}` || normalizedPath.startsWith(`/${candidate}/`)
  );

  if (hasLangPrefix) {
    return normalizedPath;
  }

  return `/${currentLanguage}${normalizedPath}`;
};
