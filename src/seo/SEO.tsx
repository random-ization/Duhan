import React, { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, isValidLanguage } from '../components/LanguageRouter';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage = '/logo.png',
  noIndex = false,
}) => {
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();

  // Get current language from URL (preferred) or i18n
  const currentLanguage = lang && isValidLanguage(lang) ? lang : (i18n.language || DEFAULT_LANGUAGE);

  const siteUrl = 'https://koreanstudy.me';

  // Extract path without language prefix for hreflang generation
  const pathWithoutLang = location.pathname.replace(/^\/(en|zh|vi|mn)(\/|$)/, '/').replace(/\/+$/, '') || '/';

  // Normalize pathname: remove trailing slash (except for root "/")
  const normalizedPathname = location.pathname === '/'
    ? '/'
    : location.pathname.replace(/\/+$/, '');

  const fullCanonicalUrl = canonicalUrl || `${siteUrl}${normalizedPathname}`;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;

  // Dynamically update <html lang> attribute
  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  return (
    <>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={fullCanonicalUrl} />

      {/* Robots Meta */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Hreflang Tags for Multi-language SEO - Path-based URLs */}
      {SUPPORTED_LANGUAGES.map((lng) => (
        <link
          key={lng}
          rel="alternate"
          hrefLang={lng}
          href={`${siteUrl}/${lng}${pathWithoutLang === '/' ? '' : pathWithoutLang}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${siteUrl}/${DEFAULT_LANGUAGE}${pathWithoutLang === '/' ? '' : pathWithoutLang}`} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:site_name" content="DuHan" />
      <meta property="og:locale" content={currentLanguage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullCanonicalUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={fullOgImage} />

      {/* Language Meta - Dynamic */}
      <meta name="language" content={currentLanguage} />
      <meta name="author" content="DuHan" />
    </>
  );
};
