import { test, expect } from '@playwright/test';

test.describe('Layout & Header Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
     // Enable Guest Mode to ensure Main Header is rendered
     await page.addInitScript(() => {
         localStorage.setItem('stock-journal-guest-trades-v1', JSON.stringify([]));
     });
  });

  test('Mobile: Container padding should be optimized for small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); 
    await page.goto('/');
    
    // Wait for main content to avoid loading state issues
    await expect(page.getByText('불러오는 중...')).toBeHidden({ timeout: 15000 });

    const container = page.locator('.max-w-screen-xl');
    await expect(container).toBeVisible();

    const padding = await container.evaluate((el) => {
        return window.getComputedStyle(el).paddingLeft;
    });

    // We expect '12px' (p-3) or '8px' (p-2) for better mobile space. 
    // Currently it is '12px' (p-3).
    expect(['8px', '12px']).toContain(padding); 
  });

  test('Mobile: Header layout adjustments', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); 
    await page.goto('/');

    await expect(page.getByText('불러오는 중...')).toBeHidden({ timeout: 15000 });

    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // We want to verify the navigation bar structure.
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });
});