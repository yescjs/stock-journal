'use client';

import { useEffect, useState } from 'react';
import { ChartPeriod, StockAnalysisResponse } from '@/app/types/stock';

interface UseStockAnalysisResult {
    data: StockAnalysisResponse | null;
    loading: boolean;
    error: string | null;
}

export function useStockAnalysis(symbol: string, period: ChartPeriod): UseStockAnalysisResult {
    const [data, setData] = useState<StockAnalysisResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!symbol) return;

        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`/api/stock-analysis?symbol=${encodeURIComponent(symbol)}&period=${period}`);
                if (!response.ok) {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(body.error || `Failed to fetch analysis: ${response.status}`);
                }
                const payload = (await response.json()) as StockAnalysisResponse;
                setData(payload);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : '분석 데이터를 불러올 수 없습니다';
                setError(message);
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [symbol, period]);

    return { data, loading, error };
}
