// Stock chart data types

export interface StockChartData {
    date: number;        // Unix timestamp
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface StockChartResponse {
    symbol: string;
    prices: StockChartData[];
}

export type ChartPeriod = '1d' | '5d' | '1mo' | '3mo' | '1y' | '3y';

export interface ChartPeriodOption {
    label: string;
    value: ChartPeriod;
    range: string;
    interval: string;
}

export type RSIStatus = 'overbought' | 'oversold' | 'neutral';
export type MACDTrend = 'bullish' | 'bearish' | 'neutral';
export type BBANDSPosition = 'above' | 'below' | 'inside';
export type ADXStrength = 'strong' | 'moderate' | 'weak';
export type StochStatus = 'overbought' | 'oversold' | 'neutral';

export interface RSIIndicator {
    value: number;
    status: RSIStatus;
    asOf: number;
}

export interface MACDIndicator {
    macd: number;
    signal: number;
    hist: number;
    trend: MACDTrend;
    asOf: number;
}

export interface BBANDSIndicator {
    upper: number;
    middle: number;
    lower: number;
    asOf: number;
}

export interface ADXIndicator {
    value: number;
    strength: ADXStrength;
    asOf: number;
}

export interface StochIndicator {
    slowK: number;
    slowD: number;
    status: StochStatus;
    asOf: number;
}

export interface StockAnalysisErrors {
    rsi?: string;
    macd?: string;
    bbands?: string;
    adx?: string;
    stoch?: string;
}

export interface StockAnalysisResponse {
    symbol: string;
    interval: string;
    asOf: number | null;
    rsi: RSIIndicator | null;
    macd: MACDIndicator | null;
    bbands: BBANDSIndicator | null;
    adx: ADXIndicator | null;
    stoch: StochIndicator | null;
    partial: boolean;
    errors?: StockAnalysisErrors;
    stale?: boolean;
    noData?: boolean;
    debug?: Record<string, unknown>;
}
