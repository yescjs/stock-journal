import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface UseCurrentPricesResult {
    currentPrices: Record<string, number>;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch current prices for symbols extracted from trades.
 * Auto-refreshes every 5 minutes.
 * Uses useMemo to stabilize symbol list and prevent unnecessary refetches.
 */
export function useCurrentPrices(
    trades: { symbol: string; side: string }[]
): UseCurrentPricesResult {
    const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Stabilize symbol extraction with useMemo to prevent re-renders
    // when trades reference changes but actual BUY symbols remain the same
    const symbolsKey = useMemo(() => {
        const symbols = Array.from(
            new Set(
                trades
                    .filter(t => t.side === 'BUY')
                    .map(t => t.symbol)
            )
        );
        return symbols.sort().join(',');
    }, [trades]);

    const fetchPrices = useCallback(async () => {
        if (!symbolsKey) {
            setCurrentPrices({});
            return;
        }

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/stock-price?symbols=${encodeURIComponent(symbolsKey)}`,
                { signal: controller.signal }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.prices) {
                setCurrentPrices(data.prices);
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') return;
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('Failed to fetch current prices:', message);
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [symbolsKey]);

    // Fetch on mount and when symbols change
    useEffect(() => {
        fetchPrices();

        const intervalId = setInterval(fetchPrices, REFRESH_INTERVAL);

        return () => {
            clearInterval(intervalId);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchPrices]);

    return { currentPrices, loading, error, refresh: fetchPrices };
}
