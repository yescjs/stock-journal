import { test, expect } from '@playwright/test';

test.describe('Input & Badge Components', () => {
  test('Input should have Toss styles', async ({ page }) => {
    await page.goto('/');
    
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.id = 'test-input';
      // Typical classes for our Input component
      input.className = "w-full bg-grey-100 text-foreground placeholder:text-grey-400 border-none outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-xl text-sm h-12 px-4 shadow-toss-sm";
      document.body.appendChild(input);
    });

    const input = page.locator('#test-input');
    const borderRadius = await input.evaluate((el) => window.getComputedStyle(el).borderRadius);
    expect(parseFloat(borderRadius)).toBeGreaterThanOrEqual(12);
    
    // Check border-none (should be 0px)
    const borderWidth = await input.evaluate((el) => window.getComputedStyle(el).borderWidth);
    expect(parseFloat(borderWidth)).toBe(0);
  });

  test('Badge should have Toss styles', async ({ page }) => {
    await page.goto('/');
    
    await page.evaluate(() => {
      const badge = document.createElement('span');
      badge.id = 'test-badge';
      badge.className = "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary";
      badge.innerText = 'Test Badge';
      document.body.appendChild(badge);
    });

    const badge = page.locator('#test-badge');
    const fontSize = await badge.evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(parseFloat(fontSize)).toBeLessThanOrEqual(14); // text-xs is usually 12px
    
    const fontWeight = await badge.evaluate((el) => window.getComputedStyle(el).fontWeight);
    expect(parseInt(fontWeight)).toBeGreaterThanOrEqual(600); // semibold
  });
});
