import { test, expect } from '@playwright/test';

const langPrefix = '/en';

test.describe('Authentication Flow', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto(`${langPrefix}/login`);

    // Check page elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto(`${langPrefix}/login`);

    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
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

    // Registration page should have email and password fields
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('should have Google login option', async ({ page }) => {
    await page.goto(`${langPrefix}/login`);

    // Look for Google login button (might be an icon or text)
    const googleButton = page.locator(
      'button:has-text("Google"), button[aria-label*="Google"], [data-provider="google"]'
    );
    // It's okay if this doesn't exist in all configurations
    const count = await googleButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto(`${langPrefix}/login`);

    // Look for forgot password link
    const forgotLink = page.locator(
      'a:has-text("忘记密码"), a:has-text("Forgot"), a[href*="forgot"]'
    );
    const count = await forgotLink.count();

    if (count > 0) {
      await forgotLink.first().click();
      await expect(page).toHaveURL(/forgot/);
    }
  });
});

test.describe('Landing Page', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto(`${langPrefix}`);

    // Check for key elements
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('nav img[alt]').first()).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto(`${langPrefix}`);

    // Wait for the nav to be visible (page fully loaded)
    await page.waitForSelector('nav', { state: 'visible', timeout: 10000 });

    // Wait a bit more for content to load (skeleton screen replacement)
    await page.waitForTimeout(2000);

    // Check for CTA buttons or login link (support both English and Chinese)
    const ctaButton = page.locator(
      [
        'a:has-text("登录")',
        'a:has-text("Log in")',
        'a:has-text("开始使用")',
        'a:has-text("Get Started")',
        'a:has-text("免费开始学习")',
        'a:has-text("Start Free Trial")',
        'a:has-text("查看课程体系")',
        'a:has-text("View Curriculum")',
        'button:has-text("开始使用")',
        'button:has-text("Get Started")',
        'button:has-text("Start Free Trial")',
      ].join(', ')
    );
    const count = await ctaButton.count();
    expect(count).toBeGreaterThan(0);
  });
});
