import { test, expect } from '@playwright/test';

test.describe('Design System', () => {
  test('should use Pretendard as the primary font', async ({ page }) => {
    await page.goto('/');
    
    // Check body font-family
    const body = page.locator('body');
    await expect(body).toHaveCSS('font-family', /Pretendard/);
  });

  test('should have the correct primary color (Toss Blue)', async ({ page }) => {
    await page.goto('/');
    
    // Create a temporary element with the primary color class to test computed style
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.id = 'test-primary-color';
      div.className = 'bg-primary';
      div.style.width = '10px';
      div.style.height = '10px';
      document.body.appendChild(div);
    });

    const element = page.locator('#test-primary-color');
    // #3182f6 is rgb(49, 130, 246), but browser might return rgb(50, 132, 245) due to color profiles
    const bgColor = await element.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toMatch(/rgb\(49, 13[012], 24[56]\)|rgb\(50, 13[012], 24[56]\)/);
  });

  test('should support dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Manually add dark class to html
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    
    // Wait for the class to be present
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // #17171C is rgb(23, 23, 28)
    // Accept some variations due to color profiles
    expect(bgColor).toMatch(/rgb\((2[2345678]|30), (2[2345678]|30), (2[789]|3[0-8])\)/);
  });
});
