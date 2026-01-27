import { test, expect } from '@playwright/test';

test.describe('Feature Functional Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('stock-journal-guest-trades-v1', JSON.stringify([]));
    });
    
    await page.goto('/');
    
    await expect(page.getByText('게스트 모드')).toBeVisible({ timeout: 10000 });
  });

  test('Stats Tab Functionality (Empty State)', async ({ page }) => {
    const statsTab = page.locator('nav button').nth(2);
    await statsTab.click();

    // Expect Empty State
    await expect(page.getByText('데이터가 없습니다')).toBeVisible();
    await expect(page.getByText('매매 일지를 작성하면 통계가 표시됩니다.')).toBeVisible();
  });

  test('Diary Tab Functionality', async ({ page }) => {
    const diaryTab = page.locator('nav button').nth(1);
    await diaryTab.click();

    // Expect Calendar View Header
    await expect(page.getByText('시장 복기')).toBeVisible();

    // Check View Toggle (List/Calendar) if exists
    const calendarBtn = page.getByRole('button', { name: '캘린더' });
    if (await calendarBtn.isVisible()) {
        await calendarBtn.click();
        // Verify Calendar rendered (grid)
        await expect(page.locator('.grid').first()).toBeVisible(); 
    }
  });

  test('Trade Filter Functionality', async ({ page }) => {
    const isMobile = await page.evaluate(() => window.innerWidth < 1024);
    
    await page.locator('nav button').first().click();

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
});
