/**
 * Public routes configuration for SSG pre-rendering
 * These routes do not require authentication and can be pre-rendered
 */

import {
  PUBLIC_ROUTES as PUBLIC_ROUTES_DATA,
  normalizePathname,
  resolveRouteSeo,
  stripLanguagePrefix,
} from './publicRoutesData.mjs';

type SupportedLanguage = 'en' | 'zh' | 'vi' | 'mn';

export interface PublicRoute {
  path: string;
  indexable?: boolean;
  noIndex?: boolean;
  indexLanguages?: SupportedLanguage[];
  meta: {
    title: string;
    description: string;
    keywords?: string;
    ogImage?: string;
  };
  metaByLang?: Partial<
    Record<
      Exclude<SupportedLanguage, 'en'>,
      {
        title: string;
        description: string;
        keywords?: string;
      }
    >
  >;
}

export const PUBLIC_ROUTES: PublicRoute[] = PUBLIC_ROUTES_DATA as unknown as PublicRoute[];

// Export just the paths for sitemap generation
export const getPublicRoutePaths = (): string[] => {
  return PUBLIC_ROUTES.map(route => route.path);
};

export interface RouteMeta {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  noIndex?: boolean;
  indexable?: boolean;
  basePath?: string;
  canonicalPath?: string;
  hreflangLanguages?: SupportedLanguage[];
  publishedAt?: string;
  updatedAt?: string;
}

export const getRouteMeta = (path: string) => {
  const normalizedPath = normalizePathname(path);
  const fallbackBasePath = stripLanguagePrefix(normalizedPath);
  const resolved = resolveRouteSeo(path) as {
    routeExists: boolean;
    meta?: RouteMeta | null;
    basePath?: string;
    noIndex?: boolean;
    indexable?: boolean;
    canonicalPath?: string;
    hreflangLanguages?: SupportedLanguage[];
    publishedAt?: string;
    updatedAt?: string;
  };
  const fallback: RouteMeta = {
    title: 'DuHan - Korean Learning Platform',
    description: "Learn Korean with DuHan's interactive platform",
    keywords: 'Korean learning, learn Korean',
    ogImage: '/logo.png',
    noIndex: true,
    indexable: false,
    basePath: fallbackBasePath,
    canonicalPath: normalizedPath,
    hreflangLanguages: ['en', 'zh', 'vi', 'mn'],
  };

  if (!resolved.routeExists || !resolved.meta) return fallback;

  return {
    ...resolved.meta,
    noIndex: resolved.noIndex ?? true,
    indexable: resolved.indexable ?? false,
    basePath: resolved.basePath,
    canonicalPath: resolved.canonicalPath,
    hreflangLanguages: resolved.hreflangLanguages ?? ['en', 'zh', 'vi', 'mn'],
    publishedAt: resolved.publishedAt,
    updatedAt: resolved.updatedAt,
  } satisfies RouteMeta;
};

export interface RouteSeoConfig {
  basePath: string;
  canonicalPath: string;
  hreflangLanguages: SupportedLanguage[];
  noIndex: boolean;
  indexable: boolean;
  ogImage?: string;
  publishedAt?: string;
  updatedAt?: string;
}

export const getRouteSeoConfig = (path: string): RouteSeoConfig => {
  const normalizedPath = normalizePathname(path);
  const fallbackBasePath = stripLanguagePrefix(normalizedPath);
  const resolved = resolveRouteSeo(path) as {
    basePath?: string;
    meta?: RouteMeta | null;
    canonicalPath?: string;
    hreflangLanguages?: SupportedLanguage[];
    noIndex?: boolean;
    indexable?: boolean;
    publishedAt?: string;
    updatedAt?: string;
  };

  return {
    basePath: resolved.basePath || fallbackBasePath,
    canonicalPath: resolved.canonicalPath || normalizedPath,
    hreflangLanguages: resolved.hreflangLanguages ?? ['en', 'zh', 'vi', 'mn'],
    noIndex: Boolean(resolved.noIndex),
    indexable: Boolean(resolved.indexable),
    ogImage: resolved.meta?.ogImage || '/logo.png',
    publishedAt: resolved.publishedAt,
    updatedAt: resolved.updatedAt,
  };
};
