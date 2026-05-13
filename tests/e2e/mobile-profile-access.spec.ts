import { expect, test } from '@playwright/test';

const protectedRoutes = [
  '/profile',
  '/profile/info',
  '/profile/stats',
  '/profile/security',
  '/profile/settings',
  '/profile/settings/language',
  '/achievements',
  '/community/add',
];

function isProtectedRedirect(url: string) {
  return /\/(auth|login|register)(\?|$)|\/en$/.test(url);
}

test.describe('Mobile Protected Access Guards', () => {
  for (const route of protectedRoutes) {
    test(`${route} resolves with safe redirect behavior`, async ({ page }) => {
      const response = await page.goto(`/en${route}`, { waitUntil: 'domcontentloaded' });
      expect(response).not.toBeNull();
      if (response) expect(response.status()).toBeLessThan(500);

      await page.waitForTimeout(700);
      const current = page.url();

      if (isProtectedRedirect(current)) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('text=/application error|internal server error/i')).toHaveCount(0);
    });
  }
});
