import { useState, useMemo } from 'react';
import { Trade } from '@/app/types/trade';
import { TagFilterMode } from '@/app/types/ui';

export function useTradeFilter(trades: Trade[]) {
    // Basic Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterSymbol, setFilterSymbol] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const [tagFilterMode, setTagFilterMode] = useState<TagFilterMode>('OR');

    // Drill-down State
    const [selectedSymbol, setSelectedSymbol] = useState<string>('');

    // Available tags for autocomplete
    const allTags = useMemo(() => {
        const set = new Set<string>();
        trades.forEach(t => t.tags?.forEach(tag => set.add(tag)));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [trades]);

    // Computed Filtered List
    const filteredTrades = useMemo(() => {
        let result = trades;

        // Symbol Filter (Input)
        if (filterSymbol) {
            const lower = filterSymbol.toLowerCase();
            result = result.filter(t => t.symbol.toLowerCase().includes(lower));
        }

        // Tag Filter
        if (filterTag) {
            const keywords = filterTag.split(/[,\s]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
            if (keywords.length > 0) {
                result = result.filter(t => {
                    const tTags = (t.tags ?? []).map(tag => tag.toLowerCase());
                    if (tTags.length === 0) return false;
                    if (tagFilterMode === 'AND') {
                        return keywords.every(kw => tTags.some(tag => tag.includes(kw)));
                    } else {
                        return keywords.some(kw => tTags.some(tag => tag.includes(kw)));
                    }
                });
            }
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
    }, [trades, filterSymbol, filterTag, tagFilterMode, selectedSymbol, dateFrom, dateTo]);

    const resetFilters = () => {
        setFilterSymbol('');
        setFilterTag('');
        setDateFrom('');
        setDateTo('');
        setTagFilterMode('OR');
        setSelectedSymbol('');
    };

    return {
        filteredTrades,
        allTags,
        filterSymbol,
        setFilterSymbol,
        filterTag,
        setFilterTag,
        tagFilterMode,
        setTagFilterMode,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        selectedSymbol,
        setSelectedSymbol,
        resetFilters
    };
}
