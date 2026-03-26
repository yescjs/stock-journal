import { test, expect } from '@playwright/test';
import { enterGuestMode } from './helpers';
import { setupMocks } from './mocks';
import path from 'path';

test.describe('Import CSV Extension (PR #41)', () => {
  // Give extra time for dev server cold starts
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await enterGuestMode(page);
  });

  // ─── Test 1: Import Modal — broker guide cards visible ──────────────

  test('Import Modal shows 5 broker guide cards', async ({ page }) => {
    // Open import modal via the "more" dropdown in TradeListView
    await openImportModal(page);

    // Verify all 5 broker guide cards are visible
    await expect(page.getByText('키움증권')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('미래에셋증권')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('NH투자증권')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('삼성증권')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('한국투자증권')).toBeVisible({ timeout: 5000 });

    // Verify guide text renders properly (no raw i18n keys visible)
    await expect(page.locator('text=import.samsungStep2')).not.toBeVisible();
    await expect(page.locator('text=import.hankookStep2')).not.toBeVisible();

    // Verify actual guide text is rendered (Samsung step 2 should mention 계좌)
    await expect(page.getByText('계좌').first()).toBeVisible({ timeout: 5000 });
  });

  // ─── Test 2: Samsung CSV file upload and auto-detection ─────────────

  test('Samsung CSV upload is auto-detected and shows 12 trades', async ({ page }) => {
    await openImportModal(page);

    // Upload samsung-sample.csv via file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.resolve(__dirname, 'fixtures/samsung-sample.csv'));

    // Verify broker detected text
    await expect(page.getByText('삼성증권 파일 인식됨')).toBeVisible({ timeout: 10000 });

    // Verify preview table shows trades — look for trade data in the table
    await expect(page.getByText('삼성전자').first()).toBeVisible({ timeout: 5000 });

    // Verify trade count: 12 trades (check the summary shows 총 12건)
    await expect(page.getByText('총 12건')).toBeVisible({ timeout: 5000 });
  });

  // ─── Test 3: Hankook CSV file upload and auto-detection ─────────────

  test('Hankook CSV upload is auto-detected', async ({ page }) => {
    await openImportModal(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.resolve(__dirname, 'fixtures/hankook-sample.csv'));

    // Verify broker detected text
    await expect(page.getByText('한국투자증권 파일 인식됨')).toBeVisible({ timeout: 10000 });

    // Verify preview table shows trades
    await expect(page.getByText('삼성전자').first()).toBeVisible({ timeout: 5000 });
  });

  // ─── Test 4: i18n — English locale ──────────────────────────────────

  test('English locale shows translated broker names and UI', async ({ page }) => {
    // Navigate to English locale
    await page.goto('/en/trade');
    await page.waitForLoadState('networkidle');

    // Open import modal via "more" dropdown
    await openImportModal(page);

    // Verify English broker names appear
    await expect(page.getByText('Samsung Securities')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Korea Investment & Securities')).toBeVisible({ timeout: 5000 });

  });
});

// ─── Helper: Open Import Modal ──────────────────────────────────────────────

async function openImportModal(page: import('@playwright/test').Page) {
  // The import button is inside the "more" dropdown (MoreHorizontal icon button)
  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Click the "more actions" button (MoreHorizontal icon)
  const moreButton = page.locator('button[title]').filter({ hasText: '' }).locator('svg.lucide-more-horizontal').locator('..');
  // Fallback: find by title attribute
  const moreByTitle = page.locator('button[title="더보기"], button[title="More"], button[title="More actions"]');

  // Try the title-based locator first
  if (await moreByTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
    await moreByTitle.click();
  } else {
    // Fallback: click the MoreHorizontal button
    await moreButton.first().click();
  }

  // Click "가져오기" (ko) or "Import" (en) in the dropdown
  const importButton = page.getByText(/^가져오기$|^Import$/).first();
  await importButton.click();

  // Wait for modal to appear
  await expect(page.getByText(/거래내역 가져오기|Import Trades/).first()).toBeVisible({ timeout: 5000 });
}
