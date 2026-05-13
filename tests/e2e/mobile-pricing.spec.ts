import { expect, test } from '@playwright/test';

const pricingPath = '/en/pricing/details';

test.describe('Mobile Pricing Interactions', () => {
  test('pricing details page renders successfully', async ({ page }) => {
    const response = await page.goto(pricingPath, { waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();
    if (response) expect(response.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('pricing page shows major plan headers', async ({ page }) => {
    await page.goto(pricingPath);
    await expect(page.getByText(/free/i).first()).toBeVisible();
    await expect(page.getByText(/pro/i).first()).toBeVisible();
    await expect(page.getByText(/lifetime/i).first()).toBeVisible();
  });

  test('monthly cycle toggle is clickable', async ({ page }) => {
    await page.goto(pricingPath);
    await page.getByRole('button', { name: /monthly/i }).click();
    await expect(page.locator('body')).toBeVisible();
  });

  test('quarterly cycle toggle is clickable', async ({ page }) => {
    await page.goto(pricingPath);
    await page.getByRole('button', { name: /quarterly/i }).click();
    await expect(page.locator('body')).toBeVisible();
  });

  test('annual cycle toggle is clickable', async ({ page }) => {
    await page.goto(pricingPath);
    await page.getByRole('button', { name: /annual/i }).click();
    await expect(page.locator('body')).toBeVisible();
  });

  test('primary checkout CTA redirects unauthenticated user to auth route', async ({ page }) => {
    await page.goto(pricingPath);
    const cta = page
      .getByRole('button', {
        name: /upgrade to pro|subscribe with discount|get lifetime access|start 7-day free trial/i,
      })
      .first();
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/en\/auth\?redirect=/);
  });

  test('top navigation brand area is visible', async ({ page }) => {
    await page.goto(pricingPath);
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('nav img[alt]').first()).toBeVisible();
  });

  test('FAQ section can be expanded', async ({ page }) => {
    await page.goto(pricingPath);
    const firstFaq = page.locator('details').first();
    await expect(firstFaq).toBeVisible();
    await firstFaq.locator('summary').click();
    await expect(firstFaq).toHaveAttribute('open', '');
  });
});
