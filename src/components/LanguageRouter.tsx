import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Language } from '../types';
import { fetchUserCountry } from '../utils/geo';

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'zh', 'vi', 'mn'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'en';

// Check if a language code is valid
export const isValidLanguage = (lang: string): lang is Language => {
  return SUPPORTED_LANGUAGES.includes(lang as Language);
};

export const normalizeLocalizedPathname = (path: string): string => {
  if (!path) return '/';

  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  const collapsedSlashes = withLeadingSlash.replace(/\/{2,}/g, '/');
  const trimmedTrailingSlash = collapsedSlashes.replace(/\/+$/, '') || '/';
  if (trimmedTrailingSlash === '/') return '/';

  const segments = trimmedTrailingSlash.split('/').filter(Boolean);
  if (segments.length === 0) return '/';

  const maybeLanguage = segments[0].toLowerCase();
  if (isValidLanguage(maybeLanguage)) {
    segments[0] = maybeLanguage;
  }

  // Canonicalize legacy route aliases to keep deep links stable.
  const contentRootIndex = isValidLanguage(segments[0] || '') ? 1 : 0;
  if ((segments[contentRootIndex] || '').toLowerCase() === 'vocabbook') {
    segments[contentRootIndex] = 'vocab-book';
  }

  return `/${segments.join('/')}`;
};

const getBrowserPreferredLanguage = (): Language | null => {
  if (typeof navigator === 'undefined') return null;

  const rawLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of rawLanguages) {
    const normalized = raw.split(/[-_]/)[0].toLowerCase();
    if (isValidLanguage(normalized)) {
      return normalized;
    }
  }

  return null;
};

const getStoredUserLanguage = (): Language | null => {
  const stored = localStorage.getItem('preferredLanguage');
  const storedSource = localStorage.getItem('preferredLanguageSource');
  const normalized = stored ? stored.toLowerCase() : null;
  if (storedSource === 'user' && normalized && isValidLanguage(normalized)) {
    return normalized;
  }
  return null;
};

export const detectLanguageFastPath = (): Language | null => {
  const userLanguage = getStoredUserLanguage();
  if (userLanguage) return userLanguage;

  const browserLang = getBrowserPreferredLanguage();
  if (browserLang) return browserLang;

  const stored = localStorage.getItem('preferredLanguage');
  const normalizedStored = stored ? stored.toLowerCase() : null;
  if (normalizedStored && isValidLanguage(normalizedStored)) {
    return normalizedStored;
  }

  return null;
};

const buildLocalizedPath = (pathname: string, nextLang: Language, search = '', hash = '') => {
  const normalizedPathname = normalizeLocalizedPathname(pathname);
  const segments = normalizedPathname.split('/').filter(Boolean);
  if (segments[0] && isValidLanguage(segments[0])) {
    segments[0] = nextLang;
  } else {
    segments.unshift(nextLang);
  }
  return `/${segments.join('/')}${search}${hash}`;
};

// Get language from URL or detect from browser
export const detectLanguage = async (): Promise<Language> => {
  const fastPath = detectLanguageFastPath();
  if (fastPath) {
    return fastPath;
  }

  // Geo-location detection (fallback only when browser language is unavailable)
  const country = await fetchUserCountry();
  if (country === 'CN') return 'zh';
  if (country === 'VN') return 'vi';
  if (country === 'MN') return 'mn';

  return DEFAULT_LANGUAGE;
};

interface LanguageRouterProps {
  children?: React.ReactNode;
}

/**
 * LanguageRouter - Handles language prefix in URLs
 *
 * This component:
 * 1. Extracts language from URL path (/:lang/...)
 * 2. Syncs URL language with i18next
 * 3. Updates <html lang> attribute
 * 4. Stores preference in localStorage
 */
export const LanguageRouter: React.FC<LanguageRouterProps> = ({ children }) => {
  const { lang } = useParams<{ lang: string }>();
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const normalizedPathname = normalizeLocalizedPathname(location.pathname);
    if (normalizedPathname !== location.pathname) {
      navigate(`${normalizedPathname}${location.search}${location.hash}`, { replace: true });
      return;
    }

    // If no valid language in URL, redirect to detected language
    if (!lang || !isValidLanguage(lang)) {
      let cancelled = false;

      detectLanguage().then(detectedLang => {
        if (cancelled) return;
        const segments = normalizedPathname.split('/').filter(Boolean);
        const hasLanguagePrefix = segments[0] ? isValidLanguage(segments[0]) : false;
        const restSegments = hasLanguagePrefix ? segments.slice(1) : segments;
        const rest = restSegments.length > 0 ? `/${restSegments.join('/')}` : '';
        const newPath = `/${detectedLang}${rest}${location.search}${location.hash}`;
        navigate(newPath, { replace: true });
      });

      return () => {
        cancelled = true;
      };
    }

    const userLanguage = getStoredUserLanguage();
    if (userLanguage && userLanguage !== lang) {
      navigate(
        buildLocalizedPath(location.pathname, userLanguage, location.search, location.hash),
        {
          replace: true,
        }
      );
      return;
    }

    // Sync i18n with URL language
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    const storedSource = localStorage.getItem('preferredLanguageSource');
    if (storedSource !== 'user') {
      localStorage.setItem('preferredLanguage', lang);
      localStorage.setItem('preferredLanguageSource', 'auto');
    }
  }, [lang, i18n, navigate, location]);

  // Don't render children until we have a valid language
  if (!lang || !isValidLanguage(lang)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-card">
        <div className="flex items-center gap-3 text-muted-foreground font-medium">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-slate-600" />
          <span>{t('loading', { defaultValue: 'Loading...' })}</span>
        </div>
      </div>
    );
  }

  return <>{children || <Outlet />}</>;
};

export default LanguageRouter;
