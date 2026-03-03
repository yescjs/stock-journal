// Core trade analysis utility functions (pure, no side effects)
// Provides FIFO matching, statistics calculation, and insight generation

import { Trade } from '@/app/types/trade';
import { isKRWSymbol } from '@/app/utils/format';
import {
  RoundTrip,
  PatternStats,
  TradingStyle,
  PerformanceGrade,
  RiskLevel,
  ConcentrationItem,
  StreakInfo,
  UserProfile,
  InsightItem,
  TradeAnalysis,
  AdvancedMetrics,
  BehaviorBiasScore,
  TimingMetrics,
  MonthlyStats,
  EquityCurvePoint,
  HOLDING_PERIOD_LABELS,
  WEEKDAY_LABELS,
  EMOTION_LABELS,
  TRADING_STYLE_LABELS,
  RISK_LEVEL_LABELS,
} from '@/app/types/analysis';

// ─── FIFO Round Trip Matching ────────────────────────────────────────────

/**
 * Match BUY/SELL trades using FIFO (First-In-First-Out) to create completed round trips.
 * Each round trip represents a complete trade cycle (entry → exit).
 */
export function matchRoundTrips(trades: Trade[]): RoundTrip[] {
  // Group trades by symbol, sorted by date ascending
  const bySymbol = new Map<string, Trade[]>();
  for (const t of trades) {
    const list = bySymbol.get(t.symbol) ?? [];
    list.push(t);
    bySymbol.set(t.symbol, list);
  }

  const roundTrips: RoundTrip[] = [];

  for (const [symbol, symbolTrades] of bySymbol) {
    // Sort by date ascending for FIFO
    const sorted = [...symbolTrades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Queue of unmatched buys: { price, remainingQty, date, emotionTag, strategyName }
    const buyQueue: {
      price: number;
      qty: number;
      date: string;
      emotionTag?: string;
      strategyName?: string;
      symbolName?: string;
    }[] = [];

    for (const trade of sorted) {
      if (trade.side === 'BUY') {
        buyQueue.push({
          price: trade.price,
          qty: trade.quantity,
          date: trade.date,
          emotionTag: trade.emotion_tag,
          strategyName: trade.strategy_name,
          symbolName: trade.symbol_name,
        });
      } else {
        // SELL: match against oldest buys (FIFO)
        let remainingSellQty = trade.quantity;

        while (remainingSellQty > 0 && buyQueue.length > 0) {
          const oldestBuy = buyQueue[0];
          const matchQty = Math.min(remainingSellQty, oldestBuy.qty);

          const entryDate = new Date(oldestBuy.date);
          const exitDate = new Date(trade.date);
          const holdingDays = Math.max(
            0,
            Math.round((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
          );

          const pnl = (trade.price - oldestBuy.price) * matchQty;
          const pnlPercent = oldestBuy.price > 0
            ? ((trade.price - oldestBuy.price) / oldestBuy.price) * 100
            : 0;

          roundTrips.push({
            symbol,
            symbolName: oldestBuy.symbolName || trade.symbol_name,
            entryDate: oldestBuy.date,
            exitDate: trade.date,
            entryPrice: oldestBuy.price,
            exitPrice: trade.price,
            quantity: matchQty,
            holdingDays,
            pnl,
            pnlPercent,
            emotionTag: oldestBuy.emotionTag,
            strategyName: oldestBuy.strategyName,
            entryWeekday: entryDate.getDay(),
            exitWeekday: exitDate.getDay(),
            isWin: pnl > 0,
            currency: isKRWSymbol(symbol) ? 'KRW' : 'USD',
          });

          oldestBuy.qty -= matchQty;
          remainingSellQty -= matchQty;

          if (oldestBuy.qty <= 0) {
            buyQueue.shift();
          }
        }
      }
    }
  }

  // Sort by exit date descending (most recent first)
  return roundTrips.sort(
    (a, b) => new Date(b.exitDate).getTime() - new Date(a.exitDate).getTime()
  );
}

// ─── Statistics Calculators ──────────────────────────────────────────────

function buildPatternStats(label: string, trips: RoundTrip[]): PatternStats {
  if (trips.length === 0) {
    return { label, count: 0, wins: 0, losses: 0, winRate: 0, avgReturn: 0, totalPnl: 0, bestReturn: 0, worstReturn: 0 };
  }

  const wins = trips.filter(t => t.isWin).length;
  const losses = trips.length - wins;
  const returns = trips.map(t => t.pnlPercent);

  const currencySet = new Set(trips.map(t => t.currency));
  const currency: PatternStats['currency'] =
    currencySet.size === 1
      ? (currencySet.has('KRW') ? 'KRW' : 'USD')
      : 'mixed';

  return {
    label,
    count: trips.length,
    wins,
    losses,
    winRate: (wins / trips.length) * 100,
    avgReturn: returns.reduce((sum, r) => sum + r, 0) / returns.length,
    totalPnl: trips.reduce((sum, t) => sum + t.pnl, 0),
    bestReturn: Math.max(...returns),
    worstReturn: Math.min(...returns),
    currency,
  };
}

/** Calculate stats grouped by entry weekday */
export function calcWeekdayStats(roundTrips: RoundTrip[]): PatternStats[] {
  // Only include trading days (Mon-Fri, indices 1-5)
  return [1, 2, 3, 4, 5].map(day => {
    const dayTrips = roundTrips.filter(t => t.entryWeekday === day);
    return buildPatternStats(`${WEEKDAY_LABELS[day]}요일`, dayTrips);
  });
}

/** Calculate stats grouped by holding period category */
export function calcHoldingPeriodStats(roundTrips: RoundTrip[]): PatternStats[] {
  return Object.entries(HOLDING_PERIOD_LABELS).map(([, config]) => {
    const filtered = roundTrips.filter(
      t => t.holdingDays >= config.minDays && t.holdingDays <= config.maxDays
    );
    return buildPatternStats(config.label, filtered);
  });
}

/** Calculate stats grouped by emotion tag */
export function calcEmotionStats(roundTrips: RoundTrip[]): PatternStats[] {
  const tagSet = new Set<string>();
  for (const t of roundTrips) {
    if (t.emotionTag) tagSet.add(t.emotionTag);
  }

  // Include "미설정" for trades without emotion tag
  const noTagTrips = roundTrips.filter(t => !t.emotionTag);
  const stats: PatternStats[] = [];

  if (noTagTrips.length > 0) {
    stats.push(buildPatternStats('미설정', noTagTrips));
  }

  for (const tag of tagSet) {
    const filtered = roundTrips.filter(t => t.emotionTag === tag);
    const label = EMOTION_LABELS[tag] || tag;
    stats.push(buildPatternStats(label, filtered));
  }

  return stats.sort((a, b) => b.count - a.count);
}

/** Calculate stats grouped by strategy */
export function calcStrategyStats(roundTrips: RoundTrip[]): PatternStats[] {
  const strategySet = new Set<string>();
  for (const t of roundTrips) {
    if (t.strategyName) strategySet.add(t.strategyName);
  }

  const noStratTrips = roundTrips.filter(t => !t.strategyName);
  const stats: PatternStats[] = [];

  if (noStratTrips.length > 0) {
    stats.push(buildPatternStats('전략 미설정', noStratTrips));
  }

  for (const strat of strategySet) {
    const filtered = roundTrips.filter(t => t.strategyName === strat);
    stats.push(buildPatternStats(strat, filtered));
  }

  return stats.sort((a, b) => b.winRate - a.winRate);
}

// ─── Portfolio Concentration ─────────────────────────────────────────────

/** Calculate per-symbol investment concentration */
export function calcConcentration(trades: Trade[]): ConcentrationItem[] {
  const symbolInvest = new Map<string, { amount: number; holdingQty: number; name?: string }>();

  for (const t of trades) {
    const existing = symbolInvest.get(t.symbol) ?? { amount: 0, holdingQty: 0, name: t.symbol_name };
    if (t.side === 'BUY') {
      existing.amount += t.price * t.quantity;
      existing.holdingQty += t.quantity;
    } else {
      existing.holdingQty -= t.quantity;
    }
    symbolInvest.set(t.symbol, existing);
  }

  // Only consider currently held positions
  const held = Array.from(symbolInvest.entries())
    .filter(([, d]) => d.holdingQty > 0)
    .map(([symbol, d]) => ({ symbol, symbolName: d.name, amount: d.amount }));

  const totalInvested = held.reduce((sum, h) => sum + h.amount, 0);
  if (totalInvested === 0) return [];

  return held
    .map(h => ({
      symbol: h.symbol,
      symbolName: h.symbolName,
      percentage: (h.amount / totalInvested) * 100,
      investedAmount: h.amount,
      isRisky: (h.amount / totalInvested) * 100 > 30,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

// ─── Streaks ─────────────────────────────────────────────────────────────

/** Calculate win/loss streak information */
export function calcStreaks(roundTrips: RoundTrip[]): StreakInfo {
  if (roundTrips.length === 0) {
    return { currentWin: 0, currentLoss: 0, maxWin: 0, maxLoss: 0 };
  }

  // Sort by exit date ascending for streak calculation
  const sorted = [...roundTrips].sort(
    (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
  );

  let maxWin = 0, maxLoss = 0;
  let currentWin = 0, currentLoss = 0;

  for (const trip of sorted) {
    if (trip.isWin) {
      currentWin++;
      currentLoss = 0;
      maxWin = Math.max(maxWin, currentWin);
    } else {
      currentLoss++;
      currentWin = 0;
      maxLoss = Math.max(maxLoss, currentLoss);
    }
  }

  return { currentWin, currentLoss, maxWin, maxLoss };
}

// ─── Trading Style & Risk Detection ─────────────────────────────────────

/** Auto-detect trading style based on average holding period */
export function detectTradingStyle(roundTrips: RoundTrip[]): TradingStyle {
  if (roundTrips.length === 0) return 'swing_trader';

  const avgDays = roundTrips.reduce((sum, t) => sum + t.holdingDays, 0) / roundTrips.length;

  if (avgDays <= 1) return 'day_trader';
  if (avgDays <= 14) return 'swing_trader';
  if (avgDays <= 60) return 'position_trader';
  return 'investor';
}

/** Calculate risk level based on max drawdown and volatility */
export function detectRiskLevel(roundTrips: RoundTrip[]): RiskLevel {
  if (roundTrips.length === 0) return 'medium';

  const returns = roundTrips.map(t => t.pnlPercent);
  const stdDev = calcStdDev(returns);
  const maxLoss = Math.min(...returns);

  if (maxLoss < -20 || stdDev > 15) return 'critical';
  if (maxLoss < -10 || stdDev > 10) return 'high';
  if (maxLoss < -5 || stdDev > 5) return 'medium';
  return 'low';
}

function calcStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ─── Performance Grade ───────────────────────────────────────────────────

/** Calculate overall performance grade based on multiple factors */
export function calcOverallGrade(
  winRate: number,
  profitFactor: number,
  avgReturn: number,
  maxDrawdownPct: number,
  consistencyScore: number
): PerformanceGrade {
  // Weighted scoring: winRate(25%) + profitFactor(25%) + avgReturn(20%) + drawdown(15%) + consistency(15%)
  let score = 0;

  // Win rate (0-25 points)
  score += Math.min(25, (winRate / 100) * 30);

  // Profit factor (0-25 points)
  if (profitFactor >= 2) score += 25;
  else if (profitFactor >= 1.5) score += 20;
  else if (profitFactor >= 1) score += 15;
  else score += Math.max(0, profitFactor * 10);

  // Average return (0-20 points)
  score += Math.min(20, Math.max(0, (avgReturn + 5) * 2));

  // Max drawdown penalty (0-15 points, lower is better)
  score += Math.max(0, 15 - Math.abs(maxDrawdownPct));

  // Consistency (0-15 points)
  score += (consistencyScore / 100) * 15;

  if (score >= 85) return 'A+';
  if (score >= 75) return 'A';
  if (score >= 65) return 'B+';
  if (score >= 55) return 'B';
  if (score >= 45) return 'C+';
  if (score >= 35) return 'C';
  if (score >= 25) return 'D';
  return 'F';
}

/** Calculate profit factor (gross profit / gross loss) */
export function calcProfitFactor(roundTrips: RoundTrip[]): number {
  const grossProfit = roundTrips
    .filter(t => t.pnl > 0)
    .reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(
    roundTrips
      .filter(t => t.pnl < 0)
      .reduce((sum, t) => sum + t.pnl, 0)
  );

  if (grossLoss === 0) return grossProfit > 0 ? 99 : 0;
  return grossProfit / grossLoss;
}

/** Calculate max drawdown percentage from sequential returns */
export function calcMaxDrawdown(roundTrips: RoundTrip[]): number {
  if (roundTrips.length === 0) return 0;

  // Sort by exit date ascending
  const sorted = [...roundTrips].sort(
    (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
  );

  // Simulate cumulative P&L curve
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const trip of sorted) {
    cumulative += trip.pnl;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak - cumulative;
    if (peak > 0 && (drawdown / peak) * 100 > maxDrawdown) {
      maxDrawdown = (drawdown / peak) * 100;
    }
  }

  return maxDrawdown;
}

/** Calculate consistency score (0-100) based on return variance */
export function calcConsistencyScore(roundTrips: RoundTrip[]): number {
  if (roundTrips.length < 3) return 50; // Not enough data

  const returns = roundTrips.map(t => t.pnlPercent);
  const stdDev = calcStdDev(returns);
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;

  // Coefficient of variation (lower = more consistent)
  const cv = avgReturn !== 0 ? Math.abs(stdDev / avgReturn) : stdDev;

  // Map CV to 0-100 score (CV of 0 = 100, CV of 3+ = 0)
  return Math.max(0, Math.min(100, 100 - cv * 33));
}

// ─── Advanced Metrics ────────────────────────────────────────────────────

/** Calculate R:R ratio: |avgWin| / |avgLoss| */
function calcRRRatio(roundTrips: RoundTrip[]): number {
  const wins = roundTrips.filter(t => t.isWin);
  const losses = roundTrips.filter(t => !t.isWin);
  if (wins.length === 0 || losses.length === 0) return 0;

  const avgWin = wins.reduce((s, t) => s + t.pnlPercent, 0) / wins.length;
  const avgLoss = Math.abs(losses.reduce((s, t) => s + t.pnlPercent, 0) / losses.length);

  if (avgLoss === 0) return avgWin > 0 ? 99 : 0;
  return avgWin / avgLoss;
}

/** Calculate expectancy: (winRate × avgWin%) - (lossRate × |avgLoss%|) */
function calcExpectancy(roundTrips: RoundTrip[]): number {
  if (roundTrips.length === 0) return 0;

  const wins = roundTrips.filter(t => t.isWin);
  const losses = roundTrips.filter(t => !t.isWin);
  const winRate = wins.length / roundTrips.length;
  const lossRate = losses.length / roundTrips.length;

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnlPercent, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnlPercent, 0) / losses.length) : 0;

  return winRate * avgWin - lossRate * avgLoss;
}

/** Detect behavior biases from emotion tags and trading patterns */
function calcBehaviorBias(roundTrips: RoundTrip[]): BehaviorBiasScore {
  if (roundTrips.length === 0) {
    return { fomoRatio: 0, revengeRatio: 0, impulsiveRatio: 0, overTradingDays: 0, consecutiveLossEntry: 0, biasScore: 100 };
  }

  const total = roundTrips.length;
  const fomoCount = roundTrips.filter(t => t.emotionTag === 'FOMO').length;
  const revengeCount = roundTrips.filter(t => t.emotionTag === 'REVENGE').length;
  const impulseCount = roundTrips.filter(t => t.emotionTag === 'IMPULSE').length;

  const fomoRatio = fomoCount / total;
  const revengeRatio = revengeCount / total;
  const impulsiveRatio = impulseCount / total;

  // Count over-trading days (3+ trades entered on same date)
  const entryDateCounts = new Map<string, number>();
  for (const t of roundTrips) {
    entryDateCounts.set(t.entryDate, (entryDateCounts.get(t.entryDate) ?? 0) + 1);
  }
  const overTradingDays = Array.from(entryDateCounts.values()).filter(c => c >= 3).length;

  // Count consecutive loss re-entries (new entry within 1 day after a loss)
  const sortedByExit = [...roundTrips].sort(
    (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
  );
  let consecutiveLossEntry = 0;
  for (let i = 0; i < sortedByExit.length - 1; i++) {
    const curr = sortedByExit[i];
    const next = sortedByExit[i + 1];
    if (!curr.isWin) {
      const exitMs = new Date(curr.exitDate).getTime();
      const nextEntryMs = new Date(next.entryDate).getTime();
      if (nextEntryMs - exitMs <= 24 * 60 * 60 * 1000) {
        consecutiveLossEntry++;
      }
    }
  }

  // Bias score: 100 = perfect discipline, lower = more biased
  const penalty =
    fomoRatio * 40 +
    revengeRatio * 35 +
    impulsiveRatio * 25 +
    overTradingDays * 5 +
    consecutiveLossEntry * 5;
  const biasScore = Math.max(0, Math.min(100, 100 - penalty));

  return { fomoRatio, revengeRatio, impulsiveRatio, overTradingDays, consecutiveLossEntry, biasScore };
}

/** Calculate timing metrics: win vs loss holding period comparison */
function calcTimingMetrics(roundTrips: RoundTrip[]): TimingMetrics {
  const wins = roundTrips.filter(t => t.isWin);
  const losses = roundTrips.filter(t => !t.isWin);

  const avgWinHoldingDays = wins.length > 0
    ? wins.reduce((s, t) => s + t.holdingDays, 0) / wins.length
    : 0;
  const avgLossHoldingDays = losses.length > 0
    ? losses.reduce((s, t) => s + t.holdingDays, 0) / losses.length
    : 0;

  // Ratio of losses held shorter than average loss holding period
  const earlyExitRatio = losses.length > 0
    ? losses.filter(t => t.holdingDays < avgLossHoldingDays).length / losses.length
    : 0;

  // Positive = losses are cut faster than wins (good)
  const holdingEdge = avgLossHoldingDays - avgWinHoldingDays;

  return { avgWinHoldingDays, avgLossHoldingDays, earlyExitRatio, holdingEdge };
}

/** Assemble all advanced metrics with benchmark evaluations */
function calcAdvancedMetrics(roundTrips: RoundTrip[]): AdvancedMetrics {
  const returns = roundTrips.map(t => t.pnlPercent);
  const avgReturn = returns.length > 0 ? returns.reduce((s, v) => s + v, 0) / returns.length : 0;
  const volatility = calcStdDev(returns);
  const sharpeProxy = volatility > 0 ? avgReturn / volatility : 0;

  const rrRatio = calcRRRatio(roundTrips);
  const expectancy = calcExpectancy(roundTrips);
  const biasScore = calcBehaviorBias(roundTrips);
  const timing = calcTimingMetrics(roundTrips);

  const rrRatioBenchmark: AdvancedMetrics['rrRatioBenchmark'] =
    rrRatio >= 2 ? 'excellent' :
    rrRatio >= 1.5 ? 'good' :
    rrRatio >= 1 ? 'fair' : 'poor';

  const expectancyBenchmark: AdvancedMetrics['expectancyBenchmark'] =
    expectancy >= 0 ? 'positive' : 'negative';

  return { rrRatio, expectancy, volatility, sharpeProxy, biasScore, timing, rrRatioBenchmark, expectancyBenchmark };
}

// ─── Insight Generation ──────────────────────────────────────────────────

/** Generate rule-based insight sentences from analysis data */
export function generateInsights(
  roundTrips: RoundTrip[],
  weekdayStats: PatternStats[],
  holdingStats: PatternStats[],
  emotionStats: PatternStats[],
  strategyStats: PatternStats[],
  concentration: ConcentrationItem[],
  streaks: StreakInfo,
  winRate: number,
  profitFactor: number
): InsightItem[] {
  const insights: InsightItem[] = [];
  let id = 0;

  // 1. Best weekday
  const bestWeekday = weekdayStats
    .filter(s => s.count >= 2)
    .sort((a, b) => b.winRate - a.winRate)[0];
  if (bestWeekday && bestWeekday.winRate > 60) {
    insights.push({
      id: `insight-${id++}`,
      icon: '📈',
      type: 'positive',
      title: `${bestWeekday.label} 매매 성적 우수`,
      description: `${bestWeekday.label}에 진입한 매매의 승률이 ${bestWeekday.winRate.toFixed(0)}%로 가장 높습니다 (${bestWeekday.count}건).`,
    });
  }

  // 2. Worst weekday
  const worstWeekday = weekdayStats
    .filter(s => s.count >= 2)
    .sort((a, b) => a.winRate - b.winRate)[0];
  if (worstWeekday && worstWeekday.winRate < 40 && worstWeekday !== bestWeekday) {
    insights.push({
      id: `insight-${id++}`,
      icon: '📉',
      type: 'warning',
      title: `${worstWeekday.label} 매매 주의`,
      description: `${worstWeekday.label}에 진입한 매매의 승률이 ${worstWeekday.winRate.toFixed(0)}%로 가장 낮습니다. 이 요일의 매매를 줄여보세요.`,
    });
  }

  // 3. Best holding period
  const bestHolding = holdingStats
    .filter(s => s.count >= 2)
    .sort((a, b) => b.avgReturn - a.avgReturn)[0];
  if (bestHolding && bestHolding.avgReturn > 0) {
    insights.push({
      id: `insight-${id++}`,
      icon: '⏰',
      type: 'positive',
      title: `${bestHolding.label} 수익률 우수`,
      description: `${bestHolding.label}의 평균 수익률이 ${bestHolding.avgReturn.toFixed(1)}%로 가장 높습니다 (${bestHolding.count}건).`,
    });
  }

  // 4. Emotion-based insights
  const plannedStat = emotionStats.find(s => s.label === EMOTION_LABELS['PLANNED']);
  const fomoStat = emotionStats.find(s => s.label === EMOTION_LABELS['FOMO']);
  if (fomoStat && fomoStat.count >= 2 && fomoStat.winRate < 50) {
    insights.push({
      id: `insight-${id++}`,
      icon: '⚠️',
      type: 'warning',
      title: 'FOMO 매매 손실 높음',
      description: `FOMO 매매의 승률이 ${fomoStat.winRate.toFixed(0)}%입니다. 계획된 매매를 우선하세요.`,
    });
  }
  if (plannedStat && plannedStat.count >= 2 && plannedStat.winRate > 60) {
    insights.push({
      id: `insight-${id++}`,
      icon: '✅',
      type: 'positive',
      title: '계획된 매매 성적 우수',
      description: `계획된 매매의 승률이 ${plannedStat.winRate.toFixed(0)}%로, 감정적 매매보다 월등히 높습니다.`,
    });
  }

  // 5. Best strategy
  const bestStrategy = strategyStats
    .filter(s => s.count >= 2 && s.label !== '전략 미설정')
    .sort((a, b) => b.winRate - a.winRate)[0];
  if (bestStrategy && bestStrategy.winRate > 50) {
    insights.push({
      id: `insight-${id++}`,
      icon: '🏆',
      type: 'positive',
      title: `"${bestStrategy.label}" 전략 성과 우수`,
      description: `이 전략의 승률이 ${bestStrategy.winRate.toFixed(0)}%로 가장 높습니다 (${bestStrategy.count}건, 평균 수익 ${bestStrategy.avgReturn.toFixed(1)}%).`,
    });
  }

  // 6. Concentration risk
  const riskyPositions = concentration.filter(c => c.isRisky);
  if (riskyPositions.length > 0) {
    const top = riskyPositions[0];
    insights.push({
      id: `insight-${id++}`,
      icon: '⚡',
      type: 'warning',
      title: '포트폴리오 집중 위험',
      description: `전체 투자금의 ${top.percentage.toFixed(0)}%가 ${top.symbolName || top.symbol}에 집중되어 있습니다. 분산 투자를 고려하세요.`,
    });
  }

  // 7. Loss streak warning
  if (streaks.currentLoss >= 3) {
    insights.push({
      id: `insight-${id++}`,
      icon: '🚨',
      type: 'critical',
      title: `${streaks.currentLoss}연패 진행 중`,
      description: `현재 ${streaks.currentLoss}연속 손실 중입니다. 포지션 축소 또는 매매 중단을 고려해보세요.`,
    });
  }

  // 8. Win streak
  if (streaks.currentWin >= 3) {
    insights.push({
      id: `insight-${id++}`,
      icon: '🔥',
      type: 'positive',
      title: `${streaks.currentWin}연승 중!`,
      description: `매우 좋은 흐름입니다. 하지만 과신하지 말고 리스크 관리를 유지하세요.`,
    });
  }

  // 9. Overall win rate
  if (roundTrips.length >= 5) {
    if (winRate >= 60) {
      insights.push({
        id: `insight-${id++}`,
        icon: '👍',
        type: 'positive',
        title: `전체 승률 ${winRate.toFixed(0)}% 양호`,
        description: `현재 투자 스타일이 잘 맞고 있습니다. 일관성을 유지하세요.`,
      });
    } else if (winRate < 40) {
      insights.push({
        id: `insight-${id++}`,
        icon: '💭',
        type: 'warning',
        title: `전체 승률 ${winRate.toFixed(0)}% 개선 필요`,
        description: `진입 타이밍이나 종목 선정을 재검토해보세요. 손절 기준을 명확히 하면 도움이 됩니다.`,
      });
    }
  }

  // 10. Profit factor
  if (roundTrips.length >= 5) {
    if (profitFactor >= 2) {
      insights.push({
        id: `insight-${id++}`,
        icon: '💰',
        type: 'positive',
        title: `수익 팩터 ${profitFactor.toFixed(1)} — 우수`,
        description: `손실 대비 수익이 ${profitFactor.toFixed(1)}배로, 안정적인 수익 구조를 갖추고 있습니다.`,
      });
    } else if (profitFactor < 1) {
      insights.push({
        id: `insight-${id++}`,
        icon: '📊',
        type: 'critical',
        title: `수익 팩터 ${profitFactor.toFixed(1)} — 손실 구간`,
        description: `현재 수익보다 손실이 큽니다. 손절 라인을 더 타이트하게 설정해보세요.`,
      });
    }
  }

  // If no insights generated, add a default one
  if (insights.length === 0 && roundTrips.length > 0) {
    insights.push({
      id: `insight-${id++}`,
      icon: '📋',
      type: 'neutral',
      title: '데이터 수집 중',
      description: `현재 ${roundTrips.length}건의 완결된 매매가 있습니다. 더 많은 매매 데이터가 쌓이면 유의미한 패턴을 발견할 수 있습니다.`,
    });
  }

  return insights;
}

// ─── Monthly Stats ───────────────────────────────────────────────────────

/** Group round trips by exit month and return monthly performance stats */
export function calcMonthlyStats(roundTrips: RoundTrip[]): MonthlyStats[] {
  const byMonth = new Map<string, RoundTrip[]>();

  for (const trip of roundTrips) {
    const month = trip.exitDate.slice(0, 7); // YYYY-MM
    const list = byMonth.get(month) ?? [];
    list.push(trip);
    byMonth.set(month, list);
  }

  const stats: MonthlyStats[] = [];
  for (const [month, trips] of byMonth) {
    const wins = trips.filter(t => t.isWin).length;
    const totalPnl = trips.reduce((s, t) => s + t.pnl, 0);
    const avgReturn = trips.reduce((s, t) => s + t.pnlPercent, 0) / trips.length;

    const currencySet = new Set(trips.map(t => t.currency));
    const currency: MonthlyStats['currency'] =
      currencySet.size === 1 ? (currencySet.has('KRW') ? 'KRW' : 'USD') : 'mixed';

    const [year, m] = month.split('-');
    const label = `${year.slice(2)}년 ${parseInt(m)}월`;

    stats.push({
      month,
      label,
      totalPnl,
      winCount: wins,
      lossCount: trips.length - wins,
      winRate: trips.length > 0 ? (wins / trips.length) * 100 : 0,
      avgReturn,
      tradeCount: trips.length,
      currency,
    });
  }

  return stats.sort((a, b) => a.month.localeCompare(b.month));
}

// ─── Equity Curve ────────────────────────────────────────────────────────

/** Build cumulative P&L curve from round trips sorted by exit date */
export function calcEquityCurve(roundTrips: RoundTrip[]): EquityCurvePoint[] {
  const sorted = [...roundTrips].sort(
    (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
  );

  let cumPnl = 0;
  return sorted.map(trip => {
    cumPnl += trip.pnl;
    return {
      date: trip.exitDate,
      cumulativePnl: cumPnl,
      tradeLabel: `${trip.symbolName || trip.symbol} 청산`,
    };
  });
}

// ─── Full Analysis Pipeline ──────────────────────────────────────────────

/** Run the complete analysis pipeline on trade data */
export function analyzeTradesComplete(trades: Trade[]): TradeAnalysis {
  const roundTrips = matchRoundTrips(trades);

  const weekdayStats = calcWeekdayStats(roundTrips);
  const holdingPeriodStats = calcHoldingPeriodStats(roundTrips);
  const emotionStats = calcEmotionStats(roundTrips);
  const strategyStats = calcStrategyStats(roundTrips);
  const concentration = calcConcentration(trades);
  const streaks = calcStreaks(roundTrips);

  // Calculate overall metrics
  const totalTrades = roundTrips.length;
  const wins = roundTrips.filter(t => t.isWin).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgReturn = totalTrades > 0
    ? roundTrips.reduce((s, t) => s + t.pnlPercent, 0) / totalTrades
    : 0;
  const profitFactor = calcProfitFactor(roundTrips);
  const maxDrawdownPct = calcMaxDrawdown(roundTrips);
  const consistencyScore = calcConsistencyScore(roundTrips);
  const avgHoldingDays = totalTrades > 0
    ? roundTrips.reduce((s, t) => s + t.holdingDays, 0) / totalTrades
    : 0;

  const tradingStyle = detectTradingStyle(roundTrips);
  const riskLevel = detectRiskLevel(roundTrips);
  const overallGrade = calcOverallGrade(winRate, profitFactor, avgReturn, maxDrawdownPct, consistencyScore);

  const profile: UserProfile = {
    tradingStyle,
    tradingStyleLabel: TRADING_STYLE_LABELS[tradingStyle],
    riskLevel,
    riskLevelLabel: RISK_LEVEL_LABELS[riskLevel],
    overallGrade,
    totalTrades,
    winRate,
    avgReturn,
    profitFactor,
    maxDrawdownPercent: maxDrawdownPct,
    avgHoldingDays,
    consistencyScore,
  };

  const insights = generateInsights(
    roundTrips, weekdayStats, holdingPeriodStats, emotionStats,
    strategyStats, concentration, streaks, winRate, profitFactor
  );

  const advancedMetrics = calcAdvancedMetrics(roundTrips);

  return {
    roundTrips,
    weekdayStats,
    holdingPeriodStats,
    emotionStats,
    strategyStats,
    concentration,
    streaks,
    profile,
    insights,
    advancedMetrics,
    analyzedAt: new Date().toISOString(),
  };
}
