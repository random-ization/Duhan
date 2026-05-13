import { expect, test } from '@playwright/test';

const langPrefix = '/en';

const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/pricing/details',
];

const appRoutes = [
  '/dashboard',
  '/courses',
  '/course',
  '/course/demo-course',
  '/course/demo-course/reading',
  '/course/demo-course/grammar',
  '/review',
  '/typing',
  '/topik',
  '/topik/history',
  '/topik/demo-exam',
  '/topik/writing/demo-exam',
  '/media',
  '/profile',
  '/profile/settings',
  '/pricing',
  '/pricing/details',
  '/reading',
  '/reading/demo-article',
  '/reading/books/demo-book',
  '/podcasts',
  '/podcasts/channel/demo-channel',
  '/podcasts/player/demo-episode',
  '/videos',
  '/video/demo-video',
  '/notebook',
  '/notebook/review',
  '/vocab-book',
  '/vocab-book/immerse',
  '/vocab-book/listen',
  '/vocab-book/dictation',
  '/vocab-book/spelling',
  '/dictionary',
  '/community',
  '/community/add',
  '/achievements',
  '/vocab/demo-deck',
  '/grammar/demo-deck',
  '/grammar/demo-deck/practice',
];

function isAuthUrl(url: string) {
  return /\/(auth|login|register)(\?|$)/.test(url);
}

test.describe('Mobile Route Matrix', () => {
  for (const route of publicRoutes) {
    test(`public route ${route} should render without server error`, async ({ page }) => {
      const response = await page.goto(`${langPrefix}${route}`, { waitUntil: 'domcontentloaded' });
      expect(response).not.toBeNull();
      if (response) {
        expect(response.status()).toBeLessThan(500);
      }
      await expect(page.locator('body')).toBeVisible();
    });
  }

  for (const route of appRoutes) {
    test(`app route ${route} should resolve or redirect to auth`, async ({ page }) => {
      const response = await page.goto(`${langPrefix}${route}`, { waitUntil: 'domcontentloaded' });
      expect(response).not.toBeNull();
      if (response) {
        expect(response.status()).toBeLessThan(500);
      }

      await page.waitForTimeout(700);
      const currentUrl = page.url();

      if (isAuthUrl(currentUrl)) {
        await expect(page).toHaveURL(/\/(auth|login|register)(\?|$)/);
        return;
      }

      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('text=/application error|internal server error/i')).toHaveCount(0);
    });
  }
});
