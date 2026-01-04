import { useState, useEffect } from 'react';

const CURRENT_PRICE_KEY = 'stock-journal-current-prices-v1';

export function useMarketData() {
    // Current Prices State
    const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

    // Exchange Rate State (KRW per USD) - Default 1476 as in original code
    const [exchangeRate, setExchangeRate] = useState<number>(1476);

    // UI Logic: Show converted values?
    const [showConverted, setShowConverted] = useState(false);

    // Load Prices from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem(CURRENT_PRICE_KEY);
        if (saved) {
            try {
                setCurrentPrices(JSON.parse(saved));
            } catch { }
        }
    }, []);

    // Save Prices to LocalStorage
    useEffect(() => {
        localStorage.setItem(CURRENT_PRICE_KEY, JSON.stringify(currentPrices));
    }, [currentPrices]);

    // Fetch Exchange Rate (Real-time)
    useEffect(() => {
        const fetchExchangeRate = async () => {
            try {
                const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();
                if (data && data.rates && data.rates.KRW) {
                    setExchangeRate(data.rates.KRW);
                }
            } catch (error) {
                console.error("Failed to fetch exchange rate:", error);
                // Fallback or keep default
            }
        };

        fetchExchangeRate();
        // Optional: Refresh every hour
        const interval = setInterval(fetchExchangeRate, 3600000);
        return () => clearInterval(interval);
    }, []);

    const handleCurrentPriceChange = (symbol: string, value: string) => {
        const num = Number(value);
        setCurrentPrices(prev => {
            if (!value) {
                const next = { ...prev };
                delete next[symbol];
                return next;
            }
            return { ...prev, [symbol]: num };
        });
    };

    return {
        currentPrices,
        setCurrentPrices,
        handleCurrentPriceChange,
        exchangeRate,
        setExchangeRate,
        showConverted,
        setShowConverted
    };
}
