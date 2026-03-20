import { expect, test } from '@playwright/test';

test.describe('Launch Smoke', () => {
  test('login page renders essential fields', async ({ page }) => {
    await page.goto('/en/login');
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(
      page.locator('input[type="password"], input[name="password"]').first()
    ).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('pricing CTA redirects unauthenticated users to auth with return target', async ({
    page,
  }) => {
    await page.goto('/en/pricing/details');

    const cta = page
      .getByRole('button', {
        name: /upgrade to pro|subscribe with discount|get lifetime access|start 7-day free trial/i,
      })
      .first();

    await expect(cta).toBeVisible();
    await cta.click();

    await expect(page).toHaveURL(/\/en\/auth\?redirect=/);
  });
});
