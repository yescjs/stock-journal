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
  HOLDING_PERIOD_LABELS_I18N,
  WEEKDAY_LABELS_I18N,
  EMOTION_LABELS_I18N,
  TRADING_STYLE_LABELS_I18N,
  RISK_LEVEL_LABELS_I18N,
  NO_TAG_LABEL_I18N,
  CLOSE_LABEL_I18N,
  WEEKDAY_SUFFIX_I18N,
  NO_STRATEGY_LABEL_I18N,
  HeatmapRow,
  PeriodMetrics,
  PeriodComparison,
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
    // Sort by date ascending for FIFO; same date → BUY before SELL
    const sorted = [...symbolTrades].sort((a, b) => {
      const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      if (a.side === 'BUY' && b.side === 'SELL') return -1;
      if (a.side === 'SELL' && b.side === 'BUY') return 1;
      return 0;
    });

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
export function calcWeekdayStats(roundTrips: RoundTrip[], locale: string = 'ko'): PatternStats[] {
  const loc = locale.startsWith('ko') ? 'ko' : 'en';
  const labels = WEEKDAY_LABELS_I18N[loc];
  const suffix = WEEKDAY_SUFFIX_I18N[loc];
  // Only include trading days (Mon-Fri, indices 1-5)
  return [1, 2, 3, 4, 5].map(day => {
    const dayTrips = roundTrips.filter(t => t.entryWeekday === day);
    return buildPatternStats(`${labels[day]}${suffix}`, dayTrips);
  });
}

/** Calculate stats grouped by holding period category */
export function calcHoldingPeriodStats(roundTrips: RoundTrip[], locale: string = 'ko'): PatternStats[] {
  const loc = locale.startsWith('ko') ? 'ko' : 'en';
  const labels = HOLDING_PERIOD_LABELS_I18N[loc];
  return Object.entries(labels).map(([, config]) => {
    const filtered = roundTrips.filter(
      t => t.holdingDays >= config.minDays && t.holdingDays <= config.maxDays
    );
    return buildPatternStats(config.label, filtered);
  });
}

/** Calculate stats grouped by emotion tag */
export function calcEmotionStats(roundTrips: RoundTrip[], locale: string = 'ko'): PatternStats[] {
  const loc = locale.startsWith('ko') ? 'ko' : 'en';
  const emotionLabels = EMOTION_LABELS_I18N[loc];
  const noTagLabel = NO_TAG_LABEL_I18N[loc];
  const tagSet = new Set<string>();
  for (const t of roundTrips) {
    if (t.emotionTag) tagSet.add(t.emotionTag);
  }

  // Include no-tag label for trades without emotion tag
  const noTagTrips = roundTrips.filter(t => !t.emotionTag);
  const stats: PatternStats[] = [];

  if (noTagTrips.length > 0) {
    stats.push(buildPatternStats(noTagLabel, noTagTrips));
  }

  for (const tag of tagSet) {
    const filtered = roundTrips.filter(t => t.emotionTag === tag);
    const label = emotionLabels[tag] || tag;
    stats.push(buildPatternStats(label, filtered));
  }

  return stats.sort((a, b) => b.count - a.count);
}

