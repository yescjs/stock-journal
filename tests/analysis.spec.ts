import { test, expect } from '@playwright/test';
import { enterGuestMode, injectGuestTrades } from './helpers';
import { setupMocks } from './mocks';

// 분석 대시보드는 데스크탑 레이아웃에 최적화 (탭 레이블이 sm:inline)
test.describe('Analysis Dashboard', () => {
  test.beforeEach(async ({ page, viewport }) => {
    // 모바일 뷰포트에서는 탭 레이블이 아이콘만 표시되므로 스킵
    test.skip(!!viewport && viewport.width < 640, '데스크탑 전용 테스트');
    await setupMocks(page);
    await enterGuestMode(page);
    await injectGuestTrades(page);
    // 거래가 로드될 때까지 대기 (데스크탑에서는 테이블로 보임)
    await expect(page.getByText('Apple Inc.').first()).toBeVisible({ timeout: 10000 });
  });

  async function switchToAnalysis(page: import('@playwright/test').Page) {
    // 뷰 토글에서 "분석" 버튼 클릭
    await page.getByRole('button', { name: '분석', exact: true }).click();
    await page.waitForTimeout(1000);
  }

  // ─── View Switch ──────────────────────────────────────────────────────

  test('분석 뷰로 전환하면 AI 매매 분석 타이틀이 표시된다', async ({ page }) => {
    await switchToAnalysis(page);
    await expect(page.getByText('AI 매매 분석')).toBeVisible({ timeout: 5000 });
  });

  // ─── Equity Curve ─────────────────────────────────────────────────────

  test('누적 수익 곡선이 표시된다', async ({ page }) => {
    await switchToAnalysis(page);
    await expect(page.getByText('누적 수익 곡선').first()).toBeVisible({ timeout: 10000 });
  });

  test('기간 필터(1M, 3M, ALL)가 표시된다', async ({ page }) => {
    await switchToAnalysis(page);
    // 누적 수익 곡선이 보이면 기간 필터도 있음
    await expect(page.getByText('누적 수익 곡선').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('1M').first()).toBeVisible();
    await expect(page.getByText('3M').first()).toBeVisible();
    await expect(page.getByText('ALL').first()).toBeVisible();
  });

  // ─── Tab Navigation ───────────────────────────────────────────────────

  test('4개 분석 탭이 표시된다', async ({ page }) => {
    await switchToAnalysis(page);
    await expect(page.getByText('누적 수익 곡선').first()).toBeVisible({ timeout: 10000 });
    // 탭 레이블 확인 (desktop에서 span.hidden.sm:inline으로 표시)
    await expect(page.getByText('성과').first()).toBeVisible();
    await expect(page.getByText('차트').first()).toBeVisible();
  });

  test('차트 탭 클릭시 차트 컨텐츠가 전환된다', async ({ page }) => {
    await switchToAnalysis(page);
    await expect(page.getByText('누적 수익 곡선').first()).toBeVisible({ timeout: 10000 });

    // 성과 탭이 기본으로 활성 - 투자 성향 프로필이 보임
    await expect(page.getByText('투자 성향 프로필').first()).toBeVisible({ timeout: 5000 });

    // 차트 탭 클릭
    const chartTab = page.locator('button').filter({ hasText: '차트' }).last();
    await chartTab.click();
    await page.waitForTimeout(500);

    // 차트 탭으로 전환 후 투자 성향 프로필은 안 보여야 함
    await expect(page.getByText('투자 성향 프로필')).not.toBeVisible({ timeout: 3000 });
  });

  test('성과 탭에서 투자 성향 프로필이 표시된다', async ({ page }) => {
    await switchToAnalysis(page);
    await expect(page.getByText('누적 수익 곡선').first()).toBeVisible({ timeout: 10000 });
    // 성과 탭은 기본 활성 탭
    await expect(page.getByText('투자 성향 프로필').first()).toBeVisible({ timeout: 5000 });
  });

  // ─── AI Analysis Tab ──────────────────────────────────────────────────

  test('AI 분석 탭 클릭시 AI 리포트 섹션이 표시된다', async ({ page }) => {
    await switchToAnalysis(page);
    await expect(page.getByText('누적 수익 곡선').first()).toBeVisible({ timeout: 10000 });

    const aiTab = page.locator('button').filter({ hasText: 'AI 분석' }).last();
    await aiTab.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/AI 투자 코치/).first()).toBeVisible({ timeout: 5000 });
  });

  // ─── Trade List Tab ───────────────────────────────────────────────────

  test('거래 목록 탭 클릭시 완결 거래가 표시된다', async ({ page }) => {
    await switchToAnalysis(page);
    await expect(page.getByText('누적 수익 곡선').first()).toBeVisible({ timeout: 10000 });

    const tradeTab = page.locator('button').filter({ hasText: '거래 목록' });
    await tradeTab.click();
    await page.waitForTimeout(500);
    await expect(page.getByText('최근 완결 거래').first()).toBeVisible({ timeout: 5000 });
  });

  // ─── Portfolio Summary ────────────────────────────────────────────────

  test('분석 뷰에서 포트폴리오 요약 카드가 표시된다', async ({ page }) => {
    await switchToAnalysis(page);
    await expect(page.getByText('총 진입 금액').first()).toBeVisible({ timeout: 5000 });
  });

});

// ─── Empty State (별도 그룹 - beforeEach에서 거래 주입 불필요) ──────────────

test.describe('Analysis Dashboard: Empty State', () => {
  test('거래 없이 분석 뷰 진입시 빈 상태 메시지가 표시된다', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 640, '데스크탑 전용 테스트');
    await setupMocks(page);
    await enterGuestMode(page);
    // 거래 주입 없이 바로 분석 뷰로 전환
    await page.getByRole('button', { name: '분석', exact: true }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/분석할 데이터가 부족합니다/).first()).toBeVisible({ timeout: 5000 });
  });
});
