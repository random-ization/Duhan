/**
 * Centralized route configuration for pre-rendering
 * Lists all public/static routes that should be pre-rendered for SEO
 */

import seoConfig from './seo.config.json';

export interface RouteConfig {
  path: string;
  title: string;
  description: string;
  isPublic: boolean;
}

// Public routes that should be pre-rendered for SEO
export const PUBLIC_ROUTES: RouteConfig[] = seoConfig.routes;

// Base URL for the application
export const BASE_URL = seoConfig.baseUrl;

// Get list of paths for sitemap generation
export const getPublicRoutePaths = (): string[] => {
  return PUBLIC_ROUTES.map(route => route.path);
};

// Get route config by path
export const getRouteConfig = (path: string): RouteConfig | undefined => {
  return PUBLIC_ROUTES.find(route => route.path === path);
};
