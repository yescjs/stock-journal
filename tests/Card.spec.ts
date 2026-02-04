import { test, expect } from '@playwright/test';

test.describe('Card Component', () => {
  test('should have Toss Design System card styles', async ({ page }) => {
    await page.goto('/');
    
    await page.evaluate(() => {
      const card = document.createElement('div');
      card.id = 'test-card';
      // Typical classes for our Card component (rounded-3xl)
      card.className = "transition-all duration-200 overflow-hidden flex flex-col bg-card text-card-foreground shadow-toss border border-border/50 rounded-3xl p-6";
      document.body.appendChild(card);
    });

    const card = page.locator('#test-card');
    const borderRadius = await card.evaluate((el) => window.getComputedStyle(el).borderRadius);
    // rounded-3xl is 1.5rem = 24px
    expect(parseFloat(borderRadius)).toBeGreaterThanOrEqual(24);
    
    const boxShadow = await card.evaluate((el) => window.getComputedStyle(el).boxShadow);
    expect(boxShadow).not.toBe('none');
  });
});
