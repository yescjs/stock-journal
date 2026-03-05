import { Page } from '@playwright/test';

/**
 * Intercept all external API routes with deterministic mock responses.
 * Call this before navigating to pages that trigger API calls.
 */
export async function setupMocks(page: Page) {
  // Stock search
  await page.route('**/api/stock-search*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          { symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
          { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
        ],
      }),
    })
  );

  // Stock price
  await page.route('**/api/stock-price*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ symbol: 'AAPL', price: 182.5, currency: 'USD' }),
    })
  );

  // Exchange rate
  await page.route('**/api/exchange-rate*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ rate: 1350.0, base: 'USD', target: 'KRW' }),
    })
  );

  // AI analysis
  await page.route('**/api/ai-analysis*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        report: '## 주간 AI 분석 리포트\n\n테스트 분석 결과입니다.',
        title: '주간 AI 분석',
        type: 'weekly_report',
      }),
    })
  );

  // Stock chart
  await page.route('**/api/stock-chart*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        symbol: 'AAPL',
        data: Array.from({ length: 30 }, (_, i) => ({
          date: `2025-02-${String(i + 1).padStart(2, '0')}`,
          open: 175 + i * 0.5,
          high: 177 + i * 0.5,
          low: 174 + i * 0.5,
          close: 176 + i * 0.5,
          volume: 50000000 + i * 1000000,
        })),
      }),
    })
  );

  // Coin balance
  await page.route('**/api/coins/balance*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ balance: 100 }),
    })
  );

  // Payment routes
  await page.route('**/api/payment/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  );
}
