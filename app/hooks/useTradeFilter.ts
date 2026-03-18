import { useState, useMemo, useCallback } from 'react';
import { Trade } from '@/app/types/trade';

export type DatePreset = 'today' | 'week' | 'month' | 'year' | 'all';

/**
 * Calculate held symbols: symbols where total BUY qty > total SELL qty.
 */
function getHeldSymbols(trades: Trade[]): Set<string> {
    const netQty = new Map<string, number>();
    for (const t of trades) {
        const current = netQty.get(t.symbol) ?? 0;
        netQty.set(t.symbol, current + (t.side === 'BUY' ? t.quantity : -t.quantity));
    }
    const held = new Set<string>();
    for (const [symbol, qty] of netQty) {
        if (qty > 0) held.add(symbol);
    }
    return held;
}

export function useTradeFilter(trades: Trade[]) {
    // Basic Filters (internal raw setters)
    const [dateFrom, setDateFromInternal] = useState('');
    const [dateTo, setDateToInternal] = useState('');
    const [filterSymbol, setFilterSymbol] = useState('');
    const [holdingOnly, setHoldingOnly] = useState(false);

    // Date preset state
    const [activeDatePreset, setActiveDatePreset] = useState<DatePreset | null>(null);

    // Drill-down State
    const [selectedSymbol, setSelectedSymbol] = useState<string>('');

    // Pre-compute held symbols for filtering
    const heldSymbols = useMemo(() => getHeldSymbols(trades), [trades]);

    // Wrapped setters that clear activeDatePreset on manual change
    const setDateFrom = useCallback((v: string) => {
        setDateFromInternal(v);
        setActiveDatePreset(null);
    }, []);

    const setDateTo = useCallback((v: string) => {
        setDateToInternal(v);
        setActiveDatePreset(null);
    }, []);

    // Apply a date preset (bypasses wrapper to keep preset active)
    const applyDatePreset = useCallback((preset: DatePreset) => {
        const today = new Date().toISOString().slice(0, 10);
        setActiveDatePreset(preset);
        switch (preset) {
            case 'today':
                setDateFromInternal(today);
                setDateToInternal(today);
                break;
            case 'week': {
                const d = new Date();
                const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon...
                const monday = new Date(d);
                monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                setDateFromInternal(monday.toISOString().slice(0, 10));
                setDateToInternal(today);
                break;
            }
            case 'month':
                setDateFromInternal(today.slice(0, 7) + '-01');
                setDateToInternal(today);
                break;
            case 'year':
                setDateFromInternal(today.slice(0, 4) + '-01-01');
                setDateToInternal(today);
                break;
            case 'all':
                setDateFromInternal('');
                setDateToInternal('');
                break;
        }
    }, []);

    // Computed Filtered List
    const filteredTrades = useMemo(() => {
        let result = trades;

        // Holding Only Filter
        if (holdingOnly) {
            result = result.filter(t => heldSymbols.has(t.symbol));
        }

        // Symbol Filter (Input)
        if (filterSymbol) {
            const lower = filterSymbol.toLowerCase();
            result = result.filter(t =>
                t.symbol.toLowerCase().includes(lower) ||
                (t.symbol_name && t.symbol_name.toLowerCase().includes(lower))
            );
        }

        // Selected Symbol (Drill-down)
        if (selectedSymbol) {
            result = result.filter(t => t.symbol === selectedSymbol);
        }

        // Date Filter
        if (dateFrom) {
            result = result.filter(t => t.date >= dateFrom);
        }
        if (dateTo) {
            result = result.filter(t => t.date <= dateTo);
        }

        return result;
    }, [trades, filterSymbol, selectedSymbol, dateFrom, dateTo, holdingOnly, heldSymbols]);

    const resetFilters = () => {
        setFilterSymbol('');
        setDateFromInternal('');
        setDateToInternal('');
        setSelectedSymbol('');
        setHoldingOnly(false);
        setActiveDatePreset(null);
    };

    return {
        filteredTrades,
        filterSymbol,
        setFilterSymbol,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        selectedSymbol,
        setSelectedSymbol,
        holdingOnly,
        setHoldingOnly,
        heldSymbols,
        resetFilters,
        activeDatePreset,
        applyDatePreset,
    };
}
