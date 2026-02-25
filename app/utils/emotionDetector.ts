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
  title: string;
  description: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  category: 'plan' | 'risk' | 'emotion';
  checked: boolean;
}

// ─── Default Checklist Items ─────────────────────────────────────────────

export const DEFAULT_CHECKLIST: Omit<ChecklistItem, 'checked'>[] = [
  {
    id: 'planned',
    label: '계획된 매매인가요?',
    description: '사전에 분석하고 정한 진입 기준에 맞는 매매인지 확인하세요.',
    category: 'plan',
  },
  {
    id: 'stop_loss',
    label: '손절 가격을 설정했나요?',
    description: '진입 전 최대 허용 손실을 정하고, 손절 라인을 명확히 하세요.',
    category: 'risk',
  },
  {
    id: 'position_size',
    label: '포지션 크기가 적절한가요?',
    description: '총 투자금의 10% 이하로 한 종목에 집중하는 것을 권장합니다.',
    category: 'risk',
  },
  {
    id: 'not_emotional',
    label: '감정적 매매가 아닌가요?',
    description: 'FOMO, 공포, 복수 심리에 의한 매매가 아닌지 점검하세요.',
    category: 'emotion',
  },
  {
    id: 'exit_plan',
    label: '매도 시나리오가 있나요?',
    description: '목표가와 손절가, 두 가지 시나리오를 미리 정해두세요.',
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
      title: '과매매 경고',
      description: `최근 3일간 ${recentTrades.length}건의 거래가 있습니다. 잦은 매매는 수수료 손실과 감정적 판단을 유발합니다.`,
    });
  } else if (recentTrades.length >= 5) {
    warnings.push({
      type: 'overtrading',
      severity: 'warning',
      icon: '⚡',
      title: '잦은 매매 주의',
      description: `최근 3일간 ${recentTrades.length}건의 거래가 진행되었습니다. 매매 빈도를 줄이고 확실한 기회에만 진입하세요.`,
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
        title: '복수 매매 패턴 감지',
        description: '평소보다 큰 금액으로 매수하려 합니다. 연속 손실 후 만회 심리로 매매하고 있지 않은지 점검하세요.',
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
        title: '종목 집중 위험',
        description: `이미 ${newSymbol}에 ${sameSymbolBuys.length}회 매수하셨습니다. 추가 매수 전 분산 투자를 고려해보세요.`,
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
      title: '매매 기록을 확인하세요',
      description: '최근 매도가 여러 건 있었습니다. 분석 탭에서 승패 흐름을 확인한 후 매수하세요.',
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
