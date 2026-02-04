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

const getBrowserPreferredLanguage = (): Language | null => {
  if (typeof navigator === 'undefined') return null;

  const rawLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];

  const normalizedList = new Set(
    rawLanguages
      .map(raw => raw.split(/[-_]/)[0])
      .filter((value): value is Language => isValidLanguage(value))
  );

  for (const preferred of ['zh', 'vi', 'mn', 'en'] as const) {
    if (normalizedList.has(preferred)) {
      return preferred;
    }
  }

  return null;
};

// Get language from URL or detect from browser
export const detectLanguage = async (): Promise<Language> => {
  const stored = localStorage.getItem('preferredLanguage');
  const storedSource = localStorage.getItem('preferredLanguageSource');

  // 1. If user explicitly chose a language, prioritize it above all else
  if (storedSource === 'user' && stored && isValidLanguage(stored)) {
    return stored;
  }

  // 2. Geo-location detection (force language for specific countries if no user override)
  const country = await fetchUserCountry();
  if (country === 'CN') return 'zh';
  if (country === 'VN') return 'vi';
  if (country === 'MN') return 'mn';

  // 3. Browser language detection
  const browserLang = getBrowserPreferredLanguage();
  if (browserLang && (browserLang === 'zh' || browserLang === 'vi' || browserLang === 'mn')) {
    return browserLang;
  }

  // 4. Fallback to stored preference (legacy logic or auto-saved)
  if (stored && isValidLanguage(stored)) {
    return stored;
  }

  // 5. Fallback to browser lang if valid supported lang
  if (browserLang) return browserLang;

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
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If no valid language in URL, redirect to detected language
    if (!lang || !isValidLanguage(lang)) {
      let cancelled = false;

      detectLanguage().then(detectedLang => {
        if (cancelled) return;
        const segments = location.pathname.split('/').filter(Boolean);
        const rest = segments.length > 0 ? `/${segments.slice(1).join('/')}` : '/';
        const newPath = `/${detectedLang}${rest}${location.search}${location.hash}`;
        navigate(newPath, { replace: true });
      });

      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    const syncBrowserLanguage = async () => {
      const browserLang = getBrowserPreferredLanguage();
      if (!browserLang || (browserLang !== 'zh' && browserLang !== 'vi' && browserLang !== 'mn')) {
        return;
      }
      const country = await fetchUserCountry();
      if (cancelled) return;
      if (country === 'CN' || country === 'VN' || country === 'MN') return;
      const storedSource = localStorage.getItem('preferredLanguageSource');
      if (storedSource === 'user') return;
      if (browserLang === lang) return;
      const segments = location.pathname.split('/').filter(Boolean);
      if (segments[0] && isValidLanguage(segments[0])) {
        segments[0] = browserLang;
      } else {
        segments.unshift(browserLang);
      }
      const newPath = `/${segments.join('/')}${location.search}${location.hash}`;
      navigate(newPath, { replace: true });
    };
    syncBrowserLanguage();

    // Sync i18n with URL language
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Store preference
    localStorage.setItem('preferredLanguage', lang);
    const storedSource = localStorage.getItem('preferredLanguageSource');
    if (storedSource !== 'user') {
      localStorage.setItem('preferredLanguageSource', 'auto');
    }
    return () => {
      cancelled = true;
    };
  }, [lang, i18n, navigate, location]);

  // Don't render children until we have a valid language
  if (!lang || !isValidLanguage(lang)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-slate-600 font-medium">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  return <>{children || <Outlet />}</>;
};

export default LanguageRouter;
