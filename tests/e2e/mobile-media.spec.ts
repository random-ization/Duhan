import { expect, test } from '@playwright/test';

const mediaPath = '/en/media';

function hasFatalErrorText(pageText: string) {
  return /application error|internal server error|unexpected application error/i.test(pageText);
}

function isAuthRedirect(url: string) {
  return /\/(auth|login|register)(\?|$)/.test(url);
}

test.describe('Mobile Media Interactions', () => {
  test('media page renders without fatal errors', async ({ page }) => {
    const response = await page.goto(mediaPath, { waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();
    if (response) expect(response.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(hasFatalErrorText(text)).toBeFalsy();
  });

  test('video tab query path resolves', async ({ page }) => {
    await page.goto('/en/media?tab=video');
    await expect(page).toHaveURL(/\/en\/media\?tab=video/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('reading tab query path resolves', async ({ page }) => {
    await page.goto('/en/media?tab=reading');
    await expect(page).toHaveURL(/\/en\/media\?tab=reading/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('podcast base path resolves from tabbed route', async ({ page }) => {
    await page.goto('/en/media?tab=video');
    await page.goto('/en/media');
    await expect(page).toHaveURL(/\/en\/media$/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('podcast search route renders without fatal errors', async ({ page }) => {
    const response = await page.goto('/en/podcasts/search?returnTo=%2Fen%2Fmedia');
    expect(response).not.toBeNull();
    if (response) expect(response.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(hasFatalErrorText(text)).toBeFalsy();
  });

  test('direct reading query opens reading mode without fatal errors', async ({ page }) => {
    const response = await page.goto('/en/media?tab=reading', { waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();
    if (response) expect(response.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(hasFatalErrorText(text)).toBeFalsy();
  });

  test('direct video query opens video mode without fatal errors', async ({ page }) => {
    const response = await page.goto('/en/media?tab=video', { waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();
    if (response) expect(response.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(hasFatalErrorText(text)).toBeFalsy();
  });

  test('tabbed route navigation remains stable across sequential loads', async ({ page }) => {
    await page.goto('/en/media?tab=video');
    await page.goto('/en/media?tab=reading');
    await page.goto('/en/media');
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(hasFatalErrorText(text)).toBeFalsy();
  });
});
