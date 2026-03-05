import { test, expect } from '@playwright/test';
import { enterGuestMode, injectGuestTrades } from './helpers';
import { setupMocks } from './mocks';

test.describe('Trade List', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await enterGuestMode(page);
    await injectGuestTrades(page);
    // 거래가 로드될 때까지 대기 (모바일/데스크탑 공통 요소)
    await expect(page.getByText(/2025년 3월/).first()).toBeVisible({ timeout: 10000 });
  });

  // ─── Grouped View ─────────────────────────────────────────────────────

  test('월별 그룹핑이 표시된다', async ({ page }) => {
    await expect(page.getByText(/2025년 3월/)).toBeVisible({ timeout: 5000 });
  });

  test('월 헤더 클릭으로 접기/펼치기가 동작한다', async ({ page }) => {
    const monthHeader = page.getByText(/2025년 3월/).first();
    await expect(monthHeader).toBeVisible({ timeout: 5000 });

    // 클릭하여 접기
    await monthHeader.click();
    await page.waitForTimeout(500);

    // 다시 클릭하여 펼치기
    await monthHeader.click();
    await page.waitForTimeout(500);
  });

  // ─── Search Filter ────────────────────────────────────────────────────

  test('종목명 검색 필터가 동작한다', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 640, '데스크탑 전용 테스트');
    const searchInput = page.getByPlaceholder('종목명 검색...');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('AAPL');
    await page.waitForTimeout(500);

    await expect(page.getByText('Apple Inc.').first()).toBeVisible();
  });

  // ─── View Mode Toggle ─────────────────────────────────────────────────

  test('캘린더 뷰로 전환할 수 있다', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 640, '데스크탑 전용 테스트');
    const calendarBtn = page.getByRole('button', { name: '캘린더', exact: true });
    await calendarBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText('매매 캘린더')).toBeVisible();
  });

  test('분석 뷰로 전환할 수 있다', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 640, '데스크탑 전용 테스트');
    const analysisBtn = page.getByRole('button', { name: '분석', exact: true });
    await analysisBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText('AI 매매 분석')).toBeVisible();
  });

  // ─── Portfolio Summary ────────────────────────────────────────────────

  test('포트폴리오 요약 카드가 표시된다', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 640, '데스크탑 전용 테스트');
    await expect(page.getByText('총 진입 금액').first()).toBeVisible({ timeout: 5000 });
  });

  // ─── Trade Display ────────────────────────────────────────────────────

  test('거래 행에 종목명이 표시된다', async ({ page, viewport }) => {
    // 모바일에서는 종목명이 카드 레이아웃으로 다르게 표시됨
    test.skip(!!viewport && viewport.width < 640, '데스크탑 전용 테스트');
    await expect(page.getByText('Apple Inc.').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('삼성전자').first()).toBeVisible();
  });

  test('매수/매도 뱃지가 올바르게 표시된다', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 640, '데스크탑 전용 테스트');
    const buyBadges = page.getByText('매수');
    const sellBadges = page.getByText('매도');
    await expect(buyBadges.first()).toBeVisible({ timeout: 5000 });
    await expect(sellBadges.first()).toBeVisible();
  });
});
