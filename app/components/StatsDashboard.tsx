import React, { useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import {
    SymbolSummary,
    TagPerf,
    PnLPoint,
    OverallStats,
    PnLChartMode,
} from '@/app/types/stats';
import { SymbolSortKey, TagSortKey } from '@/app/types/ui';
import { formatNumber } from '@/app/utils/format';

interface StatsDashboardProps {
    darkMode: boolean;
    currentUser: User | null;
    symbolSummaries: SymbolSummary[];
    tagStats: TagPerf[];
    overallStats: OverallStats;
    dailyRealizedPoints: PnLPoint[];
    monthlyRealizedPoints: PnLPoint[];
    currentPrices: Record<string, number>;
    onCurrentPriceChange: (symbol: string, value: string) => void;
}

export function StatsDashboard({
    darkMode,
    currentUser,
    symbolSummaries,
    tagStats,
    overallStats,
    dailyRealizedPoints,
    monthlyRealizedPoints,
    currentPrices,
    onCurrentPriceChange,
}: StatsDashboardProps) {
    const [pnlChartMode, setPnlChartMode] = useState<PnLChartMode>('daily');

    const [symbolSort, setSymbolSort] = useState<{
        key: SymbolSortKey;
        dir: 'asc' | 'desc';
    }>({
        key: 'symbol',
        dir: 'asc',
    });

    const [tagSort, setTagSort] = useState<{
        key: TagSortKey;
        dir: 'asc' | 'desc';
    }>({
        key: 'tradeCount',
        dir: 'desc',
    });

    const pnlChartPoints =
        pnlChartMode === 'daily' ? dailyRealizedPoints : monthlyRealizedPoints;

    const maxAbsPnLRaw = pnlChartPoints.reduce((max, p) => {
        const v = Number(p.value ?? 0);
        if (!Number.isFinite(v)) return max;
        return Math.max(max, Math.abs(v));
    }, 0);
    const maxAbsPnL = Number.isFinite(maxAbsPnLRaw) ? maxAbsPnLRaw : 0;

    const handleSymbolStatsSort = (key: SymbolSortKey) => {
        setSymbolSort((prev) => {
            if (prev.key === key) {
                return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
            }
            return { key, dir: 'asc' };
        });
    };

    const sortedSymbolSummaries = useMemo(() => {
        const list = [...symbolSummaries];
        const getMetric = (s: SymbolSummary): number | string => {
            switch (symbolSort.key) {
                case 'symbol':
                    return s.symbol;
                case 'positionQty':
                    return s.positionQty;
                case 'avgCost':
                    return s.avgCost;
                case 'totalBuyAmount':
                    return s.totalBuyAmount;
                case 'totalSellAmount':
                    return s.totalSellAmount;
                case 'realizedPnL':
                    return s.realizedPnL;
                case 'currentPrice':
                    return currentPrices[s.symbol] ?? 0;
                case 'positionValue':
                    return (currentPrices[s.symbol] ?? 0) * s.positionQty;
                case 'unrealizedPnL':
                    return ((currentPrices[s.symbol] ?? 0) - s.avgCost) * s.positionQty;
                case 'winRate':
                    return s.winRate;
                default:
                    return s.symbol;
            }
        };

        list.sort((a, b) => {
            const va = getMetric(a);
            const vb = getMetric(b);
            let cmp = 0;
            if (typeof va === 'string' && typeof vb === 'string')
                cmp = va.localeCompare(vb);
            else {
                const na = Number(va);
                const nb = Number(vb);
                if (na < nb) cmp = -1;
                else if (na > nb) cmp = 1;
            }
            return symbolSort.dir === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [symbolSummaries, symbolSort, currentPrices]);

    const handleTagStatsSort = (key: TagSortKey) => {
        setTagSort((prev) => {
            if (prev.key === key) {
                return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
            }
            return { key, dir: 'desc' };
        });
    };

    const sortedTagStats = useMemo(() => {
        const list = [...tagStats];
        const getMetric = (t: TagPerf): number | string => {
            switch (tagSort.key) {
                case 'tag':
                    return t.tag;
                case 'tradeCount':
                    return t.tradeCount;
                case 'winRate':
                    return t.winRate;
                case 'realizedPnL':
                    return t.realizedPnL;
                case 'avgPnLPerTrade':
                    return t.avgPnLPerTrade;
                default:
                    return t.tag;
            }
        };

        list.sort((a, b) => {
            const va = getMetric(a);
            const vb = getMetric(b);
            let cmp = 0;
            if (typeof va === 'string' && typeof vb === 'string')
                cmp = va.localeCompare(vb);
            else {
                const na = Number(va);
                const nb = Number(vb);
                if (na < nb) cmp = -1;
                else if (na > nb) cmp = 1;
            }
            return tagSort.dir === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [tagStats, tagSort]);

    if (symbolSummaries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-500 font-medium">No trading data available yet.</p>
                <p className="text-slate-400 text-sm mt-1">
                    Add your first trade in the Journal tab to see statistics.
                </p>
            </div>
        );
    }

    const cardBaseClass =
        'rounded-2xl border shadow-sm p-6 ' +
        (darkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200 shadow-slate-200/50');

    const sectionTitleClass = 'text-lg font-bold mb-4 flex items-center gap-2 ' + (darkMode ? 'text-slate-100' : 'text-slate-900');

    const tableWrapperClass = 'border rounded-xl overflow-hidden overflow-x-auto ' + (darkMode ? 'border-slate-800' : 'border-slate-200');
    const tableHeaderClass = 'text-left text-xs font-semibold uppercase tracking-wider py-3 px-4 ' + (darkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50/80 text-slate-500');
    const tableCellClass = 'py-3 px-4 text-sm border-t ' + (darkMode ? 'border-slate-800' : 'border-slate-100');

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 1. Overall Stats Cards */}
            <div className={cardBaseClass}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className={sectionTitleClass}>Portfolio Summary</h2>
                    <span className={'px-2 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ' + (currentUser ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400')}>
                        {currentUser ? 'Cloud Sync' : 'Guest Data'}
                    </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-4">
                    <StatItem label="Total Buy" value={overallStats.totalBuyAmount} darkMode={darkMode} />
                    <StatItem label="Total Sell" value={overallStats.totalSellAmount} darkMode={darkMode} />
                    <StatItem label="Realized PnL" value={overallStats.totalRealizedPnL} colorize darkMode={darkMode} />
                    <StatItem label="Unrealized PnL" value={overallStats.evalPnL} colorize darkMode={darkMode} />
                    <StatItem label="Total PnL" value={overallStats.totalPnL} colorize isLarge darkMode={darkMode} />
                    <StatItem label="Return Rate" value={overallStats.holdingReturnRate} suffix="%" colorize darkMode={darkMode} />
                </div>
            </div>

            {/* 2. PnL Chart */}
            {pnlChartPoints.length > 0 && (
                <div className={cardBaseClass}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className={sectionTitleClass}>Realized PnL History</h2>
                            <p className="text-xs text-slate-500 -mt-2">Based on closed trades (SELL)</p>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            {(['daily', 'monthly'] as PnLChartMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setPnlChartMode(mode)}
                                    className={
                                        'px-4 py-1.5 text-xs font-bold rounded-md transition-all ' +
                                        (pnlChartMode === mode
                                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')
                                    }
                                >
                                    {mode === 'daily' ? 'Daily' : 'Monthly'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-64 flex items-end gap-2 overflow-x-auto pb-2 px-2 scrollbar-thin">
                        {pnlChartPoints.map((point) => {
                            const v = Number(point.value ?? 0);
                            const ratio = maxAbsPnL > 0 ? Math.abs(v) / maxAbsPnL : 0;
                            const heightPct = Math.max(4, ratio * 100);

                            return (
                                <div
                                    key={point.key}
                                    className="flex h-full min-w-[32px] flex-1 flex-col items-center justify-end group relative"
                                >
                                    <div
                                        className={
                                            'w-full rounded-t-md transition-all duration-300 ' +
                                            (v > 0
                                                ? 'bg-emerald-400 dark:bg-emerald-500/80 group-hover:bg-emerald-500'
                                                : v < 0
                                                    ? 'bg-rose-400 dark:bg-rose-500/80 group-hover:bg-rose-500'
                                                    : 'bg-slate-200 dark:bg-slate-700')
                                        }
                                        style={{ height: `${heightPct}%` }}
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10 transition-opacity">
                                        {point.label}: {formatNumber(v)}
                                    </div>
                                    <div className="mt-2 text-[10px] font-medium text-slate-400 transform -rotate-45 origin-top-left translate-x-1">
                                        {pnlChartMode === 'daily' ? point.label.slice(5) : point.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 3. Symbol Table */}
            <div className={cardBaseClass}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className={sectionTitleClass}>Symbol Performance</h2>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        Tip: Enter current price to see evaluation
                    </span>
                </div>

                <div className={tableWrapperClass}>
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                            <tr>
                                {[
                                    { k: 'symbol', l: 'Symbol' },
                                    { k: 'positionQty', l: 'Qty' },
                                    { k: 'avgCost', l: 'Avg Cost' },
                                    { k: 'totalBuyAmount', l: 'Total Buy' },
                                    { k: 'totalSellAmount', l: 'Total Sell' },
                                    { k: 'realizedPnL', l: 'Realized PnL' },
                                    { k: 'currentPrice', l: 'Cur. Price' },
                                    { k: 'positionValue', l: 'Eval Value' },
                                    { k: 'unrealizedPnL', l: 'Eval PnL' },
                                    { k: 'winRate', l: 'Win Rate' },
                                ].map((h) => (
                                    <th
                                        key={h.k}
                                        onClick={() => handleSymbolStatsSort(h.k as SymbolSortKey)}
                                        className={tableHeaderClass + ' cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none'}
                                    >
                                        <div className="flex items-center gap-1">
                                            {h.l}
                                            {symbolSort.key === h.k && (
                                                <span className="text-[9px]">{symbolSort.dir === 'asc' ? '▲' : '▼'}</span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedSymbolSummaries.map((s) => {
                                const currentPrice = currentPrices[s.symbol];
                                const hasPrice = currentPrice !== undefined;
                                const positionValue = (s.positionQty > 0 && hasPrice) ? s.positionQty * currentPrice : 0;
                                const unrealizedPnL = (s.positionQty > 0 && hasPrice) ? (currentPrice - s.avgCost) * s.positionQty : 0;

                                return (
                                    <tr key={s.symbol} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className={tableCellClass + ' font-bold'}>{s.symbol}</td>
                                        <td className={tableCellClass}>{formatNumber(s.positionQty)}</td>
                                        <td className={tableCellClass}>{s.positionQty > 0 ? formatNumber(s.avgCost, 0) : '-'}</td>
                                        <td className={tableCellClass + ' text-slate-400'}>{formatNumber(s.totalBuyAmount)}</td>
                                        <td className={tableCellClass + ' text-slate-400'}>{formatNumber(s.totalSellAmount)}</td>
                                        <td className={tableCellClass}>
                                            <PnLText value={s.realizedPnL} />
                                        </td>
                                        <td className={tableCellClass}>
                                            {s.positionQty > 0 ? (
                                                <input
                                                    type="number"
                                                    className={
                                                        'w-20 px-2 py-1 text-right text-xs rounded border transition-colors ' +
                                                        (darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-white border-slate-200 focus:border-blue-500')
                                                    }
                                                    value={currentPrice ?? ''}
                                                    onChange={(e) => onCurrentPriceChange(s.symbol, e.target.value)}
                                                    placeholder="Price"
                                                />
                                            ) : '-'}
                                        </td>
                                        <td className={tableCellClass}>
                                            {s.positionQty > 0 ? formatNumber(positionValue) : '-'}
                                        </td>
                                        <td className={tableCellClass}>
                                            {s.positionQty > 0 ? <PnLText value={unrealizedPnL} /> : '-'}
                                        </td>
                                        <td className={tableCellClass}>
                                            {s.tradeCount > 0 ? (
                                                <span className={'px-1.5 py-0.5 rounded text-[10px] font-bold ' + (s.winRate >= 50 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400')}>
                                                    {s.winRate.toFixed(0)}%
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. Tag Table */}
            <div className={cardBaseClass}>
                <h2 className={sectionTitleClass}>Strategy / Tag Analysis</h2>
                <div className={tableWrapperClass}>
                    <table className="w-full text-left min-w-[600px]">
                        <thead>
                            <tr>
                                {[
                                    { k: 'tag', l: 'Tag' },
                                    { k: 'tradeCount', l: 'Trades' },
                                    { k: 'winRate', l: 'Win Rate' },
                                    { k: 'realizedPnL', l: 'Realized PnL' },
                                    { k: 'avgPnLPerTrade', l: 'Avg PnL / Trade' },
                                ].map((h) => (
                                    <th
                                        key={h.k}
                                        onClick={() => handleTagStatsSort(h.k as TagSortKey)}
                                        className={tableHeaderClass + ' cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none'}
                                    >
                                        <div className="flex items-center gap-1">
                                            {h.l}
                                            {tagSort.key === h.k && (
                                                <span className="text-[9px]">{tagSort.dir === 'asc' ? '▲' : '▼'}</span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTagStats.map(t => (
                                <tr key={t.tag} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className={tableCellClass}>
                                        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                                            #{t.tag}
                                        </span>
                                    </td>
                                    <td className={tableCellClass}>{t.tradeCount}</td>
                                    <td className={tableCellClass}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className={'h-full rounded-full ' + (t.winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-500')} style={{ width: `${t.winRate}%` }}></div>
                                            </div>
                                            <span className="text-xs font-medium">{t.winRate.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td className={tableCellClass}>
                                        <PnLText value={t.realizedPnL} />
                                    </td>
                                    <td className={tableCellClass}>
                                        <PnLText value={t.avgPnLPerTrade} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Sub-components
function StatItem({ label, value, colorize = false, isLarge = false, suffix = '', darkMode }: { label: string; value: number; colorize?: boolean; isLarge?: boolean; suffix?: string; darkMode: boolean }) {
    const isPositive = value > 0;
    const isNegative = value < 0;

    let colorClass = darkMode ? 'text-slate-100' : 'text-slate-900';
    if (colorize && isPositive) colorClass = 'text-emerald-500';
    if (colorize && isNegative) colorClass = 'text-rose-500';

    return (
        <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">{label}</span>
            <span className={'font-bold tracking-tight ' + (isLarge ? 'text-2xl ' : 'text-xl ') + colorClass}>
                {formatNumber(value)}{suffix}
            </span>
        </div>
    );
}

function PnLText({ value }: { value: number }) {
    if (value === 0) return <span className="text-slate-400">-</span>;
    return (
        <span className={value > 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
            {value > 0 ? '+' : ''}{formatNumber(value)}
        </span>
    );
}
