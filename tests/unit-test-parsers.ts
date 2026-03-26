/**
 * Unit tests for CSV parsers and duplicate detector.
 * Run with: npx tsx tests/unit-test-parsers.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { detectBroker, parseCSV, parseCSVLine, normalizeDate, normalizeSymbol, normalizeSide, normalizeNumber } from '@/app/utils/csvParsers';
import type { ParseResult, BrokerType } from '@/app/utils/csvParsers';
import { findDuplicateGroups } from '@/app/utils/duplicateDetector';
import type { Trade } from '@/app/types/trade';

// ─── Test harness ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${testName}`);
  } else {
    failed++;
    const msg = detail ? `${testName} -- ${detail}` : testName;
    failures.push(msg);
    console.log(`  FAIL: ${msg}`);
  }
}

function assertEqual<T>(actual: T, expected: T, testName: string) {
  const ok = actual === expected;
  assert(ok, testName, ok ? undefined : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function section(name: string) {
  console.log(`\n=== ${name} ===`);
}

// ─── Helper: parse CSV text using the real parseCSV function ──────────────────

/**
 * Creates a File object from text and calls the real parseCSV().
 * Node.js 20+ supports the File API natively.
 */
async function parseCSVText(text: string): Promise<ParseResult> {
  const file = new File([text], 'test.csv', { type: 'text/csv' });
  return parseCSV(file);
}

// ─── 1. detectBroker tests ──────────────────────────────────────────────────

section('1. detectBroker()');

// Samsung
assertEqual(
  detectBroker('거래일,종목코드,종목명,매매구분,체결수량,체결가격,체결금액,수수료,세금'),
  'samsung',
  'Samsung header detected as samsung'
);

// Hankook
assertEqual(
  detectBroker('주문일,종목코드,종목명,매매구분,체결수량,체결단가,체결금액,수수료,세금'),
  'hankook',
  'Hankook header detected as hankook'
);

// Kiwoom
assertEqual(
  detectBroker('주문번호,주문일자,종목번호,종목명,매매구분,주문수량,체결수량,주문단가,체결단가,체결금액,수수료,세금'),
  'kiwoom',
  'Kiwoom header detected as kiwoom'
);

// Mirae
assertEqual(
  detectBroker('거래일자,종목코드,종목명,거래구분,수량,단가,거래금액,수수료,세금,정산금액'),
  'mirae',
  'Mirae header detected as mirae'
);

// NH
assertEqual(
  detectBroker('거래일자,거래유형,종목코드,종목명,수량,단가,거래금액'),
  'nh',
  'NH header detected as nh'
);

// Collision test: header with 종목코드+매매구분+체결단가 should NOT be kiwoom (should be hankook)
assertEqual(
  detectBroker('종목코드,매매구분,체결단가'),
  'hankook',
  'Collision: 종목코드+매매구분+체결단가 -> hankook (not kiwoom)'
);

// Collision test: header with 거래일+매매구분+체결가격 should be samsung
assertEqual(
  detectBroker('거래일,매매구분,체결가격'),
  'samsung',
  'Collision: 거래일+매매구분+체결가격 -> samsung'
);

// ─── 2-4: Async tests wrapped in main() ─────────────────────────────────────

async function runAsyncTests() {

  // ─── 2. parseSamsung via parseCSV (real File API) ──────────────────────────
  section('2. parseSamsung() via parseCSVText');

  const fixturesDir = path.resolve(__dirname, 'fixtures');
  const samsungText = fs.readFileSync(path.join(fixturesDir, 'samsung-sample.csv'), 'utf-8');
  const samsungResult = await parseCSVText(samsungText);

  assertEqual(samsungResult.broker, 'samsung', 'Samsung: broker detected as samsung');
  assertEqual(samsungResult.trades.length, 12, `Samsung: 12 trades parsed (got ${samsungResult.trades.length})`);

  if (samsungResult.trades.length > 0) {
    const first = samsungResult.trades[0];
    assertEqual(first.date, '2025-01-06', 'Samsung first trade: date=2025-01-06');
    assertEqual(first.symbol, '005930', 'Samsung first trade: symbol=005930');
    assertEqual(first.symbol_name, '삼성전자', 'Samsung first trade: symbol_name=삼성전자');
    assertEqual(first.side, 'BUY', 'Samsung first trade: side=BUY');
    assertEqual(first.price, 71000, 'Samsung first trade: price=71000');
    assertEqual(first.quantity, 15, 'Samsung first trade: quantity=15');

    const last = samsungResult.trades[samsungResult.trades.length - 1];
    assertEqual(last.date, '2025-03-20', 'Samsung last trade: date=2025-03-20');
    assertEqual(last.symbol, '005380', 'Samsung last trade: symbol=005380');
    assertEqual(last.side, 'BUY', 'Samsung last trade: side=BUY');
  }

  // ─── 3. parseHankook via parseCSV (real File API) ──────────────────────────
  section('3. parseHankook() via parseCSVText');

  const hankookText = fs.readFileSync(path.join(fixturesDir, 'hankook-sample.csv'), 'utf-8');
  const hankookResult = await parseCSVText(hankookText);

  assertEqual(hankookResult.broker, 'hankook', 'Hankook: broker detected as hankook');
  assertEqual(hankookResult.trades.length, 12, `Hankook: 12 trades parsed (got ${hankookResult.trades.length})`);

  if (hankookResult.trades.length > 0) {
    const first = hankookResult.trades[0];
    assertEqual(first.date, '2025-01-03', 'Hankook first trade: date=2025-01-03');
    assertEqual(first.symbol, '005930', 'Hankook first trade: symbol=005930');
    assertEqual(first.symbol_name, '삼성전자', 'Hankook first trade: symbol_name=삼성전자');
    assertEqual(first.side, 'BUY', 'Hankook first trade: side=BUY');
    assertEqual(first.price, 72000, 'Hankook first trade: price=72000');
    assertEqual(first.quantity, 12, 'Hankook first trade: quantity=12');
  }
}

