// Emotion-based trading pattern detector
// Detects overtrading, revenge trading, FOMO, and other emotional patterns
import { Trade } from '@/app/types/trade';

// ─── Types ───────────────────────────────────────────────────────────────

export type EmotionWarningType = 'overtrading' | 'revenge' | 'fomo' | 'concentration' | 'loss_streak';
export type WarningSeverity = 'info' | 'warning' | 'critical';

export interface EmotionWarning {
  type: EmotionWarningType;
  severity: WarningSeverity;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  descriptionParams?: Record<string, string | number>;
}

export interface ChecklistItem {
  id: string;
  labelKey: string;
  descriptionKey: string;
  category: 'plan' | 'risk' | 'emotion';
  checked: boolean;
}

// ─── Default Checklist Items ─────────────────────────────────────────────

export const DEFAULT_CHECKLIST: Omit<ChecklistItem, 'checked'>[] = [
  {
    id: 'planned',
    labelKey: 'emotion.checklist.planned',
    descriptionKey: 'emotion.checklist.plannedDesc',
    category: 'plan',
  },
  {
    id: 'stop_loss',
    labelKey: 'emotion.checklist.stopLoss',
    descriptionKey: 'emotion.checklist.stopLossDesc',
    category: 'risk',
  },
  {
    id: 'position_size',
    labelKey: 'emotion.checklist.positionSize',
    descriptionKey: 'emotion.checklist.positionSizeDesc',
    category: 'risk',
  },
  {
    id: 'not_emotional',
    labelKey: 'emotion.checklist.notEmotional',
    descriptionKey: 'emotion.checklist.notEmotionalDesc',
    category: 'emotion',
  },
  {
    id: 'exit_plan',
    labelKey: 'emotion.checklist.exitPlan',
    descriptionKey: 'emotion.checklist.exitPlanDesc',
    category: 'plan',
  },
];

// ─── Detection Logic ─────────────────────────────────────────────────────

/**
 * Detect emotional trading patterns based on recent trade history.
 * Called before a new trade is submitted.
 */
export function detectEmotionPatterns(
  existingTrades: Trade[],
  newSide: 'BUY' | 'SELL',
  newSymbol: string,
  newAmount: number // price * quantity
): EmotionWarning[] {
  const warnings: EmotionWarning[] = [];
  const now = new Date();

  // 1. Overtrading: too many trades in a short period
  const recentTrades = existingTrades.filter(t => {
    const diff = now.getTime() - new Date(t.date).getTime();
    return diff < 3 * 24 * 60 * 60 * 1000; // last 3 days
  });

  if (recentTrades.length >= 8) {
    warnings.push({
      type: 'overtrading',
      severity: 'critical',
      icon: '⚡',
      titleKey: 'emotion.warnings.overtradingCriticalTitle',
      descriptionKey: 'emotion.warnings.overtradingCriticalDesc',
      descriptionParams: { count: recentTrades.length },
    });
  } else if (recentTrades.length >= 5) {
    warnings.push({
      type: 'overtrading',
      severity: 'warning',
      icon: '⚡',
      titleKey: 'emotion.warnings.overtradingWarningTitle',
      descriptionKey: 'emotion.warnings.overtradingWarningDesc',
      descriptionParams: { count: recentTrades.length },
    });
  }

  // 2. Revenge Trading: big buy right after consecutive losses
  if (newSide === 'BUY') {
    const recentSells = existingTrades
      .filter(t => t.side === 'SELL')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    // Check if we have trade performance context (consecutive losses)
    // Simplified: check if the last few sells were at lower prices than their buys
    const avgTradeAmount = existingTrades.length > 0
      ? existingTrades.reduce((sum, t) => sum + t.price * t.quantity, 0) / existingTrades.length
      : 0;

    if (recentSells.length >= 2 && newAmount > avgTradeAmount * 1.5 && avgTradeAmount > 0) {
      warnings.push({
        type: 'revenge',
        severity: 'warning',
        icon: '🔥',
        titleKey: 'emotion.warnings.revengeTitle',
        descriptionKey: 'emotion.warnings.revengeDesc',
      });
    }
  }

  // 3. Concentration Risk: buying same stock repeatedly
  if (newSide === 'BUY') {
    const sameSymbolBuys = existingTrades.filter(
      t => t.symbol === newSymbol && t.side === 'BUY'
    );
    const sameSymbolSells = existingTrades.filter(
      t => t.symbol === newSymbol && t.side === 'SELL'
    );
    const totalBuyQty = sameSymbolBuys.reduce((s, t) => s + t.quantity, 0);
    const totalSellQty = sameSymbolSells.reduce((s, t) => s + t.quantity, 0);
    const holdingQty = totalBuyQty - totalSellQty;

    if (holdingQty > 0 && sameSymbolBuys.length >= 3) {
      warnings.push({
        type: 'concentration',
        severity: 'warning',
        icon: '📊',
        titleKey: 'emotion.warnings.concentrationTitle',
        descriptionKey: 'emotion.warnings.concentrationDesc',
        descriptionParams: { symbol: newSymbol, count: sameSymbolBuys.length },
      });
    }
  }

  // 4. Loss Streak Warning
  const tradeDates = [...new Set(existingTrades.map(t => t.date))].sort().reverse();
  const recentDayTrades = tradeDates.slice(0, 5).flatMap(date =>
    existingTrades.filter(t => t.date === date && t.side === 'SELL')
  );
  // Simple heuristic: warn if there were many sells recently
  if (recentDayTrades.length >= 3 && newSide === 'BUY') {
    warnings.push({
      type: 'loss_streak',
      severity: 'info',
      icon: '💭',
      titleKey: 'emotion.warnings.lossStreakTitle',
      descriptionKey: 'emotion.warnings.lossStreakDesc',
    });
  }

  return warnings;
}

/**
 * Calculate a discipline score (0-100) based on checklist completion.
 */
export function calcDisciplineScore(checklist: ChecklistItem[]): number {
  if (checklist.length === 0) return 0;
  const checked = checklist.filter(c => c.checked).length;
  return Math.round((checked / checklist.length) * 100);
}
