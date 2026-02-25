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

// Holding period categories
export const HOLDING_PERIOD_LABELS: Record<string, { label: string; minDays: number; maxDays: number }> = {
  dayTrade: { label: '데이트레이딩 (당일)', minDays: 0, maxDays: 0 },
  shortSwing: { label: '단기 스윙 (1~3일)', minDays: 1, maxDays: 3 },
  swing: { label: '스윙 (4~14일)', minDays: 4, maxDays: 14 },
  position: { label: '포지션 (15~60일)', minDays: 15, maxDays: 60 },
  longTerm: { label: '장기 투자 (60일+)', minDays: 61, maxDays: Infinity },
};

// Weekday labels in Korean
export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// Emotion tag labels in Korean
export const EMOTION_LABELS: Record<string, string> = {
  PLANNED: '계획된 매매',
  FOMO: 'FOMO (놓칠까봐)',
  FEAR: '공포 매매',
  GREED: '탐욕 매매',
  REVENGE: '복수 매매',
  IMPULSE: '충동 매매',
};

// Trading style labels in Korean
export const TRADING_STYLE_LABELS: Record<TradingStyle, string> = {
  day_trader: '데이트레이더',
  swing_trader: '스윙 트레이더',
  position_trader: '포지션 트레이더',
  investor: '장기 투자자',
};

// Risk level labels in Korean
export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: '안정형',
  medium: '중립형',
  high: '공격형',
  critical: '초고위험',
};

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