runAsyncTests().then(() => {

// ─── 4. findDuplicateGroups tests ───────────────────────────────────────────

section('4. findDuplicateGroups()');

function makeTrade(overrides: Partial<Trade>): Trade {
  return {
    id: `test-${Math.random().toString(36).slice(2, 8)}`,
    date: '2025-01-01',
    symbol: '005930',
    side: 'BUY',
    price: 70000,
    quantity: 10,
    ...overrides,
  };
}

// No duplicates
{
  const trades = [
    makeTrade({ date: '2025-01-01', symbol: '005930', side: 'BUY', price: 70000, quantity: 10 }),
    makeTrade({ date: '2025-01-02', symbol: '005930', side: 'BUY', price: 71000, quantity: 10 }),
    makeTrade({ date: '2025-01-01', symbol: '000660', side: 'BUY', price: 70000, quantity: 10 }),
  ];
  const groups = findDuplicateGroups(trades);
  assertEqual(groups.length, 0, 'No duplicates -> empty array');
}

// 2 trades same date+symbol+side+price+quantity -> 1 group with 2 trades
{
  const trades = [
    makeTrade({ date: '2025-01-01', symbol: '005930', side: 'BUY', price: 70000, quantity: 10 }),
    makeTrade({ date: '2025-01-01', symbol: '005930', side: 'BUY', price: 70000, quantity: 10 }),
  ];
  const groups = findDuplicateGroups(trades);
  assertEqual(groups.length, 1, '2 identical trades -> 1 group');
  assertEqual(groups[0]?.trades.length, 2, '1 group with 2 trades');
}

// 3 trades where 2 are duplicates -> 1 group with 2 trades
{
  const trades = [
    makeTrade({ date: '2025-01-01', symbol: '005930', side: 'BUY', price: 70000, quantity: 10 }),
    makeTrade({ date: '2025-01-01', symbol: '005930', side: 'BUY', price: 70000, quantity: 10 }),
    makeTrade({ date: '2025-01-01', symbol: '005930', side: 'SELL', price: 70000, quantity: 10 }), // different side
  ];
  const groups = findDuplicateGroups(trades);
  assertEqual(groups.length, 1, '3 trades, 2 dups -> 1 group');
  assertEqual(groups[0]?.trades.length, 2, 'group has 2 trades');
}

// Groups sorted by date descending
{
  const trades = [
    makeTrade({ date: '2025-01-01', symbol: '005930', side: 'BUY', price: 70000, quantity: 10 }),
    makeTrade({ date: '2025-01-01', symbol: '005930', side: 'BUY', price: 70000, quantity: 10 }),
    makeTrade({ date: '2025-03-01', symbol: '000660', side: 'SELL', price: 80000, quantity: 5 }),
    makeTrade({ date: '2025-03-01', symbol: '000660', side: 'SELL', price: 80000, quantity: 5 }),
  ];
  const groups = findDuplicateGroups(trades);
  assertEqual(groups.length, 2, '2 duplicate groups');
  assertEqual(groups[0]?.trades[0].date, '2025-03-01', 'First group is later date (descending)');
  assertEqual(groups[1]?.trades[0].date, '2025-01-01', 'Second group is earlier date');
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failures.length > 0) {
  console.log(`\nFailures:`);
  failures.forEach(f => console.log(`  - ${f}`));
}
process.exit(failed > 0 ? 1 : 0);

}); // end runAsyncTests().then()
