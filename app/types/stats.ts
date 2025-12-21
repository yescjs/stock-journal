export interface SymbolSummary {
    symbol: string;
    symbol_name?: string;  // Korean/English stock name
    totalBuyQty: number;
    totalBuyAmount: number;
    totalSellQty: number;
    totalSellAmount: number;
    positionQty: number;
    avgCost: number;
    costBasis: number;
    realizedPnL: number;
    winCount: number;
    lossCount: number;
    evenCount: number;
    tradeCount: number;
    winRate: number;
    unrealizedPnL: number;
    currentValuation: number;
    totalPnL: number;
    avgPnL: number;
}

export interface TagPerf {
    tag: string;
    tradeCount: number;
    winCount: number;
    lossCount: number;
    evenCount: number;
    realizedPnL: number;
    avgPnLPerTrade: number;
    winRate: number;
}

// 전략별 성과 분석
export interface StrategyPerf {
    strategyId: string;
    strategyName: string;
    tradeCount: number;
    winCount: number;
    lossCount: number;
    evenCount: number;
    winRate: number;
    totalPnL: number;
    avgPnLPerTrade: number;
    maxWin: number;
    maxLoss: number;
}

export type PnLChartMode = 'daily' | 'monthly';

export type PnLPoint = {
    key: string;   // YYYY-MM-DD or YYYY-MM
    label: string; // Display label
    value: number; // Realized PnL
    todayPnL?: number; // Optional daily pnl
};

// 에쿼티 커브용 데이터 포인트
export interface EquityPoint {
    date: string;        // YYYY-MM-DD
    cumulativePnL: number;  // 누적 손익
    drawdown: number;       // 드로다운 (음수)
    drawdownPercent: number; // 드로다운 퍼센트
}

// 요일별 통계
export interface WeekdayStats {
    day: string;         // 월, 화, 수...
    dayIndex: number;    // 0-6 (일-토)
    tradeCount: number;
    winCount: number;
    lossCount: number;
    winRate: number;
    totalPnL: number;
    avgPnL: number;
}

// 보유 기간별 분석
export interface HoldingPeriodStats {
    period: string;           // "당일", "1~3일", "4~7일", "1~2주", "2주~1달", "1달+"
    periodKey: number;        // 정렬용 키
    tradeCount: number;
    winCount: number;
    lossCount: number;
    winRate: number;
    totalPnL: number;
    avgPnL: number;
    avgHoldingDays: number;
}

// 월별 목표
export interface MonthlyGoal {
    id: string;
    user_id: string;
    year: number;
    month: number;             // 1-12
    target_pnl: number;        // 목표 수익
    target_trades: number;     // 목표 거래 횟수
    target_win_rate: number;   // 목표 승률 (0-100)
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

export interface MonthlyProgress {
    month: string;             // YYYY-MM
    goal?: MonthlyGoal;
    actualPnL: number;
    actualTrades: number;
    actualWinRate: number;
    pnlProgress: number;       // 달성률 (%)
    tradesProgress: number;
    winRateProgress: number;
}

export interface InsightData {
    bestDay: string;
    bestTag: string;
    longWinRate: number;
    shortWinRate: number;
    maxWin: number;
    maxLoss: number;

    // 연속 손익 트래킹
    currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
    maxWinStreak: number;
    maxLossStreak: number;

    // 드로다운
    maxDrawdown: number;         // 최대 드로다운 금액
    maxDrawdownPercent: number;  // 최대 드로다운 퍼센트
};

export interface OverallStats {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    totalPnL: number;
    avgWin: number;
    avgLoss: number;
    maxWin: number;
    maxLoss: number;
    currentStreak: number;
    longestWinStreak: number;
    longestLossStreak: number;
}

// 계좌 자산 추적
export interface AccountBalance {
    id: string;
    user_id: string;
    date: string;           // YYYY-MM-DD
    balance: number;        // 총 자산
    deposit: number;        // 입금액
    withdrawal: number;     // 출금액
    notes?: string;
    created_at?: string;
}

// 포지션 리스크
export interface PositionRisk {
    symbol: string;
    symbolName?: string;
    positionValue: number;      // 포지션 금액
    positionPercent: number;    // 총 자산 대비 비중 (%)
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// 리스크 설정
export interface RiskSettings {
    maxPositionPercent: number;     // 최대 종목 비중 (기본 20%)
    maxDailyLossPercent: number;    // 일일 최대 손실률 (기본 3%)
    maxDailyLossAmount: number;     // 일일 최대 손실 금액
    alertEnabled: boolean;
}

