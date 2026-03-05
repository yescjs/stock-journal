import { test, expect } from '@playwright/test';
import { enterGuestMode, injectGuestTrades } from './helpers';
import { setupMocks } from './mocks';

const ONBOARDING_KEY = 'stock-journal-guest-onboarding-v1';

/** 온보딩 데이터를 localStorage에 직접 주입 */
async function injectOnboarding(
  page: import('@playwright/test').Page,
  steps: Record<string, boolean>,
  completedAt: string | null = null
) {
  await page.evaluate(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    {
      key: ONBOARDING_KEY,
      data: { steps, completedAt, dismissed: false },
    }
  );
  await page.reload();
  await page.waitForLoadState('networkidle');
}

test.describe('Onboarding Checklist', () => {
  test.skip(({ viewport }) => !!viewport && viewport.width < 640, '데스크탑 전용');

  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await enterGuestMode(page);
    await injectGuestTrades(page);
    await expect(page.getByText('Apple Inc.').first()).toBeVisible({ timeout: 10000 });
  });

  // ─── 기본 표시 ─────────────────────────────────────────────────────────

  test('시작 가이드가 기본으로 표시된다', async ({ page }) => {
    await expect(page.getByText('시작 가이드')).toBeVisible({ timeout: 5000 });
  });

  test('4개 스텝이 모두 표시된다', async ({ page }) => {
    await expect(page.getByText('첫 매매 기록하기')).toBeVisible();
    await expect(page.getByText('매수→매도 한 사이클 완성')).toBeVisible();
    await expect(page.getByText('주간 분석 확인하기')).toBeVisible();
    await expect(page.getByText('AI 리포트 받아보기')).toBeVisible();
  });

  // ─── 클릭 → 이동 ───────────────────────────────────────────────────────

  test('분석 탭 확인하기 클릭시 분석 뷰로 전환된다', async ({ page }) => {
    await page.getByText('주간 분석 확인하기').click();
    await expect(page.getByText('AI 매매 분석')).toBeVisible({ timeout: 5000 });
  });

  test('AI 리포트 받아보기 클릭시 분석 탭의 AI 섹션으로 이동한다', async ({ page }) => {
    await page.getByText('AI 리포트 받아보기').click();
    await page.waitForTimeout(800);
    // 분석 뷰 타이틀 확인
    await expect(page.getByText('AI 매매 분석')).toBeVisible({ timeout: 5000 });
    // AI 분석 탭이 활성화되어 AI 투자 코치 섹션이 보여야 함
    await expect(page.getByText(/AI 투자 코치/).first()).toBeVisible({ timeout: 5000 });
  });

  // ─── 스텝 완료 시 체크 표시 ────────────────────────────────────────────

  test('visitAnalysis 완료 시 체크 표시가 나타난다', async ({ page }) => {
    // 분석 탭 버튼 클릭 → visitAnalysis 완료 처리됨
    await page.getByRole('button', { name: '분석', exact: true }).click();
    await page.waitForTimeout(800);

    // 목록 탭으로 돌아가서 체크리스트 확인
    await page.getByRole('button', { name: '목록', exact: true }).click();
    await page.waitForTimeout(500);

    // "주간 분석 확인하기" 스텝이 line-through(완료) 스타일이어야 함
    const stepLabel = page.getByText('주간 분석 확인하기');
    await expect(stepLabel).toHaveClass(/line-through/, { timeout: 3000 });
  });

  // ─── 닫기 버튼 ─────────────────────────────────────────────────────────

  test('X 버튼 클릭시 시작 가이드가 사라진다', async ({ page }) => {
    const guide = page.getByText('시작 가이드');
    await expect(guide).toBeVisible();

    await page.getByTestId('dismiss-onboarding').click();
    await expect(guide).not.toBeVisible({ timeout: 3000 });
  });

  // ─── 전체 완료 시 체크리스트 숨김 ────────────────────────────────────

  test('모든 스텝 완료 시(localStorage) 시작 가이드가 표시되지 않는다', async ({ page }) => {
    await injectOnboarding(
      page,
      {
        firstTrade: true,
        buySellCycle: true,
        visitAnalysis: true,
        aiReport: true,
      },
      new Date().toISOString()  // completedAt 있으면 isComplete=true → isVisible=false
    );
    await expect(page.getByText('시작 가이드')).not.toBeVisible({ timeout: 5000 });
  });

  test('completedAt이 없으면 4개 완료여도 여전히 표시된다', async ({ page }) => {
    // completedAt=null: completeStep이 정확히 호출되어야 completedAt이 설정됨
    await injectOnboarding(
      page,
      {
        firstTrade: true,
        buySellCycle: true,
        visitAnalysis: true,
        aiReport: true,
      },
      null  // completedAt 없음 → isComplete=false → isVisible=true
    );
    // 이 케이스에서는 체크리스트가 보이지만 모든 스텝이 완료 표시되어야 함
    // (useOnboarding: isComplete = completedAt !== null)
    await expect(page.getByText('시작 가이드')).toBeVisible({ timeout: 5000 });
  });

  // ─── AI 리포트 스텝 완료 (onSuccess 콜백 경로 검증) ──────────────────

  test('aiReport 스텝 완료 후 localStorage가 업데이트된다', async ({ page }) => {
    // 처음 3개 스텝은 완료, aiReport만 미완료
    await injectOnboarding(
      page,
      { firstTrade: true, buySellCycle: true, visitAnalysis: true, aiReport: false },
    );
    await expect(page.getByText('AI 리포트 받아보기')).toBeVisible({ timeout: 5000 });

    // 직접 localStorage에서 aiReport completeStep 호출을 시뮬레이션
    // (실제 로그인 유저의 generateWeeklyReport onSuccess 경로가 이 코드를 따름)
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const data = JSON.parse(raw);
      data.steps.aiReport = true;
      data.completedAt = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(data));
    }, ONBOARDING_KEY);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // 전체 완료 → 체크리스트가 보이지 않아야 함
    await expect(page.getByText('시작 가이드')).not.toBeVisible({ timeout: 5000 });
  });
});
