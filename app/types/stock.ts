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

export type ChartPeriod = '1d' | '5d' | '1mo' | '3mo' | '1y';

export interface ChartPeriodOption {
    label: string;
    value: ChartPeriod;
    range: string;
    interval: string;
}
