import { test, expect } from '@playwright/test';

test.describe('Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
     await page.addInitScript(() => {
         const trade1 = {
             id: 't1', date: '2025-01-01', symbol: 'PROFIT', symbol_name: 'Profit Corp',
             side: 'BUY', price: 1000, quantity: 10, tags: [], user_id: 'guest'
         };
         const trade2 = {
             id: 't2', date: '2025-01-02', symbol: 'PROFIT', symbol_name: 'Profit Corp',
             side: 'SELL', price: 1200, quantity: 10, tags: [], user_id: 'guest'
         };
         localStorage.setItem('stock-journal-guest-trades-v1', JSON.stringify([trade1, trade2]));
     });
  });

  test('Clicking symbol in Dashboard should navigate to Journal and filter', async ({ page }) => {
    await page.goto('/');
    
    // Wait for auth loading
    await expect(page.getByText('불러오는 중...')).toBeHidden({ timeout: 15000 });

    // Go to Stats/Dashboard tab
    // The tab label is "통계"
    // Use role button with name (matches aria-label or text)
    await page.getByRole('button', { name: '통계' }).click();

    // Verify we are on Dashboard
    await expect(page.getByText('총 실현 손익')).toBeVisible();

    // Find "Profit Corp" in Top Profits and click it
    // Top Profits renders symbol name
    await page.getByText('Profit Corp').first().click();

    // Verify we are back on Journal tab
    // "종목 상세 분석" should be visible in TradeListView header
    await expect(page.getByText('종목 상세 분석')).toBeVisible();
    
    // Verify the symbol badge is visible
    // It renders {selectedSymbol} in a span
    await expect(page.getByText('PROFIT', { exact: true }).first()).toBeVisible();
  });
});