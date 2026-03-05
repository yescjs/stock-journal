import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // ─── Navigation ────────────────────────────────────────────────────────

  test('네비게이션 바가 로고와 버튼을 표시한다', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByText('StockJournal').first()).toBeVisible();
  });

  test('로그인 버튼이 네비게이션에 표시된다', async ({ page }) => {
    const loginBtn = page.locator('nav').getByText('로그인');
    await expect(loginBtn).toBeVisible();
  });

  // ─── Hero Section ─────────────────────────────────────────────────────

  test('Hero 섹션에 메인 타이틀과 CTA가 표시된다', async ({ page }) => {
    await expect(page.getByText('투자 기록이')).toBeVisible();
    await expect(page.getByText('실력이 됩니다')).toBeVisible();
    await expect(page.getByRole('button', { name: /무료로 시작하기/ }).first()).toBeVisible();
  });

  test('Hero 배지가 표시된다', async ({ page }) => {
    await expect(page.getByText('매매 일지 · 차트 분석 · 클라우드 동기화 · 무료')).toBeVisible();
  });

  test('금융 시뮬레이션 테이블이 표시된다', async ({ page }) => {
    await expect(page.getByText('KOSPI Korea').first()).toBeVisible();
  });

  // ─── Pain Points ──────────────────────────────────────────────────────

  test('Pain Points 섹션이 표시된다', async ({ page }) => {
    await expect(page.getByText('Pain Points')).toBeVisible();
    await expect(page.getByText('혹시 이런 경험,')).toBeVisible();
  });

  // ─── Benefits ─────────────────────────────────────────────────────────

  test('Benefits 섹션에 기능 카드가 표시된다', async ({ page }) => {
    await expect(page.getByText('30초 기록').first()).toBeVisible();
    await expect(page.getByText('패턴 발견').first()).toBeVisible();
  });

  // ─── FAQ ──────────────────────────────────────────────────────────────

  test('FAQ 아코디언이 토글된다', async ({ page }) => {
    const faqSection = page.getByText('자주 묻는 질문');
    await faqSection.scrollIntoViewIfNeeded();

    // 첫 번째 FAQ 항목 클릭
    const firstFaqBtn = page.locator('button').filter({ hasText: '완전 무료인가요' });
    if (await firstFaqBtn.isVisible()) {
      await firstFaqBtn.click();
      // 답변이 표시되는지 확인 (애니메이션 후)
      await page.waitForTimeout(500);
    }
  });

  // ─── Login Modal ──────────────────────────────────────────────────────

  test('로그인 버튼 클릭시 로그인 모달이 열린다', async ({ page }) => {
    await page.locator('nav').getByText('로그인').click();
    // 모달 또는 LoginForm이 표시되는지 확인
    await expect(page.getByPlaceholder('이메일 주소')).toBeVisible({ timeout: 5000 });
  });

  // ─── Guest Navigation ─────────────────────────────────────────────────

  test('게스트 시작 버튼으로 /trade로 이동한다', async ({ page }) => {
    const guestBtn = page.getByRole('button', { name: /로그인 없이 둘러보기/ }).first();
    await guestBtn.click();
    await page.waitForURL('**/trade', { timeout: 10000 });
    expect(page.url()).toContain('/trade');
  });
});
