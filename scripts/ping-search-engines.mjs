#!/usr/bin/env node

import { buildLocalizedPublicRoutes } from '../src/seo/publicRoutesData.mjs';

const SITE_URL = process.env.SITE_URL || 'https://koreanstudy.me';
const SITEMAP_URL = process.env.SITEMAP_URL || `${SITE_URL}/sitemap.xml`;
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

const endpoints = [
  {
    name: 'Google',
    method: 'GET',
    url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
  },
  {
    name: 'Bing',
    method: 'GET',
    url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
  },
];

function parseIndexNowUrls() {
  const raw = process.env.INDEXNOW_URLS;
  if (raw && raw.trim()) {
    return raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  const routes = buildLocalizedPublicRoutes({ includeNoIndex: false });
  return routes.map((route) => `${SITE_URL}${route.path}`);
}

function getIndexNowPayload() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return null;

  const host = new URL(SITE_URL).hostname;
  const keyLocation =
    process.env.INDEXNOW_KEY_LOCATION || `${SITE_URL}/indexnow-${encodeURIComponent(key)}.txt`;
  const urlList = parseIndexNowUrls();

  return {
    endpoint: process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow',
    body: {
      host,
      key,
      keyLocation,
      urlList,
    },
  };
}

async function requestWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function run() {
  let failureCount = 0;

  console.log(`Sitemap ping target: ${SITEMAP_URL}`);
  for (const endpoint of endpoints) {
    if (dryRun) {
      console.log(`[DRY RUN] ${endpoint.name}: ${endpoint.method} ${endpoint.url}`);
      continue;
    }
    try {
      const response = await requestWithTimeout(endpoint.url, { method: endpoint.method });
      if (!response.ok) {
        failureCount += 1;
        console.error(`✗ ${endpoint.name} ping failed: HTTP ${response.status}`);
      } else {
        console.log(`✓ ${endpoint.name} pinged: HTTP ${response.status}`);
      }
    } catch (error) {
      failureCount += 1;
      console.error(`✗ ${endpoint.name} ping failed: ${error.message}`);
    }
  }

  const indexNow = getIndexNowPayload();
  if (!indexNow) {
    console.log('IndexNow skipped: INDEXNOW_KEY not set.');
  } else if (dryRun) {
    console.log(
      `[DRY RUN] IndexNow: POST ${indexNow.endpoint} (${indexNow.body.urlList.length} urls)`
    );
  } else {
    try {
      const response = await requestWithTimeout(indexNow.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(indexNow.body),
      });
      if (!response.ok) {
        failureCount += 1;
        console.error(`✗ IndexNow failed: HTTP ${response.status}`);
      } else {
        console.log(`✓ IndexNow submitted: HTTP ${response.status}`);
      }
    } catch (error) {
      failureCount += 1;
      console.error(`✗ IndexNow failed: ${error.message}`);
    }
  }

  if (failureCount > 0) {
    process.exit(1);
  }
}

run();
