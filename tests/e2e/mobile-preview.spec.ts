import { expect, test } from '@playwright/test';

const langPrefix = '/en';

test.describe('Mobile Preview UI', () => {
  test('should load preview page', async ({ page }, testInfo) => {
    await page.goto(`${langPrefix}/preview/mobile`);
    await expect(page).toHaveURL(/\/preview\/mobile/);

    await page.waitForSelector('text=DuHan', { timeout: 15000 });
    await expect(page.getByText('DuHan')).toBeVisible();
    await expect(page.getByPlaceholder('搜索课程、视频、播客…')).toBeVisible();

    const bottomNav = page.getByRole('navigation');
    if (testInfo.project.name.toLowerCase().includes('mobile')) {
      await expect(bottomNav).toBeVisible();
    } else {
      await expect(bottomNav).toBeHidden();
    }
  });

  test('should open and close sheet', async ({ page }, testInfo) => {
    await page.goto(`${langPrefix}/preview/mobile`);
    await expect(page).toHaveURL(/\/preview\/mobile/);

    const dialog = page.getByRole('dialog');

    await page.getByRole('button', { name: 'Open panel' }).click();
    await expect(dialog).toHaveClass(/translate-y-0/);

    await page.getByRole('button', { name: 'Close panel' }).click();
    await expect(dialog).toHaveClass(/translate-y-\[105%\]/);

    if (!testInfo.project.name.toLowerCase().includes('mobile')) {
      await expect(page.getByRole('navigation')).toBeHidden();
    }
  });

  test('should switch bottom tab active state', async ({ page }, testInfo) => {
    await page.goto(`${langPrefix}/preview/mobile`);

    if (testInfo.project.name.toLowerCase().includes('mobile')) {
      const tab = page.getByRole('button', { name: '课程' });
      await tab.click();
      await expect(tab).toHaveClass(/outline/);
    } else {
      await expect(page.getByRole('navigation')).toBeHidden();
    }
  });
});
