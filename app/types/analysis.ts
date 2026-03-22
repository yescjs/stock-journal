// Trade analysis types for AI-powered insights

export interface RoundTrip {
  symbol: string;
  symbolName?: string;
  entryDate: string;      // YYYY-MM-DD
  exitDate: string;       // YYYY-MM-DD
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  holdingDays: number;
  pnl: number;            // Absolute P&L
  pnlPercent: number;     // Percentage P&L
  emotionTag?: string;
  strategyName?: string;
  entryWeekday: number;   // 0=Sun, 6=Sat
  exitWeekday: number;
  isWin: boolean;
  currency: 'KRW' | 'USD';
}

export interface PatternStats {
  label: string;
  count: number;
  wins: number;
  losses: number;
  winRate: number;        // 0-100
  avgReturn: number;      // Percentage
  totalPnl: number;
  bestReturn: number;
  worstReturn: number;
  currency?: 'KRW' | 'USD' | 'mixed';
}

export type TradingStyle = 'day_trader' | 'swing_trader' | 'position_trader' | 'investor';
export type PerformanceGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ConcentrationItem {
  symbol: string;
  symbolName?: string;
  percentage: number;     // 0-100
  investedAmount: number;
  isRisky: boolean;       // > 30% = risky
}

export interface StreakInfo {
  currentWin: number;
  currentLoss: number;
  maxWin: number;
  maxLoss: number;
}

export interface UserProfile {
  tradingStyle: TradingStyle;
  tradingStyleLabel: string;
  riskLevel: RiskLevel;
  riskLevelLabel: string;
  overallGrade: PerformanceGrade;
  totalTrades: number;
  winRate: number;
  avgReturn: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  avgHoldingDays: number;
  consistencyScore: number; // 0-100
}

export interface BehaviorBiasScore {
  fomoRatio: number;           // FOMO 태그 비율 (0-1)
  revengeRatio: number;        // REVENGE 태그 비율 (0-1)
  impulsiveRatio: number;      // IMPULSE 태그 비율 (0-1)
  overTradingDays: number;     // 하루 3건 이상 거래한 날 수
  consecutiveLossEntry: number; // 손실 직후 당일 재진입 횟수
  biasScore: number;           // 종합 편향 점수 (0-100, 높을수록 규율 양호)
}

export interface TimingMetrics {
  avgWinHoldingDays: number;   // 수익 거래 평균 보유일
  avgLossHoldingDays: number;  // 손실 거래 평균 보유일
  earlyExitRatio: number;      // 손실 거래 중 평균보다 짧게 보유한 비율
  holdingEdge: number;         // avgLoss - avgWin (양수 = 손절이 더 빠름)
}

export interface AdvancedMetrics {
  rrRatio: number;             // |평균수익| / |평균손실|
  expectancy: number;          // (승률×평균수익%) - (패율×|평균손실%|)
  volatility: number;          // 수익률 표준편차
  sharpeProxy: number;         // 평균수익률 / 표준편차
  biasScore: BehaviorBiasScore;
  timing: TimingMetrics;
  rrRatioBenchmark: 'excellent' | 'good' | 'fair' | 'poor';
  expectancyBenchmark: 'positive' | 'negative';
}

export interface TradeAnalysis {
  // Matched round trips (completed trades)
  roundTrips: RoundTrip[];

  // Pattern stats
  weekdayStats: PatternStats[];
  holdingPeriodStats: PatternStats[];
  emotionStats: PatternStats[];
  strategyStats: PatternStats[];

  // Portfolio concentration
  concentration: ConcentrationItem[];

  // Win/loss streaks
  streaks: StreakInfo;

  // User profile summary
  profile: UserProfile;

  // Auto-generated insight sentences
  insights: InsightItem[];

  // Advanced metrics for AI analysis
  advancedMetrics: AdvancedMetrics;

  // Timestamp of analysis
  analyzedAt: string;
}

export interface InsightItem {
  id: string;
  icon: string;           // Emoji icon
  type: 'positive' | 'warning' | 'neutral' | 'critical';
  title: string;
  description: string;
}

