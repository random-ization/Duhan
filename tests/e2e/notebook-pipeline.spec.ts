import { expect, test, type Page } from '@playwright/test';

const langPrefix = '/en';
const e2eEmail = process.env.PW_E2E_EMAIL;
const e2ePassword = process.env.PW_E2E_PASSWORD;

async function loginWithPassword(page: Page) {
  await page.goto(`${langPrefix}/login?redirect=/reading`);

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  const hasLoginForm = await emailInput
    .isVisible({ timeout: 4000 })
    .catch(() => false);

  if (hasLoginForm) {
    await emailInput.fill(e2eEmail!);
    await passwordInput.fill(e2ePassword!);
    await page.locator('button[type="submit"]').first().click();
  }

  await page.waitForURL(
    url => !url.pathname.includes('/login') && !url.pathname.includes('/register'),
    {
      timeout: 30000,
    }
  );
}

test.describe('Notebook pipeline (reading -> note -> notebook -> review)', () => {
  test.skip(!e2eEmail || !e2ePassword, 'Set PW_E2E_EMAIL and PW_E2E_PASSWORD to run this flow.');

  test('creates a reading note and completes notebook search/jump/review actions', async ({ page }) => {
    const marker = `E2E-NOTE-${Date.now()}`;

    await loginWithPassword(page);

    await page.goto(`${langPrefix}/reading`);

    const articleCards = page.locator('button:has(h3)');
    const articleCount = await articleCards.count();
    test.skip(articleCount === 0, 'No reading articles available for this environment.');

    await articleCards.first().click();
    await expect(page).toHaveURL(/\/reading\/[^/?#]+/);

    await page.waitForSelector('p[data-paragraph-index]', { timeout: 15000 });

    const selected = await page.evaluate(() => {
      const paragraph = document.querySelector('p[data-paragraph-index]');
      if (!(paragraph instanceof HTMLElement)) return false;

      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
      let textNode: Text | null = null;
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.textContent && node.textContent.trim().length >= 8) {
          textNode = node as Text;
          break;
        }
      }
      if (!textNode) return false;

      const raw = textNode.textContent || '';
      const start = Math.max(0, raw.search(/\S/));
      const end = Math.min(raw.length, start + 8);
      if (end <= start) return false;

      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, end);

      const selection = window.getSelection();
      if (!selection) return false;
      selection.removeAllRanges();
      selection.addRange(range);

      const rect = range.getBoundingClientRect();
      paragraph.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.bottom,
        })
      );

      return selection.toString().trim().length > 0;
    });

    expect(selected).toBeTruthy();

    const toolbar = page.locator('[data-annotation-toolbar]');
    await expect(toolbar).toBeVisible({ timeout: 10000 });
    await toolbar.getByRole('button', { name: /note/i }).first().click();

    const noteInput = page.getByPlaceholder(/write your understanding/i).first();
    await expect(noteInput).toBeVisible({ timeout: 10000 });
    await noteInput.fill(marker);
    await page.getByRole('button', { name: /^save note$/i }).first().click();

    await page.goto(`${langPrefix}/notebook`);
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible({ timeout: 20000 });

    const searchInput = page.getByPlaceholder('Search title, content, tag...');
    await searchInput.fill(marker);

    await expect(page.getByText(marker).first()).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Add to Today' }).first().click();
    await page.getByRole('button', { name: 'Open Source' }).first().click();

    await expect(page).toHaveURL(/\/reading\/[^/?#]+/);

    await page.goto(`${langPrefix}/notebook`);
    await page.getByRole('button', { name: 'Review' }).click();

    const markReviewedButton = page.getByRole('button', { name: 'Mark Reviewed' }).first();
    await expect(markReviewedButton).toBeVisible({ timeout: 10000 });
    await markReviewedButton.click();
  });
});
