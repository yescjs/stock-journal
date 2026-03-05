import { Page } from '@playwright/test';

// ─── Sample Trade Data ──────────────────────────────────────────────────────

export const SAMPLE_TRADES = [
  {
    id: 'test-trade-1',
    date: '2025-03-01',
    symbol: 'AAPL',
    symbol_name: 'Apple Inc.',
    side: 'BUY' as const,
    price: 178.5,
    quantity: 10,
    emotion_tag: 'PLANNED',
  },
  {
    id: 'test-trade-2',
    date: '2025-03-05',
    symbol: 'AAPL',
    symbol_name: 'Apple Inc.',
    side: 'SELL' as const,
    price: 185.0,
    quantity: 10,
    emotion_tag: 'PLANNED',
  },
  {
    id: 'test-trade-3',
    date: '2025-03-02',
    symbol: '005930',
    symbol_name: '삼성전자',
    side: 'BUY' as const,
    price: 72000,
    quantity: 50,
    emotion_tag: 'FOMO',
  },
];

const GUEST_TRADES_KEY = 'stock-journal-guest-trades-v1';

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Navigate to /trade in guest mode with clean localStorage
 */
export async function enterGuestMode(page: Page) {
  // Clear all storage and navigate
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/trade');
  await page.waitForLoadState('networkidle');
}

/**
 * Inject sample trades into guest localStorage and reload
 */
export async function injectGuestTrades(page: Page, trades = SAMPLE_TRADES) {
  await page.evaluate(
    ({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: GUEST_TRADES_KEY, data: trades }
  );
  await page.reload();
  await page.waitForLoadState('networkidle');
}
