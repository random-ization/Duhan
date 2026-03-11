import React, { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  isValidLanguage,
} from '../components/LanguageRouter';
import { getRouteSeoConfig } from './publicRoutes';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
}

const OG_LOCALE_BY_LANGUAGE: Record<string, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  vi: 'vi_VN',
  mn: 'mn_MN',
};

const toOgLocale = (language: string): string => {
  const normalized = (language || DEFAULT_LANGUAGE).split('-')[0].toLowerCase();
  return OG_LOCALE_BY_LANGUAGE[normalized] || OG_LOCALE_BY_LANGUAGE.en;
};

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage,
  noIndex = false,
}) => {
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();

  // Get current language from URL (preferred) or i18n
  const currentLanguage = lang && isValidLanguage(lang) ? lang : i18n.language || DEFAULT_LANGUAGE;
  const routeSeo = getRouteSeoConfig(location.pathname);

  const siteUrl = 'https://koreanstudy.me';

  const normalizedCanonicalPath =
    routeSeo.canonicalPath === '/' ? '/' : routeSeo.canonicalPath.replace(/\/+$/, '');
  const canonicalPathWithoutLang = routeSeo.basePath || '/';
  const hreflangLanguages =
    routeSeo.hreflangLanguages.length > 0 ? routeSeo.hreflangLanguages : SUPPORTED_LANGUAGES;
  const xDefaultLanguage = hreflangLanguages.includes(DEFAULT_LANGUAGE)
    ? DEFAULT_LANGUAGE
    : hreflangLanguages[0];
  const isArticleRoute = routeSeo.basePath.startsWith('/learn/') && routeSeo.basePath !== '/learn';
  const ogType = isArticleRoute ? 'article' : 'website';
  const articlePublishedTime =
    isArticleRoute && routeSeo.publishedAt ? `${routeSeo.publishedAt}T00:00:00Z` : null;
  const articleModifiedTime =
    isArticleRoute && (routeSeo.updatedAt || routeSeo.publishedAt)
      ? `${routeSeo.updatedAt || routeSeo.publishedAt}T00:00:00Z`
      : null;
  const currentOgLocale = toOgLocale(currentLanguage);
  const alternateOgLocales = hreflangLanguages
    .filter(lng => lng !== currentLanguage)
    .map(lng => toOgLocale(lng));
  const shouldNoIndex = noIndex || routeSeo.noIndex;
  const fullCanonicalUrl = canonicalUrl || `${siteUrl}${normalizedCanonicalPath}`;
  const resolvedOgImage = ogImage || routeSeo.ogImage || '/logo.png';
  const fullOgImage = resolvedOgImage.startsWith('http')
    ? resolvedOgImage
    : `${siteUrl}${resolvedOgImage}`;

  // Dynamically update <html lang> attribute
  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  useEffect(() => {
    const upsertMeta = (args: {
      name?: string;
      property?: string;
      content: string;
      tag: string;
    }) => {
      const selector = args.name
        ? `meta[name="${args.name}"]`
        : `meta[property="${args.property}"]`;

      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (args.name) el.setAttribute('name', args.name);
        if (args.property) el.setAttribute('property', args.property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', args.content);
      if (el instanceof HTMLElement) el.dataset.duhanSeo = args.tag;
    };

    const upsertLink = (args: { rel: string; href: string; hreflang?: string; tag: string }) => {
      const hreflangSelector = args.hreflang ? `[hreflang="${args.hreflang}"]` : '';
      const selector = `link[rel="${args.rel}"]${hreflangSelector}`;

      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', args.rel);
        if (args.hreflang) el.setAttribute('hreflang', args.hreflang);
        document.head.appendChild(el);
      }
      el.setAttribute('href', args.href);
      if (el instanceof HTMLElement) el.dataset.duhanSeo = args.tag;
    };

    const removeManagedLinks = (rel: string, tag: string) => {
      document.head
        .querySelectorAll(`link[rel="${rel}"][data-duhan-seo="${tag}"]`)
        .forEach(node => node.remove());
    };

    const removeManagedMeta = (tag: string, name?: string) => {
      const selector = name
        ? `meta[name="${name}"][data-duhan-seo="${tag}"]`
        : `meta[data-duhan-seo="${tag}"]`;
      document.head.querySelectorAll(selector).forEach(node => node.remove());
    };

    const replaceMultiPropertyMeta = (property: string, contents: string[], tag: string) => {
      document.head
        .querySelectorAll(`meta[property="${property}"][data-duhan-seo="${tag}"]`)
        .forEach(node => node.remove());
      for (const content of contents) {
        const el = document.createElement('meta');
        el.setAttribute('property', property);
        el.setAttribute('content', content);
        el.dataset.duhanSeo = tag;
        document.head.appendChild(el);
      }
    };

    document.title = title;

    upsertMeta({ name: 'description', content: description, tag: 'description' });
    if (keywords) {
      upsertMeta({ name: 'keywords', content: keywords, tag: 'keywords' });
    }
    upsertLink({ rel: 'canonical', href: fullCanonicalUrl, tag: 'canonical' });

    if (shouldNoIndex) {
      upsertMeta({ name: 'robots', content: 'noindex, follow', tag: 'robots' });
    } else {
      removeManagedMeta('robots', 'robots');
    }

    removeManagedLinks('alternate', 'hreflang');
    for (const lng of hreflangLanguages) {
      const href = `${siteUrl}/${lng}${canonicalPathWithoutLang === '/' ? '' : canonicalPathWithoutLang}`;
      upsertLink({ rel: 'alternate', hreflang: lng, href, tag: 'hreflang' });
    }
    if (xDefaultLanguage) {
      upsertLink({
        rel: 'alternate',
        hreflang: 'x-default',
        href: `${siteUrl}/${xDefaultLanguage}${canonicalPathWithoutLang === '/' ? '' : canonicalPathWithoutLang}`,
        tag: 'hreflang',
      });
    }

    upsertMeta({ property: 'og:type', content: ogType, tag: 'og:type' });
    upsertMeta({ property: 'og:url', content: fullCanonicalUrl, tag: 'og:url' });
    upsertMeta({ property: 'og:title', content: title, tag: 'og:title' });
    upsertMeta({ property: 'og:description', content: description, tag: 'og:description' });
    upsertMeta({ property: 'og:image', content: fullOgImage, tag: 'og:image' });
    upsertMeta({ property: 'og:site_name', content: 'DuHan', tag: 'og:site_name' });
    upsertMeta({ property: 'og:locale', content: currentOgLocale, tag: 'og:locale' });
    replaceMultiPropertyMeta('og:locale:alternate', alternateOgLocales, 'og:locale:alternate');
    if (articlePublishedTime) {
      upsertMeta({
        property: 'article:published_time',
        content: articlePublishedTime,
        tag: 'article:published_time',
      });
    } else {
      removeManagedMeta('article:published_time');
    }
    if (articleModifiedTime) {
      upsertMeta({
        property: 'article:modified_time',
        content: articleModifiedTime,
        tag: 'article:modified_time',
      });
      upsertMeta({
        property: 'og:updated_time',
        content: articleModifiedTime,
        tag: 'og:updated_time',
      });
    } else {
      removeManagedMeta('article:modified_time');
      removeManagedMeta('og:updated_time');
    }

    upsertMeta({ property: 'twitter:card', content: 'summary_large_image', tag: 'twitter:card' });
    upsertMeta({ property: 'twitter:url', content: fullCanonicalUrl, tag: 'twitter:url' });
    upsertMeta({ property: 'twitter:title', content: title, tag: 'twitter:title' });
    upsertMeta({
      property: 'twitter:description',
      content: description,
      tag: 'twitter:description',
    });
    upsertMeta({ property: 'twitter:image', content: fullOgImage, tag: 'twitter:image' });

    upsertMeta({ name: 'language', content: currentLanguage, tag: 'language' });
    upsertMeta({ name: 'author', content: 'DuHan', tag: 'author' });

    return () => {
      removeManagedLinks('alternate', 'hreflang');
    };
  }, [
    title,
    description,
    keywords,
    fullCanonicalUrl,
    fullOgImage,
    shouldNoIndex,
    canonicalPathWithoutLang,
    hreflangLanguages,
    xDefaultLanguage,
    ogType,
    articlePublishedTime,
    articleModifiedTime,
    currentOgLocale,
    alternateOgLocales,
    siteUrl,
    currentLanguage,
  ]);

  return null;
};
