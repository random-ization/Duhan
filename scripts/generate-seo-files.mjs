#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SUPPORTED_LANGUAGES, PUBLIC_ROUTES, withLang } from './seoConfig.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE_URL = 'https://koreanstudy.me';

// Generate sitemap.xml
function generateSitemap() {
  const languageRoutes = SUPPORTED_LANGUAGES.flatMap(lang =>
    PUBLIC_ROUTES.map(route => ({
      path: withLang(lang, route),
      changefreq: route === '/' ? 'weekly' : 'monthly',
      priority: route === '/' ? '1.0' : '0.8',
    }))
  );

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${languageRoutes
  .map(
    (route) => `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
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

    // Generate and write sitemap.xml
    const sitemap = generateSitemap();
    writeFileSync(join(publicDir, 'sitemap.xml'), sitemap, 'utf-8');
    console.log('✅ Generated sitemap.xml');

    // Generate and write robots.txt
    const robots = generateRobots();
    writeFileSync(join(publicDir, 'robots.txt'), robots, 'utf-8');
    console.log('✅ Generated robots.txt');

    console.log('\n📊 SEO files generated successfully:');
    console.log(`   - ${PUBLIC_ROUTES.length * SUPPORTED_LANGUAGES.length} routes in sitemap`);
    console.log(`   - Sitemap URL: ${SITE_URL}/sitemap.xml`);
  } catch (error) {
    console.error('❌ Error generating SEO files:', error);
    process.exit(1);
  }
}

main();
