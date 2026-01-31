import React from 'react';
import { Link, LinkProps, useParams } from 'react-router-dom';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, isValidLanguage } from './LanguageRouter';

interface LocalizedLinkProps extends Omit<LinkProps, 'to'> {
    to: string;
}

/**
 * LocalizedLink - A Link component that automatically adds language prefix
 * 
 * Usage:
 *   <LocalizedLink to="/dashboard">Dashboard</LocalizedLink>
 *   // Renders as <Link to="/en/dashboard">Dashboard</Link> (if current lang is 'en')
 */
export const LocalizedLink: React.FC<LocalizedLinkProps> = ({ to, children, ...props }) => {
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang && isValidLanguage(lang) ? lang : DEFAULT_LANGUAGE;

    // Check if already has language prefix
    const hasLangPrefix = SUPPORTED_LANGUAGES.some(l =>
        to === `/${l}` || to.startsWith(`/${l}/`)
    );

    // Normalize the base path (ensure it starts with /)
    const normalizedTo = to.startsWith('/') ? to : `/${to}`;

    // Add prefix if needed
    const localizedTo = hasLangPrefix
        ? to
        : `/${currentLang}${normalizedTo}`;

    return (
        <Link to={localizedTo} {...props}>
            {children}
        </Link>
    );
};

export default LocalizedLink;
