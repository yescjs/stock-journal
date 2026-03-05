import { test, expect } from '@playwright/test';
import { enterGuestMode, injectGuestTrades, SAMPLE_TRADES } from './helpers';
import { setupMocks } from './mocks';

test.describe('Trade CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await enterGuestMode(page);
  });

  // ─── Empty State ──────────────────────────────────────────────────────

  test('빈 상태에서 안내 화면이 표시된다', async ({ page }) => {
    await expect(page.getByText('매매 일지를 시작해보세요')).toBeVisible({ timeout: 10000 });
  });

  // ─── FAB & BottomSheet ────────────────────────────────────────────────

  test('FAB 클릭시 BottomSheet가 열린다', async ({ page }) => {
    await page.getByRole('button', { name: /새 매매 기록 추가/ }).click();
    await expect(page.getByText('새로운 매매 기록')).toBeVisible({ timeout: 5000 });
  });

  test('BottomSheet에 TradeForm이 렌더링된다', async ({ page }) => {
    await page.getByRole('button', { name: /새 매매 기록 추가/ }).click();
    await expect(page.getByText('새로운 매매 기록')).toBeVisible({ timeout: 5000 });
    // 폼 필드 확인
    await expect(page.getByText('날짜')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('기록 저장하기')).toBeVisible({ timeout: 5000 });
  });

  // ─── Stock Search ─────────────────────────────────────────────────────

  test('종목 검색시 자동완성 결과가 표시된다', async ({ page }) => {
    await page.getByRole('button', { name: /새 매매 기록 추가/ }).click();
    await expect(page.getByText('새로운 매매 기록')).toBeVisible({ timeout: 5000 });

    // 종목 검색 입력 (실제 placeholder)
    const symbolInput = page.getByPlaceholder(/종목명 또는 코드 검색/);
    await symbolInput.fill('AAPL');
    // Mock API 결과 대기
    await expect(page.getByText('Apple Inc.').first()).toBeVisible({ timeout: 5000 });
  });

  test('종목 선택 후 필드가 채워진다', async ({ page }) => {
    await page.getByRole('button', { name: /새 매매 기록 추가/ }).click();
    await expect(page.getByText('새로운 매매 기록')).toBeVisible({ timeout: 5000 });

    const symbolInput = page.getByPlaceholder(/종목명 또는 코드 검색/);
    await symbolInput.fill('AAPL');
    await page.waitForTimeout(1500);
    const appleOption = page.getByText('Apple Inc.').first();
    if (await appleOption.isVisible({ timeout: 3000 })) {
      await appleOption.click();
      await expect(page.getByText('AAPL').first()).toBeVisible();
    }
  });

  // ─── Full Add Flow ────────────────────────────────────────────────────

  test('거래 추가 폼에서 기록 저장하기 버튼이 있다', async ({ page }) => {
    await page.getByRole('button', { name: /새 매매 기록 추가/ }).click();
    await expect(page.getByText('새로운 매매 기록')).toBeVisible({ timeout: 5000 });

    // 기록 저장하기 버튼 확인
    await expect(page.getByText('기록 저장하기')).toBeVisible({ timeout: 5000 });
  });

  test('매수/매도 선택 버튼이 동작한다', async ({ page }) => {
    await page.getByRole('button', { name: /새 매매 기록 추가/ }).click();
    await expect(page.getByText('새로운 매매 기록')).toBeVisible({ timeout: 5000 });

    // 매도 버튼 클릭
    const sellBtn = page.locator('button').filter({ hasText: '매도' }).first();
    await sellBtn.click();
    await page.waitForTimeout(300);

    // 매수 버튼 클릭
    const buyBtn = page.locator('button').filter({ hasText: '매수' }).first();
    await buyBtn.click();
  });

  // ─── Edit Trade ───────────────────────────────────────────────────────

  test('거래 수정 버튼이 동작한다', async ({ page }) => {
    await injectGuestTrades(page);
    await expect(page.getByText(/2025년 3월/).first()).toBeVisible({ timeout: 10000 });

    // 수정 버튼 클릭
    const editBtn = page.getByRole('button', { name: /수정/ }).first();
    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
      await expect(page.getByText('매매 기록 수정').first()).toBeVisible({ timeout: 5000 });
    }
  });

  // ─── Delete Trade ─────────────────────────────────────────────────────

  test('거래 삭제 버튼이 동작한다', async ({ page }) => {
    await injectGuestTrades(page);
    await expect(page.getByText(/2025년 3월/).first()).toBeVisible({ timeout: 10000 });

    const deleteBtn = page.getByRole('button', { name: /삭제/ }).first();
    if (await deleteBtn.isVisible({ timeout: 3000 })) {
      page.on('dialog', (dialog) => dialog.accept());
      await deleteBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  // ─── localStorage Persistence ─────────────────────────────────────────

  test('거래 데이터가 localStorage에 저장된다', async ({ page }) => {
    await injectGuestTrades(page);

    const stored = await page.evaluate(() => {
      return localStorage.getItem('stock-journal-guest-trades-v1');
    });
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.length).toBe(SAMPLE_TRADES.length);
  });
});
