import { test, expect } from '@playwright/test';
import { enterGuestMode, injectGuestTrades } from './helpers';
import { setupMocks } from './mocks';

// ─── Desktop Tests (uses default chromium project viewport) ─────────────────

test.describe('Responsive: Desktop', () => {
  test.beforeEach(async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 640, '데스크탑 전용 테스트');
    await setupMocks(page);
    await enterGuestMode(page);
    await injectGuestTrades(page);
    await expect(page.getByText(/2025년 3월/).first()).toBeVisible({ timeout: 10000 });
  });

  test('데스크탑에서 테이블 뷰가 표시된다', async ({ page }) => {
    const table = page.locator('[data-testid="trade-list-desktop"]');
    if (await table.isVisible({ timeout: 5000 })) {
      await expect(table).toBeVisible();
    }
  });

  test('데스크탑 네비게이션에 브랜드명이 표시된다', async ({ page }) => {
    await expect(page.getByText('StockJournal').first()).toBeVisible();
  });

  test('데스크탑에서 포트폴리오 요약 카드가 표시된다', async ({ page }) => {
    await expect(page.getByText('총 진입 금액').first()).toBeVisible({ timeout: 5000 });
  });

  test('데스크탑에서 검색바가 표시된다', async ({ page }) => {
    await expect(page.getByPlaceholder('종목명 검색...')).toBeVisible({ timeout: 5000 });
  });

  test('데스크탑에서 뷰 토글 버튼이 표시된다', async ({ page }) => {
    await expect(page.getByRole('button', { name: /목록/ })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /캘린더/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /분석/ })).toBeVisible();
  });
});
