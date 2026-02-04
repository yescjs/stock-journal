import { test, expect } from '@playwright/test';

test.describe('Trade List Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
     await page.addInitScript(() => {
         const longTrade = {
             id: 'test-1',
             date: '2025-01-01',
             symbol: 'LONGTEST',
             symbol_name: 'Very Long Stock Name That Should Be Truncated Or Wrapped Corporation',
             side: 'BUY',
             price: 1000,
             quantity: 10,
             images: [],
             tags: ['StrategyA', 'HighRisk'],
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString(),
             user_id: 'guest',
             strategy_name: 'TestStrategy'
         };
         localStorage.setItem('stock-journal-guest-trades-v1', JSON.stringify([longTrade]));
     });
  });

  test('Mobile: Should show card view and hide table', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.getByText('불러오는 중...')).toBeHidden({ timeout: 15000 });

    // Check visibility
    await expect(page.getByTestId('trade-list-mobile')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('trade-list-desktop')).toBeHidden();

    // Verify card content
    const card = page.getByTestId('trade-list-mobile');
    // It renders symbol_name if present
    await expect(card.getByText('Very Long Stock Name')).toBeVisible();
    await expect(card.getByText('10,000')).toBeVisible(); 
  });

  test('Desktop: Should show table and hide card view', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');

    await expect(page.getByText('불러오는 중...')).toBeHidden({ timeout: 15000 });

    // Check visibility
    await expect(page.getByTestId('trade-list-desktop')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('trade-list-mobile')).toBeHidden();
  });

  test('Mobile: Long stock name should truncate', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.getByText('불러오는 중...')).toBeHidden({ timeout: 15000 });

    const card = page.getByTestId('trade-list-mobile');
    const nameElement = card.getByText('Very Long Stock Name').first();
    await expect(nameElement).toBeVisible({ timeout: 10000 });
    
    // Check class for truncation
    await expect(nameElement).toHaveClass(/truncate/);
  });
});