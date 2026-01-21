import React, { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  isValidLanguage,
} from '../components/LanguageRouter';

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
  const currentLanguage = lang && isValidLanguage(lang) ? lang : i18n.language || DEFAULT_LANGUAGE;

  const siteUrl = 'https://koreanstudy.me';

  // Extract path without language prefix for hreflang generation
  const pathWithoutLang =
    location.pathname.replace(/^\/(en|zh|vi|mn)(\/|$)/, '/').replace(/\/+$/, '') || '/';

  // Normalize pathname: remove trailing slash (except for root "/")
  const normalizedPathname =
    location.pathname === '/' ? '/' : location.pathname.replace(/\/+$/, '');

  const fullCanonicalUrl = canonicalUrl || `${siteUrl}${normalizedPathname}`;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;

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

      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        if (args.name) el.setAttribute('name', args.name);
        if (args.property) el.setAttribute('property', args.property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', args.content);
      el.setAttribute('data-duhan-seo', args.tag);
    };

    const upsertLink = (args: { rel: string; href: string; hreflang?: string; tag: string }) => {
      const hreflangSelector = args.hreflang ? `[hreflang="${args.hreflang}"]` : '';
      const selector = `link[rel="${args.rel}"]${hreflangSelector}`;

      let el = document.head.querySelector(selector) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', args.rel);
        if (args.hreflang) el.setAttribute('hreflang', args.hreflang);
        document.head.appendChild(el);
      }
      el.setAttribute('href', args.href);
      el.setAttribute('data-duhan-seo', args.tag);
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

    document.title = title;

    upsertMeta({ name: 'description', content: description, tag: 'description' });
    if (keywords) {
      upsertMeta({ name: 'keywords', content: keywords, tag: 'keywords' });
    }
    upsertLink({ rel: 'canonical', href: fullCanonicalUrl, tag: 'canonical' });

    if (noIndex) {
      upsertMeta({ name: 'robots', content: 'noindex, nofollow', tag: 'robots' });
    } else {
      removeManagedMeta('robots', 'robots');
    }

    removeManagedLinks('alternate', 'hreflang');
    for (const lng of SUPPORTED_LANGUAGES) {
      const href = `${siteUrl}/${lng}${pathWithoutLang === '/' ? '' : pathWithoutLang}`;
      upsertLink({ rel: 'alternate', hreflang: lng, href, tag: 'hreflang' });
    }
    upsertLink({
      rel: 'alternate',
      hreflang: 'x-default',
      href: `${siteUrl}/${DEFAULT_LANGUAGE}${pathWithoutLang === '/' ? '' : pathWithoutLang}`,
      tag: 'hreflang',
    });

    upsertMeta({ property: 'og:type', content: 'website', tag: 'og:type' });
    upsertMeta({ property: 'og:url', content: fullCanonicalUrl, tag: 'og:url' });
    upsertMeta({ property: 'og:title', content: title, tag: 'og:title' });
    upsertMeta({ property: 'og:description', content: description, tag: 'og:description' });
    upsertMeta({ property: 'og:image', content: fullOgImage, tag: 'og:image' });
    upsertMeta({ property: 'og:site_name', content: 'DuHan', tag: 'og:site_name' });
    upsertMeta({ property: 'og:locale', content: currentLanguage, tag: 'og:locale' });

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
    noIndex,
    pathWithoutLang,
    siteUrl,
    currentLanguage,
  ]);

  return null;
};
