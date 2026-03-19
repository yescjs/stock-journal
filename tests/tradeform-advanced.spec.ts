import { test, expect, Page } from '@playwright/test';
import { enterGuestMode } from './helpers';
import { setupMocks } from './mocks';

test.describe('TradeForm 심화 기록 인라인 토글', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await enterGuestMode(page);
    // BottomSheet 열기
    await page.getByRole('button', { name: /새 매매 기록 추가/ }).click();
    await expect(page.getByText('새로운 매매 기록')).toBeVisible({ timeout: 5000 });
  });

  /** BottomSheet 컨테이너 로케이터 (z-[70] 클래스로 구분) */
  function getSheet(page: Page) {
    return page.locator('.fixed.bottom-0').filter({ hasText: '새로운 매매 기록' });
  }

  /** BottomSheet 내부 폼에 AAPL 종목·단가·수량 입력 */
  async function fillTradeForm(page: Page) {
    const sheet = getSheet(page);
    const symbolInput = sheet.getByPlaceholder(/종목명 또는 코드 검색/);
    await symbolInput.fill('AAPL');
    await expect(page.getByText('Apple Inc.').first()).toBeVisible({ timeout: 5000 });
    await page.getByText('Apple Inc.').first().click();
    await sheet.getByTitle('매수/매도 단가').fill('185');
    await sheet.getByTitle('매수/매도 수량').fill('10');
  }

  // ─── AC1: 새 거래 저장 시 모달 없음 ───────────────────────────────────

  test('AC1: 저장하기 클릭 시 TradeChecklist 모달이 뜨지 않는다', async ({ page }) => {
    const sheet = getSheet(page);
    await fillTradeForm(page);
    await sheet.getByRole('button', { name: '기록 저장하기' }).click();

    await page.waitForTimeout(500);
    await expect(page.getByText('매매 전 점검')).not.toBeVisible();
    await expect(page.getByRole('button', { name: '매매 실행' })).not.toBeVisible();
  });

  // ─── AC2: 토글 펼침/접힘 동작 ─────────────────────────────────────────

  test('AC2: 심화 기록 토글 클릭 시 인라인으로 펼쳐진다', async ({ page }) => {
    const sheet = getSheet(page);

    // 초기 상태: 심화 섹션 내용이 보이지 않아야 함
    await expect(sheet.getByText('체크리스트', { exact: true })).not.toBeVisible();

    // 토글 클릭
    await sheet.getByRole('button', { name: '심화 기록 (체크리스트 · 심리태그)' }).click();

    // 펼쳐진 후: 체크리스트와 태그가 보여야 함
    await expect(sheet.getByText('체크리스트', { exact: true })).toBeVisible({ timeout: 3000 });
    await expect(sheet.getByText('진입 심리 태그')).toBeVisible({ timeout: 3000 });

    // 다시 클릭하면 접힘
    await sheet.getByRole('button', { name: '심화 기록 (체크리스트 · 심리태그)' }).click();
    await expect(sheet.getByText('체크리스트', { exact: true })).not.toBeVisible({ timeout: 3000 });
  });

  // ─── AC3: 심화 섹션 내용 확인 ─────────────────────────────────────────

  test('AC3: 심화 섹션에 체크리스트 5항목과 심리태그 6개가 표시된다', async ({ page }) => {
    const sheet = getSheet(page);
    await sheet.getByRole('button', { name: '심화 기록 (체크리스트 · 심리태그)' }).click();
    await expect(sheet.getByText('체크리스트', { exact: true })).toBeVisible({ timeout: 3000 });

    // 체크리스트 5개 항목
    await expect(sheet.getByText('계획된 매매인가요?')).toBeVisible();
    await expect(sheet.getByText('손절 가격을 설정했나요?')).toBeVisible();
    await expect(sheet.getByText('포지션 크기가 적절한가요?')).toBeVisible();
    await expect(sheet.getByText('감정적 매매가 아닌가요?')).toBeVisible();
    await expect(sheet.getByText('매도 시나리오가 있나요?')).toBeVisible();

    // 심리태그 6개
    await expect(sheet.getByRole('button', { name: '📋 계획된 매매' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: '😰 FOMO' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: '😨 공포' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: '🤑 탐욕' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: '😤 복수' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: '⚡ 충동' })).toBeVisible();
  });

  // ─── AC4: 심화 열린 상태에서 emotion_tag 저장 ─────────────────────────

  test('AC4: 심화 섹션에서 FOMO 선택 후 저장 시 emotion_tag가 기록에 저장된다', async ({ page }) => {
    const sheet = getSheet(page);
    await fillTradeForm(page);

    // 심화 섹션 열기 → FOMO 선택
    await sheet.getByRole('button', { name: '심화 기록 (체크리스트 · 심리태그)' }).click();
    await expect(sheet.getByRole('button', { name: '😰 FOMO' })).toBeVisible({ timeout: 3000 });
    await sheet.getByRole('button', { name: '😰 FOMO' }).click();

    // 저장
    await sheet.getByRole('button', { name: '기록 저장하기' }).click();
    await page.waitForTimeout(500);

    // localStorage에서 emotion_tag 확인
    const savedTrades = await page.evaluate(() => {
      const raw = localStorage.getItem('stock-journal-guest-trades-v1');
      return raw ? JSON.parse(raw) : [];
    });

    expect(savedTrades.length).toBeGreaterThan(0);
    const lastTrade = savedTrades[savedTrades.length - 1];
    expect(lastTrade.emotion_tag).toBe('FOMO');
  });

  // ─── AC5: 심화 닫힌 상태에서 emotion_tag undefined ─────────────────────

  test('AC5: 심화 섹션 닫힌 상태에서 저장 시 emotion_tag가 저장되지 않는다', async ({ page }) => {
    const sheet = getSheet(page);
    await fillTradeForm(page);

    // 심화 섹션 열지 않고 바로 저장
    await sheet.getByRole('button', { name: '기록 저장하기' }).click();
    await page.waitForTimeout(500);

    const savedTrades = await page.evaluate(() => {
      const raw = localStorage.getItem('stock-journal-guest-trades-v1');
      return raw ? JSON.parse(raw) : [];
    });

    expect(savedTrades.length).toBeGreaterThan(0);
    const lastTrade = savedTrades[savedTrades.length - 1];
    expect(lastTrade.emotion_tag).toBeUndefined();
  });

  // ─── AC7: 저장 후 심화 섹션 초기화 ────────────────────────────────────

  test('AC7: 저장 완료 후 심화 섹션이 자동으로 접힌 상태로 초기화된다', async ({ page }) => {
    const sheet = getSheet(page);
    await fillTradeForm(page);

    // 심화 섹션 열기
    await sheet.getByRole('button', { name: '심화 기록 (체크리스트 · 심리태그)' }).click();
    await expect(sheet.getByText('체크리스트', { exact: true })).toBeVisible({ timeout: 3000 });

    // 저장
    await sheet.getByRole('button', { name: '기록 저장하기' }).click();
    await page.waitForTimeout(800);

    // 저장 후 심화 섹션이 접혀야 함
    await expect(sheet.getByText('체크리스트', { exact: true })).not.toBeVisible({ timeout: 3000 });
  });

  // ─── 레이아웃: 토글이 저장 버튼 위에 위치 ──────────────────────────────

  test('레이아웃: 심화 기록 토글이 저장 버튼보다 위에 위치한다', async ({ page }) => {
    const sheet = getSheet(page);
    const toggleBtn = sheet.getByRole('button', { name: '심화 기록 (체크리스트 · 심리태그)' });
    const saveBtn = sheet.getByRole('button', { name: '기록 저장하기' });

    // 스크롤이 필요한 경우 뷰포트 안으로 가져온 후 좌표 비교
    await toggleBtn.scrollIntoViewIfNeeded();
    const toggleBox = await toggleBtn.boundingBox();
    const saveBox = await saveBtn.boundingBox();

    expect(toggleBox).not.toBeNull();
    expect(saveBox).not.toBeNull();
    // 토글이 저장 버튼보다 위에 있어야 함 (y 좌표 더 작음)
    expect(toggleBox!.y).toBeLessThan(saveBox!.y);
  });
});
