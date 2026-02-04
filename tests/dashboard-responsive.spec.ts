import { test, expect } from '@playwright/test';

test.describe('Dashboard Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Enable Guest Mode with Data to render Dashboard
    await page.addInitScript(() => {
        const dummyTrade = {
             id: 't1', date: '2025-01-01', symbol: 'TEST', symbol_name: 'Test Corp',
             side: 'BUY', price: 1000, quantity: 10, tags: [], user_id: 'guest',
             created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        };
        localStorage.setItem('stock-journal-guest-trades-v1', JSON.stringify([dummyTrade]));
    });
  });

  test('Mobile: Key Metrics widgets should stack vertically', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Wait for load
    await expect(page.getByText('불러오는 중...')).toBeHidden({ timeout: 15000 });

    await page.getByRole('button', { name: '통계' }).click();
    
    // Now section-summary should exist because we have data
    const summarySection = page.locator('#section-summary');
    await expect(summarySection).toBeVisible();

    const metricsCard = summarySection.locator('div', { hasText: '핵심 지표' }).first(); 
    await expect(metricsCard).toBeVisible();

    const innerGrid = metricsCard.locator('.grid');
    const items = innerGrid.locator('> div');
    
    // In mobile view (grid-cols-1), item 2 should be below item 1
    const item1 = items.nth(0); // Win Rate
    const item2 = items.nth(1); // Profit Factor
    
    const item1Box = await item1.boundingBox();
    const item2Box = await item2.boundingBox();

    if (!item1Box || !item2Box) throw new Error('Items not found');
    
    // Check vertical stacking
    expect(item2Box.y).toBeGreaterThan(item1Box.y);
  });
});