/** Calculate stats grouped by strategy */
export function calcStrategyStats(roundTrips: RoundTrip[], locale: string = 'ko'): PatternStats[] {
  const loc = locale.startsWith('ko') ? 'ko' : 'en';
  const noStrategyLabel = NO_STRATEGY_LABEL_I18N[loc];
  const strategySet = new Set<string>();
  for (const t of roundTrips) {
    if (t.strategyName) strategySet.add(t.strategyName);
  }

  const noStratTrips = roundTrips.filter(t => !t.strategyName);
  const stats: PatternStats[] = [];

  if (noStratTrips.length > 0) {
    stats.push(buildPatternStats(noStrategyLabel, noStratTrips));
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

/** Translation function type for insight generation */
export type InsightTranslator = (key: string, values?: Record<string, string | number>) => string;

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
  profitFactor: number,
  t: InsightTranslator
): InsightItem[] {
  const insights: InsightItem[] = [];
  let id = 0;

  const noStrategyLabel = t('noStrategy');

  // 1. Best weekday
  const bestWeekday = weekdayStats
    .filter(s => s.count >= 2)
    .sort((a, b) => b.winRate - a.winRate)[0];
  if (bestWeekday && bestWeekday.winRate > 60) {
    insights.push({
      id: `insight-${id++}`,
      icon: '📈',
      type: 'positive',
      title: t('bestWeekdayTitle', { label: bestWeekday.label }),
      description: t('bestWeekdayDesc', { label: bestWeekday.label, winRate: bestWeekday.winRate.toFixed(0), count: bestWeekday.count }),
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
      title: t('worstWeekdayTitle', { label: worstWeekday.label }),
      description: t('worstWeekdayDesc', { label: worstWeekday.label, winRate: worstWeekday.winRate.toFixed(0) }),
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
      title: t('bestHoldingTitle', { label: bestHolding.label }),
      description: t('bestHoldingDesc', { label: bestHolding.label, avgReturn: bestHolding.avgReturn.toFixed(1), count: bestHolding.count }),
    });
  }

  // 4. Emotion-based insights
  const emotionLabels = EMOTION_LABELS_I18N.ko; // Use canonical keys for lookup
  const emotionLabelsEn = EMOTION_LABELS_I18N.en;
  const plannedStat = emotionStats.find(s => s.label === emotionLabels['PLANNED'] || s.label === emotionLabelsEn['PLANNED']);
  const fomoStat = emotionStats.find(s => s.label === emotionLabels['FOMO'] || s.label === emotionLabelsEn['FOMO']);
  if (fomoStat && fomoStat.count >= 2 && fomoStat.winRate < 50) {
    insights.push({
      id: `insight-${id++}`,
      icon: '⚠️',
      type: 'warning',
      title: t('fomoLossTitle'),
      description: t('fomoLossDesc', { winRate: fomoStat.winRate.toFixed(0) }),
    });
  }
  if (plannedStat && plannedStat.count >= 2 && plannedStat.winRate > 60) {
    insights.push({
      id: `insight-${id++}`,
      icon: '✅',
      type: 'positive',
      title: t('plannedEffectiveTitle'),
      description: t('plannedEffectiveDesc', { winRate: plannedStat.winRate.toFixed(0) }),
    });
  }

  // 5. Best strategy
  const bestStrategy = strategyStats
    .filter(s => s.count >= 2 && s.label !== noStrategyLabel)
    .sort((a, b) => b.winRate - a.winRate)[0];
  if (bestStrategy && bestStrategy.winRate > 50) {
    insights.push({
      id: `insight-${id++}`,
      icon: '🏆',
      type: 'positive',
      title: t('bestStrategyTitle', { label: bestStrategy.label }),
      description: t('bestStrategyDesc', { winRate: bestStrategy.winRate.toFixed(0), count: bestStrategy.count, avgReturn: bestStrategy.avgReturn.toFixed(1) }),
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
      title: t('concentrationRiskTitle'),
      description: t('concentrationRiskDesc', { percentage: top.percentage.toFixed(0), symbol: top.symbolName || top.symbol }),
    });
  }

  // 7. Loss streak warning
  if (streaks.currentLoss >= 3) {
    insights.push({
      id: `insight-${id++}`,
      icon: '🚨',
      type: 'critical',
      title: t('lossStreakTitle', { count: streaks.currentLoss }),
      description: t('lossStreakDesc', { count: streaks.currentLoss }),
    });
  }

  // 8. Win streak
  if (streaks.currentWin >= 3) {
    insights.push({
      id: `insight-${id++}`,
      icon: '🔥',
      type: 'positive',
      title: t('winStreakTitle', { count: streaks.currentWin }),
      description: t('winStreakDesc'),
    });
  }

  // 9. Overall win rate
  if (roundTrips.length >= 5) {
    if (winRate >= 60) {
      insights.push({
        id: `insight-${id++}`,
        icon: '👍',
        type: 'positive',
        title: t('winRateGoodTitle', { winRate: winRate.toFixed(0) }),
        description: t('winRateGoodDesc'),
      });
    } else if (winRate < 40) {
      insights.push({
        id: `insight-${id++}`,
        icon: '💭',
        type: 'warning',
        title: t('winRateBadTitle', { winRate: winRate.toFixed(0) }),
        description: t('winRateBadDesc'),
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
        title: t('profitFactorGoodTitle', { pf: profitFactor.toFixed(1) }),
        description: t('profitFactorGoodDesc', { pf: profitFactor.toFixed(1) }),
      });
    } else if (profitFactor < 1) {
      insights.push({
        id: `insight-${id++}`,
        icon: '📊',
        type: 'critical',
        title: t('profitFactorBadTitle', { pf: profitFactor.toFixed(1) }),
        description: t('profitFactorBadDesc'),
      });
    }
  }

  // If no insights generated, add a default one
  if (insights.length === 0 && roundTrips.length > 0) {
    insights.push({
      id: `insight-${id++}`,
      icon: '📋',
      type: 'neutral',
      title: t('gatheringDataTitle'),
      description: t('gatheringDataDesc', { count: roundTrips.length }),
    });
  }

  return insights;
}

// ─── Symbol × Month Heatmap ──────────────────────────────────────────────

/** Build a symbol × month heatmap matrix from round trips */
export function calcSymbolMonthlyHeatmap(roundTrips: RoundTrip[]): {
  rows: HeatmapRow[];
  months: string[];   // sorted YYYY-MM list
} {
  const rowMap = new Map<string, HeatmapRow>();
  const monthSet = new Set<string>();

  for (const trip of roundTrips) {
    const month = trip.exitDate.slice(0, 7);
    monthSet.add(month);

    let row = rowMap.get(trip.symbol);
    if (!row) {
      row = { symbol: trip.symbol, symbolName: trip.symbolName, cells: new Map() };
      rowMap.set(trip.symbol, row);
    }

    let cell = row.cells.get(month);
    if (!cell) {
      cell = {
        symbol: trip.symbol,
        symbolName: trip.symbolName,
        month,
        avgReturn: 0,
        totalPnl: 0,
        tradeCount: 0,
        roundTrips: [],
      };
      row.cells.set(month, cell);
    }

    cell.roundTrips.push(trip);
    cell.tradeCount += 1;
    cell.totalPnl += trip.pnl;
  }

  // Calculate avgReturn per cell
  for (const row of rowMap.values()) {
    for (const cell of row.cells.values()) {
      cell.avgReturn = cell.roundTrips.reduce((s, t) => s + t.pnlPercent, 0) / cell.tradeCount;
    }
  }

  const months = [...monthSet].sort();
  // Show last 6 months by default
  const recentMonths = months.slice(-6);
  const rows = [...rowMap.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));

  return { rows, months: recentMonths };
}

