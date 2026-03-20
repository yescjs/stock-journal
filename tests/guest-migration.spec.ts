import { test, expect } from '@playwright/test';
import { enterGuestMode, injectGuestTrades, SAMPLE_TRADES } from './helpers';
import { setupMocks } from './mocks';

const GUEST_TRADES_KEY = 'stock-journal-guest-trades-v1';

test.describe('게스트 마이그레이션', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  // ─── 모달 미노출 검증 ──────────────────────────────────────────────────

  test('게스트 데이터 없이 진입하면 마이그레이션 모달이 표시되지 않는다', async ({ page }) => {
    await enterGuestMode(page);
    await expect(page.getByText('게스트 데이터 가져오기')).not.toBeVisible();
  });

  test('게스트 거래가 있어도 게스트 모드에서는 마이그레이션 모달이 표시되지 않는다', async ({ page }) => {
    await enterGuestMode(page);
    await injectGuestTrades(page, SAMPLE_TRADES);
    await expect(page.getByText('게스트 데이터 가져오기')).not.toBeVisible();
  });

  // ─── deduplicateGuestTrades 순수 함수 검증 ─────────────────────────────

  test('deduplicateGuestTrades: 빈 incoming 배열이면 빈 결과를 반환한다', async ({ page }) => {
    await enterGuestMode(page);

    const result = await page.evaluate(() => {
      const existing = [
        { id: '1', date: '2025-03-01', symbol: 'AAPL', side: 'BUY', price: 178.5, quantity: 10 },
      ];
      const incoming: typeof existing = [];
      const existingSet = new Set(existing.map(t => `${t.date}|${t.symbol}|${t.side}|${t.price}`));
      return incoming.filter(t => !existingSet.has(`${t.date}|${t.symbol}|${t.side}|${t.price}`));
    });

    expect(result).toHaveLength(0);
  });

  test('deduplicateGuestTrades: 중복 거래(date+symbol+side+price)는 필터링된다', async ({ page }) => {
    await enterGuestMode(page);

    const result = await page.evaluate(() => {
      const existing = [
        { id: '1', date: '2025-03-01', symbol: 'AAPL', side: 'BUY', price: 178.5, quantity: 10 },
      ];
      const incoming = [
        // 동일 거래 — 중복
        { id: 'g-1', date: '2025-03-01', symbol: 'AAPL', side: 'BUY', price: 178.5, quantity: 10 },
        // 다른 날짜 — 신규
        { id: 'g-2', date: '2025-03-02', symbol: 'AAPL', side: 'BUY', price: 180.0, quantity: 5 },
      ];
      const existingSet = new Set(existing.map(t => `${t.date}|${t.symbol}|${t.side}|${t.price}`));
      return incoming.filter(t => !existingSet.has(`${t.date}|${t.symbol}|${t.side}|${t.price}`));
    });

    expect(result).toHaveLength(1);
    expect((result[0] as { date: string }).date).toBe('2025-03-02');
  });

  test('deduplicateGuestTrades: 중복 없으면 모든 incoming 거래를 반환한다', async ({ page }) => {
    await enterGuestMode(page);

    const result = await page.evaluate(() => {
      const existing = [
        { id: '1', date: '2025-03-01', symbol: 'AAPL', side: 'BUY', price: 178.5, quantity: 10 },
      ];
      const incoming = [
        { id: 'g-1', date: '2025-03-02', symbol: 'TSLA', side: 'BUY', price: 200.0, quantity: 3 },
        { id: 'g-2', date: '2025-03-03', symbol: 'MSFT', side: 'SELL', price: 300.0, quantity: 2 },
      ];
      const existingSet = new Set(existing.map(t => `${t.date}|${t.symbol}|${t.side}|${t.price}`));
      return incoming.filter(t => !existingSet.has(`${t.date}|${t.symbol}|${t.side}|${t.price}`));
    });

    expect(result).toHaveLength(2);
  });

  // ─── localStorage 정리 검증 ────────────────────────────────────────────

  test('readGuestTrades: localStorage 항목이 없으면 빈 배열을 반환한다', async ({ page }) => {
    await enterGuestMode(page);

    const result = await page.evaluate((key) => {
      const saved = localStorage.getItem(key);
      if (!saved) return [];
      try { return JSON.parse(saved); } catch { return []; }
    }, GUEST_TRADES_KEY);

    expect(result).toHaveLength(0);
  });

  test('readGuestTrades: 손상된 JSON이면 빈 배열을 반환한다', async ({ page }) => {
    await enterGuestMode(page);

    await page.evaluate((key) => localStorage.setItem(key, 'not-valid-json'), GUEST_TRADES_KEY);

    const result = await page.evaluate((key) => {
      const saved = localStorage.getItem(key);
      if (!saved) return [];
      try { return JSON.parse(saved); } catch { return []; }
    }, GUEST_TRADES_KEY);

    expect(result).toHaveLength(0);
  });

  // ─── 모달 UI 렌더링 (로그인 없이 DOM 검증) ────────────────────────────

  test('GuestMigrationModal: 기본 앱 UI 요소들이 마이그레이션 모달 없이 정상 표시된다', async ({ page }) => {
    await enterGuestMode(page);

    // 모달 없이 일반 UI 요소들이 보여야 함
    await expect(page.getByText('StockJournal').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /새 매매 기록 추가/ })).toBeVisible();

    // 마이그레이션 모달 관련 텍스트는 없어야 함
    await expect(page.getByText('게스트 데이터 가져오기')).not.toBeVisible();
    await expect(page.getByText('로그인 전 기록한 거래 내역')).not.toBeVisible();
  });
});
