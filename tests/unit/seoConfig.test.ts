import { describe, it, expect } from 'vitest';

describe('seoConfig', () => {
  it('builds language-prefixed public routes', async () => {
    const mod = (await import('../../scripts/seoConfig.mjs')) as unknown as {
      SUPPORTED_LANGUAGES: string[];
      PUBLIC_ROUTES: string[];
      withLang: (lang: string, route: string) => string;
      getLanguageRoutes: () => string[];
    };

    expect(mod.SUPPORTED_LANGUAGES).toContain('en');
    expect(mod.PUBLIC_ROUTES).toContain('/pricing');
    expect(mod.withLang('en', '/')).toBe('/en');
    expect(mod.withLang('zh', '/pricing')).toBe('/zh/pricing');

    const routes = mod.getLanguageRoutes();
    expect(routes).toContain('/en');
    expect(routes).toContain('/en/login');
    expect(routes).toHaveLength(mod.SUPPORTED_LANGUAGES.length * mod.PUBLIC_ROUTES.length);
  });
});
