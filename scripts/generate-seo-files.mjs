#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Public routes that should be included in sitemap
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/terms',
  '/privacy',
  '/refund',
  '/forgot-password',
];

const SITE_URL = 'https://koreanstudy.me';

// Generate sitemap.xml
function generateSitemap() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${PUBLIC_ROUTES.map(
  (route) => `  <url>
    <loc>${SITE_URL}${route}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${route === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`
).join('\n')}
</urlset>`;

  return sitemap;
}

// Generate robots.txt
function generateRobots() {
  const robots = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Block authentication and private pages
Disallow: /dashboard
Disallow: /admin
Disallow: /profile
Disallow: /courses
Disallow: /course/
Disallow: /topik
Disallow: /notebook
Disallow: /vocab-book
Disallow: /podcasts
Disallow: /video/
Disallow: /videos
Disallow: /auth
Disallow: /verify-email
Disallow: /reset-password
Disallow: /payment/

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
    console.log(`   - ${PUBLIC_ROUTES.length} routes in sitemap`);
    console.log(`   - Sitemap URL: ${SITE_URL}/sitemap.xml`);
  } catch (error) {
    console.error('❌ Error generating SEO files:', error);
    process.exit(1);
  }
}

main();
