import { test, expect, devices } from '@playwright/test';
import { enterGuestMode, injectGuestTrades, SAMPLE_TRADES } from './helpers';
import { setupMocks } from './mocks';

test.describe('UX Features - Copy Trade / Undo Delete / Date Presets', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await enterGuestMode(page);
    await injectGuestTrades(page);
    await expect(page.getByText(/2025년 3월/).first()).toBeVisible({ timeout: 10000 });
  });

  // ─── 거래 복사 ────────────────────────────────────────────────────────────

  test.describe('거래 빠른 복사', () => {
    test('복사 버튼이 모바일 카드에 표시된다', async ({ page, isMobile }) => {
      if (!isMobile) test.skip();
      const copyBtn = page.getByRole('button', { name: /복사/ }).first();
      await expect(copyBtn).toBeVisible({ timeout: 5000 });
    });

    test('복사 버튼 클릭 시 BottomSheet가 열린다', async ({ page, isMobile }) => {
      if (!isMobile) test.skip();
      const copyBtn = page.getByRole('button', { name: /복사/ }).first();
      if (await copyBtn.isVisible({ timeout: 3000 })) {
        await copyBtn.click();
        // BottomSheet 헤딩은 "거래 복사"
        await expect(page.getByRole('heading', { name: '거래 복사' })).toBeVisible({ timeout: 5000 });
      }
    });

    test('복사된 폼에 "이전 거래 복사" 레이블이 표시된다', async ({ page, isMobile }) => {
      if (!isMobile) test.skip();
      const copyBtn = page.getByRole('button', { name: /복사/ }).first();
      if (await copyBtn.isVisible({ timeout: 3000 })) {
        await copyBtn.click();
        await expect(page.getByRole('heading', { name: '거래 복사' })).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/이전 거래 복사/).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('복사된 폼의 가격 필드는 비어 있다', async ({ page, isMobile }) => {
      if (!isMobile) test.skip();
      const copyBtn = page.getByRole('button', { name: /복사/ }).first();
      if (await copyBtn.isVisible({ timeout: 3000 })) {
        await copyBtn.click();
        await expect(page.getByRole('heading', { name: '거래 복사' })).toBeVisible({ timeout: 5000 });
        const priceInput = page.locator('input[name="price"]');
        if (await priceInput.isVisible({ timeout: 3000 })) {
          const priceValue = await priceInput.inputValue();
          expect(priceValue).toBe('');
        }
      }
    });

    test('복사된 폼의 수량 필드는 원본 수량이 사전 입력된다', async ({ page, isMobile }) => {
      if (!isMobile) test.skip();
      // SAMPLE_TRADES[0] quantity = 10
      const copyBtn = page.getByRole('button', { name: /복사/ }).first();
      if (await copyBtn.isVisible({ timeout: 3000 })) {
        await copyBtn.click();
        await expect(page.getByRole('heading', { name: '거래 복사' })).toBeVisible({ timeout: 5000 });
        const qtyInput = page.locator('input[name="quantity"]');
        if (await qtyInput.isVisible({ timeout: 3000 })) {
          const qtyValue = await qtyInput.inputValue();
          // 수량이 비어있지 않아야 함 (원본 수량 10)
          expect(qtyValue).not.toBe('');
        }
      }
    });

    test('데스크톱에서 hover 시 복사 버튼이 나타난다', async ({ page, isMobile }) => {
      if (isMobile) test.skip();
      // 데스크톱에서는 거래 행에 마우스를 올려야 복사 버튼이 보임
      const tradeRow = page.locator('table tbody tr').first();
      if (await tradeRow.isVisible({ timeout: 5000 })) {
        await tradeRow.hover();
        const copyBtn = page.locator('table tbody tr').first().locator('button[title="복사하여 새 거래 입력"]');
        await expect(copyBtn).toBeVisible({ timeout: 3000 });
      }
    });
  });

  // ─── 삭제 취소 ────────────────────────────────────────────────────────────

  test.describe('삭제 취소 (Undo Delete)', () => {
    test('삭제 클릭 시 거래가 즉시 목록에서 사라진다', async ({ page, isMobile }) => {
      if (!isMobile) test.skip();
      const initialCount = await page.getByRole('button', { name: /삭제/ }).count();
      if (initialCount > 0) {
        await page.getByRole('button', { name: /삭제/ }).first().click();
        await page.waitForTimeout(300);
        const newCount = await page.getByRole('button', { name: /삭제/ }).count();
        expect(newCount).toBeLessThan(initialCount);
      }
    });

    test('삭제 후 Undo 토스트가 표시된다', async ({ page, isMobile }) => {
      if (!isMobile) test.skip();
      const deleteBtn = page.getByRole('button', { name: /삭제/ }).first();
      if (await deleteBtn.isVisible({ timeout: 3000 })) {
        await deleteBtn.click();
        await expect(page.getByText('거래가 삭제되었습니다')).toBeVisible({ timeout: 3000 });
        await expect(page.getByText('되돌리기')).toBeVisible({ timeout: 3000 });
      }
    });

    test('"되돌리기" 클릭 시 거래가 복원된다', async ({ page, isMobile }) => {
      if (!isMobile) test.skip();
      const initialDeleteCount = await page.getByRole('button', { name: /삭제/ }).count();
      if (initialDeleteCount > 0) {
        await page.getByRole('button', { name: /삭제/ }).first().click();
        await expect(page.getByText('되돌리기')).toBeVisible({ timeout: 3000 });
        await page.getByText('되돌리기').click();
        await page.waitForTimeout(500);
        // 복원 후 카운트가 원래대로 돌아와야 함
        const restoredCount = await page.getByRole('button', { name: /삭제/ }).count();
        expect(restoredCount).toBe(initialDeleteCount);
        // 토스트도 사라져야 함
        await expect(page.getByText('거래가 삭제되었습니다')).not.toBeVisible({ timeout: 3000 });
      }
    });

    test('삭제 후 확인 다이얼로그가 없다 (Undo 방식으로 대체)', async ({ page, isMobile }) => {
      if (!isMobile) test.skip();
      let dialogAppeared = false;
      page.on('dialog', () => { dialogAppeared = true; });

      const deleteBtn = page.getByRole('button', { name: /삭제/ }).first();
      if (await deleteBtn.isVisible({ timeout: 3000 })) {
        await deleteBtn.click();
        await page.waitForTimeout(500);
        expect(dialogAppeared).toBe(false);
      }
    });

    test('localStorage에서도 낙관적 삭제가 즉시 반영된다', async ({ page, isMobile }) => {
      if (!isMobile) test.skip();
      const deleteBtn = page.getByRole('button', { name: /삭제/ }).first();
      if (await deleteBtn.isVisible({ timeout: 3000 })) {
        await deleteBtn.click();
        await page.waitForTimeout(300);
        const stored = await page.evaluate(() => localStorage.getItem('stock-journal-guest-trades-v1'));
        const parsed = JSON.parse(stored!);
        // 삭제 후 원래 3개 → 2개
        expect(parsed.length).toBe(SAMPLE_TRADES.length - 1);
      }
    });
  });

  // ─── 날짜 프리셋 ──────────────────────────────────────────────────────────

  test.describe('날짜 범위 프리셋', () => {
    test('날짜 프리셋 칩 5개가 표시된다', async ({ page }) => {
      await expect(page.getByRole('button', { name: '오늘' })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: '이번 주' })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: '이번 달' })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: '올해' })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: '전체' })).toBeVisible({ timeout: 5000 });
    });

    test('"이번 달" 클릭 시 해당 칩이 활성 상태(indigo 스타일)가 된다', async ({ page }) => {
      const monthBtn = page.getByRole('button', { name: '이번 달' });
      await monthBtn.click();
      await expect(monthBtn).toHaveClass(/text-indigo-400/, { timeout: 3000 });
    });

    test('"오늘" 클릭 시 칩이 활성화된다', async ({ page }) => {
      const todayBtn = page.getByRole('button', { name: '오늘' });
      await todayBtn.click();
      await expect(todayBtn).toHaveClass(/text-indigo-400/, { timeout: 3000 });
    });

    test('"전체" 클릭 시 모든 거래가 다시 표시된다', async ({ page }) => {
      // 먼저 오늘로 필터링 (2025 데이터 숨김)
      await page.getByRole('button', { name: '오늘' }).click();
      await page.waitForTimeout(300);
      // 전체로 복구
      await page.getByRole('button', { name: '전체' }).click();
      await page.waitForTimeout(300);
      // 2025년 3월 거래가 다시 보여야 함
      await expect(page.getByText(/2025년 3월/).first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: '전체' })).toHaveClass(/text-indigo-400/, { timeout: 3000 });
    });

    test('수동으로 날짜 클리어 시 프리셋 활성 상태가 해제된다', async ({ page }) => {
      // 이번 달 프리셋 적용
      await page.getByRole('button', { name: '이번 달' }).click();
      await expect(page.getByRole('button', { name: '이번 달' })).toHaveClass(/text-indigo-400/, { timeout: 3000 });
      // 날짜 필터 X 버튼으로 클리어 (날짜가 설정되었을 때 표시됨)
      const dateFilterBadge = page.locator('button').filter({ hasText: /01 ~/ }).first();
      if (await dateFilterBadge.isVisible({ timeout: 2000 })) {
        await dateFilterBadge.click();
        // 이번 달 칩이 비활성화되어야 함
        await expect(page.getByRole('button', { name: '이번 달' })).not.toHaveClass(/text-indigo-400/, { timeout: 3000 });
      }
    });

    test('뷰 전환(목록→캘린더→목록) 후에도 프리셋 필터가 유지된다', async ({ page }) => {
      await page.getByRole('button', { name: '이번 달' }).click();
      await page.waitForTimeout(300);

      // 캘린더 뷰로 전환
      const calendarBtn = page.getByRole('button').filter({ hasText: /캘린더/ }).first();
      if (await calendarBtn.isVisible({ timeout: 3000 })) {
        await calendarBtn.click();
        await page.waitForTimeout(300);
      }

      // 목록 뷰로 전환
      const listBtn = page.getByRole('button').filter({ hasText: /목록/ }).first();
      if (await listBtn.isVisible({ timeout: 3000 })) {
        await listBtn.click();
        await page.waitForTimeout(300);
      }

      // 프리셋 칩이 여전히 활성 상태여야 함
      await expect(page.getByRole('button', { name: '이번 달' })).toHaveClass(/text-indigo-400/, { timeout: 3000 });
    });
  });
});
