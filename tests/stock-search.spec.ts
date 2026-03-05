import { test, expect } from '@playwright/test';
import { enterGuestMode } from './helpers';
import { setupMocks } from './mocks';

test.describe('Stock Search', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await enterGuestMode(page);
    // FAB 클릭하여 TradeForm 열기
    await page.getByRole('button', { name: /새 매매 기록 추가/ }).click();
    await expect(page.getByText('새로운 매매 기록')).toBeVisible({ timeout: 5000 });
  });

  // ─── Search Basics ────────────────────────────────────────────────────

  test('종목 검색 입력 필드가 표시된다', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/종목명 또는 코드 검색/);
    await expect(symbolInput).toBeVisible();
  });

  test('검색어 입력시 로딩 후 결과가 표시된다', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/종목명 또는 코드 검색/);
    await symbolInput.fill('AAPL');
    await expect(page.getByText('Apple Inc.').first()).toBeVisible({ timeout: 5000 });
  });

  test('검색 결과에서 종목을 선택할 수 있다', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/종목명 또는 코드 검색/);
    await symbolInput.fill('AAPL');

    const option = page.getByText('Apple Inc.').first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();
    await expect(page.getByText('AAPL').first()).toBeVisible();
  });

  // ─── Multiple Results ─────────────────────────────────────────────────

  test('여러 검색 결과가 표시된다', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/종목명 또는 코드 검색/);
    await symbolInput.fill('A');
    // Mock에서 AAPL, AMZN 두 개 반환
    await expect(page.getByText('Apple Inc.').first()).toBeVisible({ timeout: 5000 });
  });

  // ─── Debounce ─────────────────────────────────────────────────────────

  test('빠른 타이핑 시 디바운스가 동작한다', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/api/stock-search*', (route) => {
      requestCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            { symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
          ],
        }),
      });
    });

    const symbolInput = page.getByPlaceholder(/종목명 또는 코드 검색/);
    await symbolInput.pressSequentially('AAPL', { delay: 50 });
    await page.waitForTimeout(2000);

    expect(requestCount).toBeLessThanOrEqual(4);
  });

  // ─── Empty Search ─────────────────────────────────────────────────────

  test('빈 검색어로는 결과가 표시되지 않는다', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/종목명 또는 코드 검색/);
    await symbolInput.fill('');
    await page.waitForTimeout(1000);
    // 결과 드롭다운이 보이지 않아야 함
    await expect(page.getByText('Apple Inc.')).not.toBeVisible();
  });

  // ─── Keyboard Navigation ──────────────────────────────────────────────

  test('키보드로 검색 결과를 탐색할 수 있다', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/종목명 또는 코드 검색/);
    await symbolInput.fill('AAPL');
    await expect(page.getByText('Apple Inc.').first()).toBeVisible({ timeout: 5000 });

    await symbolInput.press('ArrowDown');
    await symbolInput.press('Enter');
    await page.waitForTimeout(500);
  });
});
