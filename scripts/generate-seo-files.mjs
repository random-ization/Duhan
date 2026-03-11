#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  buildLocalizedPublicRoutes,
  withLang,
} from '../src/seo/publicRoutesData.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE_URL = 'https://koreanstudy.me';

// Generate sitemap.xml
function generateSitemap() {
  const languageRoutes = buildLocalizedPublicRoutes({ includeNoIndex: false }).map((route) => {
    const changefreq = route.basePath === '/' || route.basePath === '/learn' ? 'weekly' : 'monthly';
    const priority =
      route.basePath === '/' ? '1.0' : route.basePath.startsWith('/learn/') ? '0.9' : '0.8';
    const lastmod = route.updatedAt || route.publishedAt || new Date().toISOString().split('T')[0];
    return {
      ...route,
      changefreq,
      priority,
      lastmod,
    };
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${languageRoutes
      .map(
        (route) => `  <url>
    <loc>${SITE_URL}${route.path}</loc>
${route.hreflangLanguages
      .map((lang) => {
        const href = `${SITE_URL}${withLang(lang, route.basePath)}`;
        return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`;
      })
      .join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${withLang(
      route.hreflangLanguages.includes(DEFAULT_LANGUAGE)
        ? DEFAULT_LANGUAGE
        : route.hreflangLanguages[0],
      route.basePath
    )}" />
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
      )
      .join('\n')}
</urlset>`;

  return sitemap;
}

// Generate robots.txt
function generateRobots() {
  const disallowPaths = [
    '/dashboard',
    '/admin',
    '/profile',
    '/courses',
    '/course/',
    '/topik',
    '/notebook',
    '/vocab-book',
    '/podcasts',
    '/video/',
    '/videos',
    '/auth',
    '/verify-email',
    '/reset-password',
    '/payment/',
  ];

  const languagePrefixedDisallows = SUPPORTED_LANGUAGES.flatMap(lang =>
    disallowPaths.map(p => `/${lang}${p}`)
  );

  const allDisallows = [...disallowPaths, ...languagePrefixedDisallows];

  const robots = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Block authentication and private pages
${allDisallows.map(p => `Disallow: ${p}`).join('\n')}

# Sitemap
Sitemap: ${SITE_URL}/sitemap.xml
`;

  return robots;
}

// Main function
function main() {
  try {
    const publicDir = join(__dirname, '..', 'public');
    const indexedRoutes = buildLocalizedPublicRoutes({ includeNoIndex: false });

    // Generate and write sitemap.xml
    const sitemap = generateSitemap();
    writeFileSync(join(publicDir, 'sitemap.xml'), sitemap, 'utf-8');
    console.log('✅ Generated sitemap.xml');

    // Generate and write robots.txt
    const robots = generateRobots();
    writeFileSync(join(publicDir, 'robots.txt'), robots, 'utf-8');
    console.log('✅ Generated robots.txt');

    console.log('\n📊 SEO files generated successfully:');
    console.log(`   - ${indexedRoutes.length} routes in sitemap`);
    console.log(`   - Sitemap URL: ${SITE_URL}/sitemap.xml`);
  } catch (error) {
    console.error('❌ Error generating SEO files:', error);
    process.exit(1);
  }
}

main();
