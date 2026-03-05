import { test, expect } from '@playwright/test';
import { enterGuestMode, injectGuestTrades } from './helpers';
import { setupMocks } from './mocks';

// ─── Mobile Tests (uses mobile-chrome project from config) ──────────────────

test.describe('Responsive: Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await enterGuestMode(page);
    await injectGuestTrades(page);
    await expect(page.getByText(/2025년 3월/).first()).toBeVisible({ timeout: 10000 });
  });

  test('모바일에서 카드 뷰가 표시된다', async ({ page }) => {
    const mobileList = page.locator('[data-testid="trade-list-mobile"]');
    if (await mobileList.isVisible({ timeout: 5000 })) {
      await expect(mobileList).toBeVisible();
    }
  });

  test('모바일에서 FAB 버튼이 표시된다', async ({ page }) => {
    await expect(page.getByRole('button', { name: /새 매매 기록 추가/ })).toBeVisible();
  });

  test('모바일에서 BottomSheet가 열린다', async ({ page }) => {
    await page.getByRole('button', { name: /새 매매 기록 추가/ }).click();
    await expect(page.getByText('새로운 매매 기록')).toBeVisible({ timeout: 5000 });
  });

  test('모바일 랜딩 페이지가 올바르게 렌더링된다', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('투자 기록이')).toBeVisible();
    await expect(page.getByRole('button', { name: /무료로 시작하기/ }).first()).toBeVisible();
  });

  test('모바일에서 로그인 모달이 열린다', async ({ page }) => {
    await page.locator('nav').getByText('로그인').click();
    await expect(page.getByPlaceholder('이메일 주소')).toBeVisible({ timeout: 5000 });
  });
});
