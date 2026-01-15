#!/usr/bin/env node
/**
 * Sitemap Generator for DuHan Korean Learning Platform
 * Generates sitemap.xml from the centralized route configuration
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load route configuration from JSON
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const seoConfigPath = resolve(__dirname, '../src/config/seo.config.json');
const seoConfig = JSON.parse(readFileSync(seoConfigPath, 'utf-8'));

const PUBLIC_ROUTES = seoConfig.routes;
const BASE_URL = seoConfig.baseUrl;
const CURRENT_DATE = new Date().toISOString().split('T')[0];

// Generate sitemap XML
function generateSitemap() {
  const urls = PUBLIC_ROUTES.map((route) => {
    const priority = route.path === '/' ? '1.0' : '0.8';
    const changefreq = route.path === '/' ? 'daily' : 'weekly';

    return `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${CURRENT_DATE}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return sitemap;
}

// Main execution
function main() {
  try {
    const sitemap = generateSitemap();
    const outputPath = resolve(__dirname, '../public/sitemap.xml');

    writeFileSync(outputPath, sitemap, 'utf-8');
    console.log('✅ Sitemap generated successfully at:', outputPath);
    console.log(`📊 Generated ${PUBLIC_ROUTES.length} URLs`);
    console.log(`🌐 Base URL: ${BASE_URL}`);
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

main();
