import { useState, useEffect, useCallback } from 'react';

interface UseExchangeRateResult {
    exchangeRate: number;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

const DEFAULT_RATE = 1350;
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

/**
 * Hook to fetch and cache USD/KRW exchange rate.
 * Auto-refreshes every 30 minutes.
 */
export function useExchangeRate(): UseExchangeRateResult {
    const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_RATE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRate = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/exchange-rate');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.rate && data.rate > 0) {
                setExchangeRate(data.rate);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('Failed to fetch exchange rate:', message);
            setError(message);
            // Keep the previous rate or default
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRate();

        const intervalId = setInterval(fetchRate, REFRESH_INTERVAL);
        return () => clearInterval(intervalId);
    }, [fetchRate]);

    return { exchangeRate, loading, error, refresh: fetchRate };
}
