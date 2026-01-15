#!/usr/bin/env node
/**
 * Sitemap Generator for DuHan Korean Learning Platform
 * Generates sitemap.xml from the centralized route configuration
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import route configuration
const PUBLIC_ROUTES = [
  {
    path: '/',
    title: 'DuHan - Learn Korean Through Real Content',
    description:
      'Master Korean with interactive lessons, TOPIK exam prep, authentic podcasts, and personalized learning. Join thousands of learners achieving fluency.',
    isPublic: true,
  },
  {
    path: '/pricing',
    title: 'Pricing Plans - DuHan Korean Learning',
    description:
      'Choose the perfect plan for your Korean learning journey. Free tier available with premium options for unlimited access to all content and features.',
    isPublic: true,
  },
  {
    path: '/terms',
    title: 'Terms of Service - DuHan',
    description:
      'Read our terms of service to understand your rights and responsibilities when using DuHan Korean learning platform.',
    isPublic: true,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy - DuHan',
    description:
      'Learn how DuHan protects your privacy and handles your personal data. Your privacy is our priority.',
    isPublic: true,
  },
  {
    path: '/refund',
    title: 'Refund Policy - DuHan',
    description:
      'Learn about our refund policy and how we handle subscription cancellations and refund requests.',
    isPublic: true,
  },
];

// Configuration
const BASE_URL = 'https://www.koreanstudy.me';
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
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
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
