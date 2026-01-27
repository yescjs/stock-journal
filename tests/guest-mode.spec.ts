import { test, expect } from '@playwright/test';

test.describe('Guest Mode User Flow', () => {
  test('Guest Walkthrough: Onboarding -> CRUD -> Settings', async ({ page }) => {
    await page.goto('/');
    
    const guestButton = page.getByRole('button', { name: '로그인 없이 게스트로 시작하기' });
    
    if (await guestButton.isVisible()) {
      await guestButton.click();
      await page.waitForFunction(() => localStorage.getItem('stock-journal-guest-trades-v1') !== null);
    }
    
    await page.reload();

    await expect(page.getByText('게스트 모드')).toBeVisible({ timeout: 10000 });

    const isMobile = await page.evaluate(() => window.innerWidth < 1024);

    if (isMobile) {
        await page.locator('button.fixed.bottom-6.right-6').click();
    } 

    let symbolInput;
    let priceInput;
    let qtyInput;
    let buyButton;
    let saveButton;

    if (isMobile) {
        const modal = page.locator('.fixed.inset-0');
        symbolInput = modal.getByPlaceholder('종목명 또는 코드 검색 (예: 삼성전자, AAPL)');
        priceInput = modal.locator('input[name="price"]');
        qtyInput = modal.locator('input[name="quantity"]');
        buyButton = modal.getByRole('button', { name: '매수', exact: true });
        saveButton = modal.getByRole('button', { name: '저장하기' });
    } else {
        const sidebar = page.locator('.lg\\:block'); 
        symbolInput = sidebar.getByPlaceholder('종목명 또는 코드 검색 (예: 삼성전자, AAPL)');
        priceInput = sidebar.locator('input[name="price"]');
        qtyInput = sidebar.locator('input[name="quantity"]');
        buyButton = sidebar.getByRole('button', { name: '매수', exact: true });
        saveButton = sidebar.getByRole('button', { name: '저장하기' });
    }

    await symbolInput.fill('삼성전자');
    await page.getByRole('option').first().click();

    await priceInput.fill('70000');
    await qtyInput.fill('10');
    
    await buyButton.click();
    await saveButton.click();

    if (isMobile) {
        const cardView = page.locator('.md\\:hidden');
        await expect(cardView.getByText('삼성전자')).toBeVisible();
        await expect(cardView.getByText('700,000')).toBeVisible();
    } else {
        await expect(page.getByRole('cell', { name: '삼성전자' })).toBeVisible();
        await expect(page.getByRole('cell', { name: '700,000' })).toBeVisible();
    }

    if (isMobile) {
        const editBtn = page.locator('.md\\:hidden').filter({ hasText: '삼성전자' }).getByRole('button', { name: '수정' });
        await editBtn.click();
    } else {
        // Desktop: Find row with '삼성전자', then hover to show actions (opacity-0 group-hover:opacity-100), then click
        // Playwright can click invisible elements if forced, or we hover first.
        const row = page.getByRole('row').filter({ hasText: '삼성전자' });
        await row.hover(); // Trigger group-hover
        await row.getByRole('button').nth(0).click(); // Assuming first button is Edit (Pencil), 2nd is Delete
    }

    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeVisible();
    
    await modal.locator('input[name="price"]').fill('75000');
    await modal.getByRole('button', { name: '수정 완료' }).click();

    if (isMobile) {
         const cardView = page.locator('.md\\:hidden');
         await expect(cardView.getByText('750,000')).toBeVisible();
    } else {
         await expect(page.getByRole('cell', { name: '750,000' })).toBeVisible();
    }

    const settingsTab = page.locator('nav button').last(); 
    await settingsTab.click();

    await expect(page.getByText('환경 설정')).toBeVisible();

    const darkModeToggle = page.locator('header button').filter({ has: page.locator('svg.lucide-moon, svg.lucide-sun') }).first();
    if (await darkModeToggle.isVisible()) {
        await darkModeToggle.click();
        await expect(page.locator('html')).toHaveClass(/dark/);
    }
  });
});
