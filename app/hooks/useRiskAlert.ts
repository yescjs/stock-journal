// Risk alert hook — detects dangerous trading patterns after trade save
// Rule-based (no AI API call, no coin cost), works in both guest and user modes

import { useMemo, useState, useCallback } from 'react';
import { Trade } from '@/app/types/trade';

// ─── Constants ───────────────────────────────────────────────────────────

export const RISK_THRESHOLDS = {
  /** Consecutive losses to trigger alert */
  lossStreak: 3,
  /** Max trades per day before overtrading alert */
  maxDailyTrades: 3,
  /** Consecutive emotional trades (FOMO/REVENGE/IMPULSE) */
  emotionalStreak: 2,
  /** Daily cumulative loss percentage threshold */
  dailyLossPercent: 5,
} as const;

const DISMISS_KEY = 'stock-journal-risk-alert-dismissed';

export type RiskAlertType = 'loss_streak' | 'overtrading' | 'emotional_streak' | 'daily_loss';

export interface RiskAlert {
  type: RiskAlertType;
  message: string;
  severity: 'warning' | 'critical';
}

// ─── Detection Logic (pure functions) ────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDismissedToday(): boolean {
  if (typeof window === 'undefined') return false;
  const dismissed = localStorage.getItem(DISMISS_KEY);
  return dismissed === getToday();
}

const EMOTIONAL_TAGS = new Set(['FOMO', 'REVENGE', 'IMPULSE']);

function detectLossStreak(trades: Trade[]): RiskAlert | null {
  // Sort by date desc, count consecutive SELL-side losses (simplified: recent trades)
  // For simplicity, look at recent trades and check for consecutive losses based on pattern
  const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date));
  const sells = sorted.filter(t => t.side === 'SELL');

  let streak = 0;
  // We need buy prices to determine if a sell is a loss — approximate by checking
  // if there's a matching buy with higher price
  for (const sell of sells) {
    const matchingBuy = sorted.find(
      t => t.side === 'BUY' && t.symbol === sell.symbol && t.date <= sell.date
    );
    if (matchingBuy && sell.price < matchingBuy.price) {
      streak++;
    } else {
      break;
    }
    if (streak >= RISK_THRESHOLDS.lossStreak) break;
  }

  if (streak >= RISK_THRESHOLDS.lossStreak) {
    return {
      type: 'loss_streak',
      message: `${streak}연패 중입니다. 잠시 매매를 멈추고 전략을 점검해보세요.`,
      severity: streak >= 5 ? 'critical' : 'warning',
    };
  }
  return null;
}

function detectOvertrading(trades: Trade[]): RiskAlert | null {
  const today = getToday();
  const todayTrades = trades.filter(t => t.date === today);

  if (todayTrades.length >= RISK_THRESHOLDS.maxDailyTrades) {
    return {
      type: 'overtrading',
      message: `오늘 ${todayTrades.length}건의 거래를 기록했습니다. 과매매에 주의하세요.`,
      severity: todayTrades.length >= 5 ? 'critical' : 'warning',
    };
  }
  return null;
}

function detectEmotionalStreak(trades: Trade[]): RiskAlert | null {
  const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date));

  let streak = 0;
  for (const trade of sorted) {
    if (trade.emotion_tag && EMOTIONAL_TAGS.has(trade.emotion_tag)) {
      streak++;
    } else {
      break;
    }
    if (streak >= RISK_THRESHOLDS.emotionalStreak) break;
  }

  if (streak >= RISK_THRESHOLDS.emotionalStreak) {
    const tags = sorted
      .slice(0, streak)
      .map(t => t.emotion_tag)
      .join(', ');
    return {
      type: 'emotional_streak',
      message: `최근 ${streak}건의 거래가 감정적 매매(${tags})입니다. 규칙에 따른 매매인지 점검하세요.`,
      severity: streak >= 3 ? 'critical' : 'warning',
    };
  }
  return null;
}

function detectDailyLoss(trades: Trade[]): RiskAlert | null {
  const today = getToday();
  const todayTrades = trades.filter(t => t.date === today);

  // Calculate rough daily P&L from buy/sell pairs
  const todayBuys = todayTrades.filter(t => t.side === 'BUY');
  const todaySells = todayTrades.filter(t => t.side === 'SELL');

  let totalInvested = 0;
  let totalLoss = 0;

  for (const sell of todaySells) {
    const buy = todayBuys.find(b => b.symbol === sell.symbol);
    if (buy) {
      const invested = buy.price * Math.min(buy.quantity, sell.quantity);
      const pnl = (sell.price - buy.price) * Math.min(buy.quantity, sell.quantity);
      totalInvested += invested;
      if (pnl < 0) totalLoss += Math.abs(pnl);
    }
  }

  if (totalInvested > 0) {
    const lossPercent = (totalLoss / totalInvested) * 100;
    if (lossPercent >= RISK_THRESHOLDS.dailyLossPercent) {
      return {
        type: 'daily_loss',
        message: `오늘 누적 손실이 투자금 대비 ${lossPercent.toFixed(1)}%입니다. 추가 손실 확대에 주의하세요.`,
        severity: lossPercent >= 10 ? 'critical' : 'warning',
      };
    }
  }
  return null;
}

// ─── Hook ────────────────────────────────────────────────────────────────

export function useRiskAlert(trades: Trade[]) {
  const [dismissed, setDismissed] = useState(isDismissedToday());

  const alerts = useMemo<RiskAlert[]>(() => {
    if (dismissed || trades.length === 0) return [];

    const detectors = [
      detectLossStreak,
      detectOvertrading,
      detectEmotionalStreak,
      detectDailyLoss,
    ];

    return detectors
      .map(fn => fn(trades))
      .filter((a): a is RiskAlert => a !== null);
  }, [trades, dismissed]);

  const dismissToday = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, getToday());
    setDismissed(true);
  }, []);

  const acknowledge = useCallback(() => {
    // Just hide without persisting — alerts will reappear on next trade
    setDismissed(true);
  }, []);

  // Reset dismissed state when a new trade is added (trade count changes)
  const resetIfNeeded = useCallback(() => {
    if (!isDismissedToday()) {
      setDismissed(false);
    }
  }, []);

  return {
    alerts,
    hasAlerts: alerts.length > 0,
    dismissToday,
    acknowledge,
    resetIfNeeded,
  };
}
