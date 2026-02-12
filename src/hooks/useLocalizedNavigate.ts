import { useNavigate, useParams, NavigateOptions, To } from 'react-router-dom';
import { useCallback } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, isValidLanguage } from '../components/LanguageRouter';

/**
 * getLocalizedPath - Helper function to add language prefix to a path
 */
export const getLocalizedPath = (path: string, lang: string): string => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Check if already has language prefix
    const hasLangPrefix = SUPPORTED_LANGUAGES.some(l =>
        normalizedPath === `/${l}` || normalizedPath.startsWith(`/${l}/`)
    );

    if (hasLangPrefix) {
        return normalizedPath;
    }

    return `/${lang}${normalizedPath}`;
};

/**
 * useLocalizedNavigate - Custom hook for navigation with language prefix
 * 
 * Automatically prepends the current language to navigation paths.
 * 
 * Usage:
 *   const navigate = useLocalizedNavigate();
 *   navigate('/dashboard'); // Will navigate to /en/dashboard (if current lang is 'en')
 */
export const useLocalizedNavigate = () => {
    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();

    // Get current language from URL or default
    const currentLang = lang && isValidLanguage(lang) ? lang : DEFAULT_LANGUAGE;

    const runWithTransition = useCallback((cb: () => void) => {
        if (typeof document === 'undefined') {
            cb();
            return;
        }
        const docWithTransition = document as Document & {
            startViewTransition?: (updateCallback: () => void) => void;
        };
        if (typeof docWithTransition.startViewTransition === 'function') {
            docWithTransition.startViewTransition(() => cb());
            return;
        }
        cb();
    }, []);

    const localizedNavigate = useCallback(
        (to: To | number, options?: NavigateOptions) => {
            // 1. Handle numeric navigation (back/forward)
            if (typeof to === 'number') {
                runWithTransition(() => navigate(to));
                return;
            }

            // 2. Handle string paths
            if (typeof to === 'string') {
                runWithTransition(() => navigate(getLocalizedPath(to, currentLang), options));
                return;
            }

            // 3. Handle object navigation (To type with pathname)
            if (typeof to === 'object' && to.pathname) {
                const localizedPath = getLocalizedPath(to.pathname, currentLang);
                runWithTransition(() => navigate({ ...to, pathname: localizedPath }, options));
                return;
            }

            // 4. Fallback
            runWithTransition(() => navigate(to, options));
        },
        [navigate, currentLang, runWithTransition]
    );

    return localizedNavigate;
};

/**
 * useCurrentLanguage - Get the current language from URL
 */
export const useCurrentLanguage = () => {
    const { lang } = useParams<{ lang: string }>();
    return lang && isValidLanguage(lang) ? lang : DEFAULT_LANGUAGE;
};

export default useLocalizedNavigate;
