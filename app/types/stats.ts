export interface SymbolSummary {
    symbol: string;
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

export type PnLChartMode = 'daily' | 'monthly';

export type PnLPoint = {
    key: string;   // YYYY-MM-DD or YYYY-MM
    label: string; // Display label
    value: number; // Realized PnL
};

export interface OverallStats {
    totalBuyAmount: number;
    totalSellAmount: number;
    totalRealizedPnL: number;
    totalOpenCostBasis: number;
    totalOpenMarketValue: number;
    evalPnL: number;
    totalPnL: number;
    holdingReturnRate: number;
}
