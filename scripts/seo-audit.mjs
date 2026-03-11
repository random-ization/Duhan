#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLocalizedPublicRoutes } from '../src/seo/publicRoutesData.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE_URL = 'https://koreanstudy.me';
const args = new Set(process.argv.slice(2));
const failOnWarning = args.has('--fail-on-warning');
const asJson = args.has('--json');

const routes = buildLocalizedPublicRoutes({ includeNoIndex: true });
const findings = [];

const LENGTH_RULES = {
  default: {
    titleMin: 25,
    titleMax: 70,
    descriptionMin: 70,
    descriptionMax: 170,
  },
  zh: {
    titleMin: 10,
    titleMax: 36,
    descriptionMin: 24,
    descriptionMax: 90,
  },
};

function addFinding(level, code, message, routePath = '') {
  findings.push({
    level,
    code,
    routePath,
    message,
  });
}

function normalizeTitle(title) {
  return String(title || '').trim().toLowerCase();
}

const seenTitles = new Map();

for (const route of routes) {
  const title = String(route.meta?.title || '').trim();
  const description = String(route.meta?.description || '').trim();
  const keywords = String(route.meta?.keywords || '').trim();
  const ogImage = String(route.meta?.ogImage || '').trim();
  const titleLength = title.length;
  const descriptionLength = description.length;

  if (!title) addFinding('error', 'MISSING_TITLE', 'Missing title.', route.path);
  if (!description) addFinding('error', 'MISSING_DESCRIPTION', 'Missing description.', route.path);

  if (route.indexable) {
    const rules = LENGTH_RULES[route.lang] || LENGTH_RULES.default;
    if (titleLength < rules.titleMin || titleLength > rules.titleMax) {
      addFinding(
        'warning',
        'TITLE_LENGTH',
        `Title length ${titleLength} outside recommended range ${rules.titleMin}-${rules.titleMax}.`,
        route.path
      );
    }
    if (descriptionLength < rules.descriptionMin || descriptionLength > rules.descriptionMax) {
      addFinding(
        'warning',
        'DESCRIPTION_LENGTH',
        `Description length ${descriptionLength} outside recommended range ${rules.descriptionMin}-${rules.descriptionMax}.`,
        route.path
      );
    }
    if (!keywords) {
      addFinding('warning', 'MISSING_KEYWORDS', 'Indexable route has empty keywords.', route.path);
    }
    if (route.basePath.startsWith('/learn/') && route.basePath !== '/learn' && !ogImage) {
      addFinding(
        'warning',
        'MISSING_OG_IMAGE',
        'Learn guide route is missing dedicated ogImage.',
        route.path
      );
    }
  }

  if (!route.canonicalPath || !String(route.canonicalPath).startsWith('/')) {
    addFinding('error', 'INVALID_CANONICAL', 'Canonical path is missing or invalid.', route.path);
  }
  if (route.indexable && route.canonicalPath !== route.path) {
    addFinding(
      'error',
      'CANONICAL_MISMATCH',
      `Indexable route canonicalPath (${route.canonicalPath}) must equal route path (${route.path}).`,
      route.path
    );
  }

  if (!Array.isArray(route.hreflangLanguages) || route.hreflangLanguages.length === 0) {
    addFinding('error', 'MISSING_HREFLANG', 'Missing hreflang languages.', route.path);
  } else {
    if (route.indexable && !route.hreflangLanguages.includes(route.lang)) {
      addFinding(
        'error',
        'HREFLANG_MISSING_SELF',
        `hreflang list does not include self language ${route.lang}.`,
        route.path
      );
    }
    const unique = new Set(route.hreflangLanguages);
    if (unique.size !== route.hreflangLanguages.length) {
      addFinding('warning', 'HREFLANG_DUPLICATE', 'hreflang contains duplicate entries.', route.path);
    }
  }

  if (route.indexable && route.noIndex) {
    addFinding('error', 'INDEXABLE_NOINDEX', 'Route marked indexable but noIndex=true.', route.path);
  }
  if (!route.indexable && !route.noIndex) {
    addFinding(
      'warning',
      'NONINDEXABLE_INDEX',
      'Route marked non-indexable but noIndex=false.',
      route.path
    );
  }

  if (route.indexable) {
    const titleKey = `${route.lang}:${normalizeTitle(title)}`;
    const existing = seenTitles.get(titleKey);
    if (existing) {
      addFinding(
        'warning',
        'DUPLICATE_TITLE',
        `Duplicate localized title with ${existing}.`,
        route.path
      );
    } else {
      seenTitles.set(titleKey, route.path);
    }
  }
}

const sitemapPath = join(__dirname, '..', 'public', 'sitemap.xml');
if (existsSync(sitemapPath)) {
  const xml = readFileSync(sitemapPath, 'utf-8');
  const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((item) => item[1]);
  const locSet = new Set(locMatches);
  if (locSet.size !== locMatches.length) {
    addFinding('error', 'SITEMAP_DUPLICATE_LOC', 'Sitemap contains duplicate <loc> entries.');
  }

  const indexableRoutes = routes.filter((route) => route.indexable);
  for (const route of indexableRoutes) {
    const fullUrl = `${SITE_URL}${route.path}`;
    if (!locSet.has(fullUrl)) {
      addFinding('error', 'SITEMAP_MISSING_ROUTE', `Missing indexable route in sitemap: ${fullUrl}`);
    }
  }
}

const errorCount = findings.filter((item) => item.level === 'error').length;
const warningCount = findings.filter((item) => item.level === 'warning').length;
const infoCount = findings.filter((item) => item.level === 'info').length;

if (asJson) {
  process.stdout.write(
    `${JSON.stringify(
      {
        summary: {
          routes: routes.length,
          errors: errorCount,
          warnings: warningCount,
          infos: infoCount,
        },
        findings,
      },
      null,
      2
    )}\n`
  );
} else {
  console.log('SEO Audit Summary');
  console.log(`- Routes checked: ${routes.length}`);
  console.log(`- Errors: ${errorCount}`);
  console.log(`- Warnings: ${warningCount}`);
  if (findings.length > 0) {
    console.log('\nFindings');
    for (const finding of findings) {
      const prefix = finding.level.toUpperCase();
      const pathSuffix = finding.routePath ? ` [${finding.routePath}]` : '';
      console.log(`- ${prefix} ${finding.code}${pathSuffix}: ${finding.message}`);
    }
  } else {
    console.log('\nNo findings.');
  }
}

if (errorCount > 0 || (failOnWarning && warningCount > 0)) {
  process.exit(1);
}
