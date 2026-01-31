#!/usr/bin/env node

/**
 * Simple SSG Pre-renderer for Public Routes
 * 
 * This script generates static HTML files for public routes by:
 * 1. Reading the built index.html
 * 2. Injecting route-specific meta tags
 * 3. Creating separate HTML files for each public route
 * 
 * This provides SEO benefits without requiring framework migration or complex SSR setup.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  PUBLIC_ROUTES,
  withLang,
} from '../src/seo/publicRoutesData.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE_URL = 'https://koreanstudy.me';
const DIST_DIR = join(__dirname, '..', 'dist');

// Escape special regex characters and HTML entities
function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Helper to replace meta tag content
function replaceMetaContent(html, pattern, replacement) {
  const regex = new RegExp(pattern, 'i');
  if (regex.test(html)) {
    return html.replace(regex, replacement);
  }
  return html;
}

/**
 * Inject route-specific meta tags into HTML
 */
function injectMetaTags(html, route) {
  const { title, description, keywords } = route.meta;
  const canonicalUrl = `${SITE_URL}${route.path}`;
  const hreflangLinks = (() => {
    const pathWithoutLang = route.path
      .replace(/^\/(en|zh|vi|mn)(\/|$)/, '/')
      .replace(/\/+$/, '') || '/';

    const alternates = SUPPORTED_LANGUAGES.map((lng) => {
      const href = `${SITE_URL}/${lng}${pathWithoutLang === '/' ? '' : pathWithoutLang}`;
      return `<link rel="alternate" hrefLang="${lng}" href="${href}" />`;
    }).join('\n');

    const xDefaultHref = `${SITE_URL}/${DEFAULT_LANGUAGE}${pathWithoutLang === '/' ? '' : pathWithoutLang}`;
    return `${alternates}\n<link rel="alternate" hrefLang="x-default" href="${xDefaultHref}" />`;
  })();

  // Replace title
  html = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(title)}</title>`
  );

  // Replace meta description
  html = replaceMetaContent(
    html,
    String.raw`<meta\s+name="description"\s+content="[^"]*"\s*/?\s*>`,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );

  // Replace meta keywords
  if (keywords) {
    html = replaceMetaContent(
      html,
      String.raw`<meta\s+name="keywords"\s+content="[^"]*"\s*/?\s*>`,
      `<meta name="keywords" content="${escapeHtml(keywords)}" />`
    );
  }

  // Replace canonical URL
  html = replaceMetaContent(
    html,
    String.raw`<link\s+rel="canonical"\s+href="[^"]*"\s*/?\s*>`,
    `<link rel="canonical" href="${canonicalUrl}" />\n${hreflangLinks}`
  );

  // Replace Open Graph tags
  html = replaceMetaContent(
    html,
    String.raw`<meta\s+property="og:url"\s+content="[^"]*"\s*/?\s*>`,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );

  html = replaceMetaContent(
    html,
    String.raw`<meta\s+property="og:title"\s+content="[^"]*"\s*/?\s*>`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`
  );

  html = replaceMetaContent(
    html,
    String.raw`<meta\s+property="og:description"\s+content="[^"]*"\s*/?\s*>`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );

  // Replace Twitter Card tags
  html = replaceMetaContent(
    html,
    String.raw`<meta\s+property="twitter:url"\s+content="[^"]*"\s*/?\s*>`,
    `<meta property="twitter:url" content="${canonicalUrl}" />`
  );

  html = replaceMetaContent(
    html,
    String.raw`<meta\s+property="twitter:title"\s+content="[^"]*"\s*/?\s*>`,
    `<meta property="twitter:title" content="${escapeHtml(title)}" />`
  );

  html = replaceMetaContent(
    html,
    String.raw`<meta\s+property="twitter:description"\s+content="[^"]*"\s*/?\s*>`,
    `<meta property="twitter:description" content="${escapeHtml(description)}" />`
  );

  if (route.noIndex) {
    const noIndexTag = '<meta name="robots" content="noindex, nofollow" />';
    if (/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i.test(html)) {
      html = replaceMetaContent(
        html,
        String.raw`<meta\s+name="robots"\s+content="[^"]*"\s*/?\s*>`,
        noIndexTag
      );
    } else {
      html = html.replace(/<\/head>/i, `${noIndexTag}\n</head>`);
    }
  }

  return html;
}

/**
 * Main pre-rendering function
 */
function preRenderRoutes() {
  console.log('🚀 Starting SSG pre-rendering for public routes...\n');

  const indexPath = join(DIST_DIR, 'index.html');

  if (!existsSync(indexPath)) {
    console.error('❌ Error: dist/index.html not found. Please run build first.');
    process.exit(1);
  }

  const baseHtml = readFileSync(indexPath, 'utf-8');
  let successCount = 0;

  const routesToRender = SUPPORTED_LANGUAGES.flatMap(lang =>
    PUBLIC_ROUTES.map(route => ({
      ...route,
      path: withLang(lang, route.path),
    }))
  );

  for (const route of routesToRender) {
    try {
      console.log(`📄 Pre-rendering: ${route.path}`);

      // Inject meta tags for this route
      const html = injectMetaTags(baseHtml, route);

      // Determine output path
      const routePath = route.path.slice(1); // Remove leading slash
      const routeDir = join(DIST_DIR, routePath);
      mkdirSync(routeDir, { recursive: true });
      const outputPath = join(routeDir, 'index.html');

      // Write the pre-rendered HTML
      writeFileSync(outputPath, html, 'utf-8');
      console.log(`   ✅ Generated: ${outputPath.replace(DIST_DIR, 'dist')}\n`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error rendering ${route.path}:`, error.message);
      console.error('');
    }
  }

  console.log('\n📊 Pre-rendering Summary:');
  console.log(`   ✅ Successfully pre-rendered: ${successCount}/${routesToRender.length} routes`);
  console.log('\n✨ SSG pre-rendering complete!');
}

// Run pre-rendering
preRenderRoutes();
