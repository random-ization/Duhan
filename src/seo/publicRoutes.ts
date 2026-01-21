/**
 * Public routes configuration for SSG pre-rendering
 * These routes do not require authentication and can be pre-rendered
 */

import { PUBLIC_ROUTES as PUBLIC_ROUTES_DATA } from './publicRoutesData.mjs';

export interface PublicRoute {
  path: string;
  indexable?: boolean;
  noIndex?: boolean;
  meta: {
    title: string;
    description: string;
    keywords?: string;
  };
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
  noIndex?: boolean;
  indexable?: boolean;
}

export const getRouteMeta = (path: string) => {
  const normalizedPath = path.replace(/^\/(en|zh|vi|mn)(\/|$)/, '/').replace(/\/+$/, '') || '/';
  const route = PUBLIC_ROUTES.find(r => r.path === normalizedPath);
  const fallback: RouteMeta = {
    title: 'DuHan - Korean Learning Platform',
    description: "Learn Korean with DuHan's interactive platform",
    keywords: 'Korean learning, learn Korean',
    noIndex: true,
    indexable: false,
  };

  if (!route) return fallback;

  return {
    ...route.meta,
    noIndex: route.noIndex ?? false,
    indexable: route.indexable ?? false,
  } satisfies RouteMeta;
};
