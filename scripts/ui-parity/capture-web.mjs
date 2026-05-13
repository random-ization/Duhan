/* eslint-env browser */
/* eslint-disable no-undef */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUTPUT_DIR = path.join(ROOT, 'docs/reports/ui-parity/web');
const BASE_URL = process.env.UI_PARITY_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const LANG = process.env.UI_PARITY_LANG || 'zh';
const VIEWPORT_WIDTH = Number(process.env.UI_PARITY_VIEWPORT_WIDTH ?? 360);
const VIEWPORT_HEIGHT = Number(process.env.UI_PARITY_VIEWPORT_HEIGHT ?? 800);
const DEVICE_SCALE_FACTOR = Number(process.env.UI_PARITY_DEVICE_SCALE_FACTOR ?? 3);
const CAPTURE_MODE = process.env.UI_PARITY_CAPTURE_MODE || 'viewport';
const routes = (process.env.UI_PARITY_ROUTES
  ? process.env.UI_PARITY_ROUTES.split(',').map((item) => item.trim()).filter(Boolean)
  : [
      '/dashboard',
      '/courses',
      '/review',
      '/topik',
      '/media',
      '/profile',
      '/pricing',
    ]).map((route) => (route.startsWith('/') ? route : `/${route}`));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
  },
  screen: {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
  },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: DEVICE_SCALE_FACTOR,
});
const page = await context.newPage();

await fs.mkdir(OUTPUT_DIR, { recursive: true });

for (const route of routes) {
  const normalized = route.replaceAll('/', '_').replace(/^_/, '') || 'home';
  const targetUrl = `${BASE_URL}/${LANG}${route}`.replace(/\/+/g, '/').replace(':/', '://');
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${normalized}.png`),
    fullPage: CAPTURE_MODE === 'fullPage',
  });
  console.info(`[ui-parity:web] captured ${targetUrl}`);
}

await context.close();
await browser.close();
console.info(`[ui-parity:web] done, output=${OUTPUT_DIR}`);
