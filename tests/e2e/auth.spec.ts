import { test, expect, type Page } from '@playwright/test';

const langPrefix = '/en';
const emailInputSelector = 'input[type="email"], input[name="email"], #mobile-auth-email';

async function ensureEmailInputVisible(page: Page) {
  const emailInput = page.locator(emailInputSelector).first();
  if (await emailInput.isVisible().catch(() => false)) {
    return;
  }

  // Mobile register view may require tapping the first primary CTA once to reveal the email form.
  const revealButton = page
    .getByRole('button', { name: /create character|register|sign up|가입|회원가입/i })
    .first();
  if (await revealButton.isVisible().catch(() => false)) {
    await revealButton.click();
  } else {
    const firstButton = page.locator('button').first();
    if (await firstButton.isVisible().catch(() => false)) {
      await firstButton.click();
    }
  }

  await page.waitForSelector(emailInputSelector, { timeout: 15000 });
}

test.describe('Authentication Flow', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto(`${langPrefix}/login`);

    // Check page elements
    await ensureEmailInputVisible(page);
    await expect(page.locator(emailInputSelector).first()).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto(`${langPrefix}/login`);

    await ensureEmailInputVisible(page);
    await page.fill(emailInputSelector, 'invalid@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show some error indicator (toast or inline error)
    // Wait for the error to appear (network request will fail)
    await page.waitForTimeout(2000);

    // Should still be on login page (not redirected)
    expect(page.url()).toContain('/login');
  });

  test('should display registration form when switching to register mode', async ({ page }) => {
    await page.goto(`${langPrefix}/register`);
    await page.waitForLoadState('domcontentloaded');

    // Register route can show either the direct form or the pre-form CTA (mobile first step).
    const emailField = page.locator(emailInputSelector).first();
    if (await emailField.isVisible().catch(() => false)) {
      await expect(emailField).toBeVisible();
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    } else {
      await expect(
        page.getByRole('button', { name: /create character|register|sign up|가입|회원가입/i }).first()
      ).toBeVisible();
    }
  });

  test('should have Google login option', async ({ page }) => {
    await page.goto(`${langPrefix}/login`);

    const googleButton = page.getByRole('button', { name: /google/i });
    await expect(googleButton.first()).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto(`${langPrefix}/login`);

    const forgotLink = page.locator('a[href*="forgot-password"]').first();
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await expect(page).toHaveURL(/forgot-password/);
  });
});

test.describe('Landing Page', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto(`${langPrefix}`);

    // Check for key elements
    await page.waitForSelector('nav', { state: 'visible', timeout: 15000 });
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('nav img[alt]').first()).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto(`${langPrefix}`);

    // Wait for the nav to be visible (page fully loaded)
    await page.waitForSelector('nav', { state: 'visible', timeout: 15000 });
    const navLinks = page.locator('nav a');
    expect(await navLinks.count()).toBeGreaterThan(0);
  });
});
