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

// Get language from URL or detect from browser
export const detectLanguage = async (): Promise<Language> => {
  // Check localStorage first (user preference)
  const stored = localStorage.getItem('preferredLanguage');
  if (stored && isValidLanguage(stored)) {
    return stored;
  }

  const country = await fetchUserCountry();
  if (country === 'CN') return 'zh';
  if (country === 'VN') return 'vi';
  if (country === 'MN') return 'mn';

  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (isValidLanguage(browserLang)) {
    return browserLang;
  }

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

    // Sync i18n with URL language
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Store preference
    localStorage.setItem('preferredLanguage', lang);
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
