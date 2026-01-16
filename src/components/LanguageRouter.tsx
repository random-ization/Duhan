import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'zh', 'vi', 'mn'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Check if a language code is valid
export const isValidLanguage = (lang: string): lang is SupportedLanguage => {
    return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
};

// Get language from URL or detect from browser
export const detectLanguage = (): SupportedLanguage => {
    // Check localStorage first (user preference)
    const stored = localStorage.getItem('preferredLanguage');
    if (stored && isValidLanguage(stored)) {
        return stored;
    }

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
            const detectedLang = detectLanguage();
            const newPath = `/${detectedLang}${location.pathname}${location.search}${location.hash}`;
            navigate(newPath, { replace: true });
            return;
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
        return null;
    }

    return <>{children || <Outlet />}</>;
};

export default LanguageRouter;