// Holding period categories - locale aware
export const HOLDING_PERIOD_LABELS_I18N: Record<string, Record<string, { label: string; minDays: number; maxDays: number }>> = {
  ko: {
    dayTrade: { label: '데이트레이딩 (당일)', minDays: 0, maxDays: 0 },
    shortSwing: { label: '단기 스윙 (1~3일)', minDays: 1, maxDays: 3 },
    swing: { label: '스윙 (4~14일)', minDays: 4, maxDays: 14 },
    position: { label: '포지션 (15~60일)', minDays: 15, maxDays: 60 },
    longTerm: { label: '장기 투자 (60일+)', minDays: 61, maxDays: Infinity },
  },
  en: {
    dayTrade: { label: 'Day Trade (Same day)', minDays: 0, maxDays: 0 },
    shortSwing: { label: 'Short Swing (1-3d)', minDays: 1, maxDays: 3 },
    swing: { label: 'Swing (4-14d)', minDays: 4, maxDays: 14 },
    position: { label: 'Position (15-60d)', minDays: 15, maxDays: 60 },
    longTerm: { label: 'Long Term (60d+)', minDays: 61, maxDays: Infinity },
  },
};

// Keep backward compatible default
export const HOLDING_PERIOD_LABELS = HOLDING_PERIOD_LABELS_I18N.ko;

// Weekday labels
export const WEEKDAY_LABELS_I18N: Record<string, string[]> = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};
export const WEEKDAY_LABELS = WEEKDAY_LABELS_I18N.ko;

// Emotion tag labels
export const EMOTION_LABELS_I18N: Record<string, Record<string, string>> = {
  ko: {
    PLANNED: '계획된 매매',
    FOMO: 'FOMO (놓칠까봐)',
    FEAR: '공포 매매',
    GREED: '탐욕 매매',
    REVENGE: '복수 매매',
    IMPULSE: '충동 매매',
  },
  en: {
    PLANNED: 'Planned Trade',
    FOMO: 'FOMO',
    FEAR: 'Fear',
    GREED: 'Greed',
    REVENGE: 'Revenge',
    IMPULSE: 'Impulse',
  },
};
export const EMOTION_LABELS = EMOTION_LABELS_I18N.ko;

// Trading style labels
export const TRADING_STYLE_LABELS_I18N: Record<string, Record<TradingStyle, string>> = {
  ko: {
    day_trader: '데이트레이더',
    swing_trader: '스윙 트레이더',
    position_trader: '포지션 트레이더',
    investor: '장기 투자자',
  },
  en: {
    day_trader: 'Day Trader',
    swing_trader: 'Swing Trader',
    position_trader: 'Position Trader',
    investor: 'Long-term Investor',
  },
};
export const TRADING_STYLE_LABELS = TRADING_STYLE_LABELS_I18N.ko;

// Risk level labels
export const RISK_LEVEL_LABELS_I18N: Record<string, Record<RiskLevel, string>> = {
  ko: {
    low: '안정형',
    medium: '중립형',
    high: '공격형',
    critical: '초고위험',
  },
  en: {
    low: 'Conservative',
    medium: 'Moderate',
    high: 'Aggressive',
    critical: 'Very High Risk',
  },
};
export const RISK_LEVEL_LABELS = RISK_LEVEL_LABELS_I18N.ko;

// No-tag label
export const NO_TAG_LABEL_I18N: Record<string, string> = {
  ko: '미설정',
  en: 'Untagged',
};

// Close/exit label for equity curve
export const CLOSE_LABEL_I18N: Record<string, string> = {
  ko: '청산',
  en: 'Closed',
};

// Weekday suffix
export const WEEKDAY_SUFFIX_I18N: Record<string, string> = {
  ko: '요일',
  en: '',
};

export interface MonthlyStats {
  month: string;        // YYYY-MM
  label: string;        // e.g., "24년 1월"
  totalPnl: number;
  winCount: number;
  lossCount: number;
  winRate: number;      // 0-100
  avgReturn: number;    // percentage
  tradeCount: number;
  currency: 'KRW' | 'USD' | 'mixed';
}

export interface EquityCurvePoint {
  date: string;         // YYYY-MM-DD
  cumulativePnl: number;
  tradeLabel: string;   // "{symbol} 청산"
}

// Performance grade colors
export const GRADE_COLORS: Record<PerformanceGrade, string> = {
  'A+': 'text-yellow-400',
  'A': 'text-emerald-400',
  'B+': 'text-green-400',
  'B': 'text-blue-400',
  'C+': 'text-cyan-400',
  'C': 'text-white/60',
  'D': 'text-orange-400',
  'F': 'text-red-400',
};
