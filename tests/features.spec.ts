import { test, expect } from '@playwright/test';

test.describe('Feature Functional Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('stock-journal-guest-trades-v1', JSON.stringify([]));
    });
    
    await page.goto('/');
    
    await expect(page.getByText('불러오는 중...')).toBeHidden({ timeout: 15000 });
    await expect(page.getByText('게스트 모드')).toBeVisible({ timeout: 10000 });
  });

  test('Stats Tab Functionality (Empty State)', async ({ page }) => {
    const statsTab = page.getByRole('button', { name: '통계' });
    await statsTab.click();

    await expect(page.getByText('데이터가 없습니다')).toBeVisible();
    await expect(page.getByText('매매 일지를 작성하면 통계가 표시됩니다.')).toBeVisible();
  });

  test('Diary Tab Functionality', async ({ page }) => {
    const diaryTab = page.getByRole('button', { name: '시장복기' });
    await diaryTab.click();
    await expect(page.getByRole('button', { name: '시장복기' })).toHaveClass(/shadow-toss-sm/);
  });

  test('Trade Filter Functionality', async ({ page }) => {
    const isMobile = await page.evaluate(() => window.innerWidth < 1024);
    await page.getByRole('button', { name: '매매일지' }).click();

    if (!isMobile) {
        await expect(page.getByPlaceholder('종목명 검색...')).toBeVisible();
        await expect(page.getByPlaceholder('태그 (쉼표 구분)')).toBeVisible();
        
        await page.getByPlaceholder('종목명 검색...').fill('TestStock');
        await expect(page.getByRole('button', { name: '초기화' })).toBeVisible();
        await page.getByRole('button', { name: '초기화' }).click();
        await expect(page.getByRole('button', { name: '초기화' })).not.toBeVisible();
    } else {
        const filterInput = page.getByPlaceholder('종목명 검색...');
        if (await filterInput.isVisible()) {
             await filterInput.fill('Test');
             await page.getByRole('button', { name: '초기화' }).click();
        }
    }
  });

  test('Dark Mode Toggle', async ({ page }) => {
    const html = page.locator('html');
    const className = await html.getAttribute('class') || '';
    const initialDark = className.includes('dark');

    // Find visible toggle button
    const toggleBtns = page.locator('header button').filter({ has: page.locator('svg.lucide-sun, svg.lucide-moon') });
    
    let clicked = false;
    const count = await toggleBtns.count();
    for (let i = 0; i < count; i++) {
        const btn = toggleBtns.nth(i);
        if (await btn.isVisible()) {
            await btn.click();
            clicked = true;
            break;
        }
    }
    expect(clicked).toBeTruthy();

    // Check class change
    if (initialDark) {
        await expect(html).not.toHaveClass(/dark/);
    } else {
        await expect(html).toHaveClass(/dark/);
    }
  });
});