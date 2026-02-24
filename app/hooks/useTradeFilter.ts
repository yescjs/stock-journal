import { useState, useMemo } from 'react';
import { Trade } from '@/app/types/trade';

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
    // Basic Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterSymbol, setFilterSymbol] = useState('');
    const [holdingOnly, setHoldingOnly] = useState(false);

    // Drill-down State
    const [selectedSymbol, setSelectedSymbol] = useState<string>('');

    // Pre-compute held symbols for filtering
    const heldSymbols = useMemo(() => getHeldSymbols(trades), [trades]);

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
        setDateFrom('');
        setDateTo('');
        setSelectedSymbol('');
        setHoldingOnly(false);
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
        resetFilters
    };
}