// ─── Period Comparison ──────────────────────────────────────────────────

/** Calculate metrics for a single period (month) from round trips */
function calcPeriodMetrics(trips: RoundTrip[], month: string, label: string): PeriodMetrics {
  const wins = trips.filter(t => t.isWin).length;
  const winRate = trips.length > 0 ? (wins / trips.length) * 100 : 0;
  const avgReturn = trips.length > 0
    ? trips.reduce((s, t) => s + t.pnlPercent, 0) / trips.length
    : 0;
  const totalPnl = trips.reduce((s, t) => s + t.pnl, 0);
  const grossProfit = trips.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(trips.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const maxLoss = trips.length > 0
    ? Math.min(...trips.map(t => t.pnlPercent))
    : 0;

  const currencySet = new Set(trips.map(t => t.currency));
  const currency: PeriodMetrics['currency'] =
    currencySet.size === 1 ? (currencySet.has('KRW') ? 'KRW' : 'USD') : 'mixed';

  return { month, label, winRate, avgReturn, profitFactor, maxLoss, tradeCount: trips.length, totalPnl, currency };
}

/** Compare two periods and compute changes */
export function calcPeriodComparison(
  roundTrips: RoundTrip[],
  monthA: string,
  monthB: string,
  locale: string = 'ko'
): PeriodComparison | null {
  const loc = locale.startsWith('ko') ? 'ko' : 'en';
  const tripsA = roundTrips.filter(t => t.exitDate.startsWith(monthA));
  const tripsB = roundTrips.filter(t => t.exitDate.startsWith(monthB));

  if (tripsA.length === 0 && tripsB.length === 0) return null;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const makeLabel = (m: string) => {
    const [year, mon] = m.split('-');
    return loc === 'ko'
      ? `${year.slice(2)}년 ${parseInt(mon)}월`
      : `${monthNames[parseInt(mon) - 1]} '${year.slice(2)}`;
  };

  const periodA = calcPeriodMetrics(tripsA, monthA, makeLabel(monthA));
  const periodB = calcPeriodMetrics(tripsB, monthB, makeLabel(monthB));

  return {
    periodA,
    periodB,
    changes: {
      winRate: periodB.winRate - periodA.winRate,
      avgReturn: periodB.avgReturn - periodA.avgReturn,
      profitFactor: periodB.profitFactor - periodA.profitFactor,
      maxLoss: periodB.maxLoss - periodA.maxLoss,
      tradeCount: periodB.tradeCount - periodA.tradeCount,
      totalPnl: periodB.totalPnl - periodA.totalPnl,
    },
  };
}

/** Get available months from round trips (sorted) */
export function getAvailableMonths(roundTrips: RoundTrip[], locale: string = 'ko'): { value: string; label: string }[] {
  const loc = locale.startsWith('ko') ? 'ko' : 'en';
  const monthSet = new Set<string>();
  for (const trip of roundTrips) {
    monthSet.add(trip.exitDate.slice(0, 7));
  }
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return [...monthSet].sort().map(m => {
    const [year, mon] = m.split('-');
    const label = loc === 'ko'
      ? `${year.slice(2)}년 ${parseInt(mon)}월`
      : `${monthNames[parseInt(mon) - 1]} '${year.slice(2)}`;
    return { value: m, label };
  });
}

// ─── Monthly Stats ───────────────────────────────────────────────────────

/** Group round trips by exit month and return monthly performance stats */
export function calcMonthlyStats(roundTrips: RoundTrip[], rawLocale: string = 'ko'): MonthlyStats[] {
  const locale = rawLocale.startsWith('ko') ? 'ko' : 'en';
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
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const label = locale === 'ko'
      ? `${year.slice(2)}년 ${parseInt(m)}월`
      : `${monthNames[parseInt(m) - 1]} '${year.slice(2)}`;

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
export function calcEquityCurve(roundTrips: RoundTrip[], rawLocale: string = 'ko'): EquityCurvePoint[] {
  const locale = rawLocale.startsWith('ko') ? 'ko' : 'en';
  const sorted = [...roundTrips].sort(
    (a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime()
  );

  const closeLabel = CLOSE_LABEL_I18N[locale] || CLOSE_LABEL_I18N.ko;
  let cumPnl = 0;
  return sorted.map(trip => {
    cumPnl += trip.pnl;
    return {
      date: trip.exitDate,
      cumulativePnl: cumPnl,
      tradeLabel: `${trip.symbolName || trip.symbol} ${closeLabel}`,
    };
  });
}

// ─── Full Analysis Pipeline ──────────────────────────────────────────────

/** Run the complete analysis pipeline on trade data */
export function analyzeTradesComplete(trades: Trade[], locale: string = 'ko', t?: InsightTranslator): TradeAnalysis {
  // Normalize locale to 'ko' or 'en'
  const loc = locale.startsWith('ko') ? 'ko' : 'en';
  const roundTrips = matchRoundTrips(trades);

  const weekdayStats = calcWeekdayStats(roundTrips, loc);
  const holdingPeriodStats = calcHoldingPeriodStats(roundTrips, loc);
  const emotionStats = calcEmotionStats(roundTrips, loc);
  const strategyStats = calcStrategyStats(roundTrips, loc);
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

  const tradingStyleLabels = TRADING_STYLE_LABELS_I18N[loc];
  const riskLevelLabels = RISK_LEVEL_LABELS_I18N[loc];
  const profile: UserProfile = {
    tradingStyle,
    tradingStyleLabel: tradingStyleLabels[tradingStyle],
    riskLevel,
    riskLevelLabel: riskLevelLabels[riskLevel],
    overallGrade,
    totalTrades,
    winRate,
    avgReturn,
    profitFactor,
    maxDrawdownPercent: maxDrawdownPct,
    avgHoldingDays,
    consistencyScore,
  };

  // Use provided translator or create a fallback from bundled translations
  const insightT: InsightTranslator = t ?? createFallbackTranslator(loc);

  const insights = generateInsights(
    roundTrips, weekdayStats, holdingPeriodStats, emotionStats,
    strategyStats, concentration, streaks, winRate, profitFactor, insightT
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

/** Fallback translator for when next-intl `t` is not available (e.g., server-side or tests) */
function createFallbackTranslator(loc: 'ko' | 'en'): InsightTranslator {
  const messages: Record<string, Record<string, string>> = {
    ko: {
      noStrategy: '전략 미설정',
      bestWeekdayTitle: '{label} 매매 성적 우수',
      bestWeekdayDesc: '{label}에 진입한 매매의 승률이 {winRate}%로 가장 높습니다 ({count}건).',
      worstWeekdayTitle: '{label} 매매 주의',
      worstWeekdayDesc: '{label}에 진입한 매매의 승률이 {winRate}%로 가장 낮습니다. 이 요일의 매매를 줄여보세요.',
      bestHoldingTitle: '{label} 수익률 우수',
      bestHoldingDesc: '{label}의 평균 수익률이 {avgReturn}%로 가장 높습니다 ({count}건).',
      fomoLossTitle: 'FOMO 매매 손실 높음',
      fomoLossDesc: 'FOMO 매매의 승률이 {winRate}%입니다. 계획된 매매를 우선하세요.',
      plannedEffectiveTitle: '계획된 매매가 효과적',
      plannedEffectiveDesc: '계획된 매매의 승률이 {winRate}%로 가장 높습니다.',
      bestStrategyTitle: '"{label}" 전략 성과 우수',
      bestStrategyDesc: '이 전략의 승률이 {winRate}%로 가장 높습니다 ({count}건, 평균 수익 {avgReturn}%).',
      concentrationRiskTitle: '포트폴리오 집중 위험',
      concentrationRiskDesc: '전체 투자금의 {percentage}%가 {symbol}에 집중되어 있습니다. 분산 투자를 고려하세요.',
      lossStreakTitle: '{count}연패 진행 중',
      lossStreakDesc: '현재 {count}연속 손실 중입니다. 포지션 축소 또는 매매 중단을 고려해보세요.',
      winStreakTitle: '{count}연승 중!',
      winStreakDesc: '매우 좋은 흐름입니다. 하지만 과신하지 말고 리스크 관리를 유지하세요.',
      winRateGoodTitle: '전체 승률 {winRate}% 양호',
      winRateGoodDesc: '현재 투자 스타일이 잘 맞고 있습니다. 일관성을 유지하세요.',
      winRateBadTitle: '전체 승률 {winRate}% 개선 필요',
      winRateBadDesc: '진입 타이밍이나 종목 선정을 재검토해보세요. 손절 기준을 명확히 하면 도움이 됩니다.',
      profitFactorGoodTitle: '수익 팩터 {pf} — 우수',
      profitFactorGoodDesc: '손실 대비 수익이 {pf}배로, 안정적인 수익 구조를 갖추고 있습니다.',
      profitFactorBadTitle: '수익 팩터 {pf} — 손실 구간',
      profitFactorBadDesc: '현재 수익보다 손실이 큽니다. 손절 라인을 더 타이트하게 설정해보세요.',
      gatheringDataTitle: '데이터 수집 중',
      gatheringDataDesc: '현재 {count}건의 완결된 매매가 있습니다. 더 많은 매매 데이터가 쌓이면 유의미한 패턴을 발견할 수 있습니다.',
    },
    en: {
      noStrategy: 'No Strategy',
      bestWeekdayTitle: 'Strong {label} Performance',
      bestWeekdayDesc: 'Trades entered on {label} have the highest win rate at {winRate}% ({count} trades).',
      worstWeekdayTitle: 'Caution on {label}',
      worstWeekdayDesc: 'Trades entered on {label} have the lowest win rate at {winRate}%. Consider reducing trades on this day.',
      bestHoldingTitle: '{label} Returns Excel',
      bestHoldingDesc: '{label} trades have the highest avg return at {avgReturn}% ({count} trades).',
      fomoLossTitle: 'High FOMO Trading Losses',
      fomoLossDesc: 'FOMO trades have a {winRate}% win rate. Prioritize planned trades.',
      plannedEffectiveTitle: 'Planned Trades Are Effective',
      plannedEffectiveDesc: 'Planned trades have the highest win rate at {winRate}%.',
      bestStrategyTitle: '"{label}" Strategy Excels',
      bestStrategyDesc: 'This strategy has the highest win rate at {winRate}% ({count} trades, avg return {avgReturn}%).',
      concentrationRiskTitle: 'Portfolio Concentration Risk',
      concentrationRiskDesc: '{percentage}% of your portfolio is concentrated in {symbol}. Consider diversifying.',
      lossStreakTitle: '{count}-Loss Streak in Progress',
      lossStreakDesc: 'You are on a {count}-trade losing streak. Consider reducing position size or pausing trading.',
      winStreakTitle: '{count}-Win Streak!',
      winStreakDesc: 'Great momentum! But stay disciplined and maintain your risk management.',
      winRateGoodTitle: 'Overall Win Rate {winRate}% — Solid',
      winRateGoodDesc: 'Your current trading style is working well. Stay consistent.',
      winRateBadTitle: 'Overall Win Rate {winRate}% — Needs Improvement',
      winRateBadDesc: 'Review your entry timing and stock selection. Setting clear stop-loss levels can help.',
      profitFactorGoodTitle: 'Profit Factor {pf} — Excellent',
      profitFactorGoodDesc: 'Your gains are {pf}x your losses, indicating a solid profit structure.',
      profitFactorBadTitle: 'Profit Factor {pf} — In the Red',
      profitFactorBadDesc: 'Your losses exceed your gains. Consider tightening your stop-loss levels.',
      gatheringDataTitle: 'Gathering Data',
      gatheringDataDesc: 'You have {count} completed trades so far. More trade data will reveal meaningful patterns.',
    },
  };

  return (key: string, values?: Record<string, string | number>): string => {
    let template = messages[loc]?.[key] ?? messages.en[key] ?? key;
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return template;
  };
}
