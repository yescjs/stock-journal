import React, { useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import {
    SymbolSummary,
    TagPerf,
    PnLPoint,
    OverallStats,
    PnLChartMode,
    InsightData,
} from '@/app/types/stats';
import { PnLChart } from './charts/PnLChart';
import { WinLossChart } from './charts/WinLossChart';
import { MonthlyBarChart } from './charts/MonthlyBarChart';
import { InsightsWidget } from './InsightsWidget';
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
    tagColors?: Record<string, string>;
    insights?: InsightData;
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
    tagColors = {},
    insights,
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
            <div className={'flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed ' + (darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200')}>
                <p className="text-slate-500 font-medium">데이터가 없습니다.</p>
                <p className="text-slate-400 text-sm mt-1">
                    매매 일지를 작성하면 통계가 표시됩니다.
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
        <div className="space-y-6">
            {/* 1. Hero KPI Section */}
            <div className={cardBaseClass}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className={sectionTitleClass}>내 포트폴리오</h2>
                        <p className={'text-xs -mt-2 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>전체 성과 요약</p>
                    </div>
                    <span className={'px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase ' + (currentUser ? (darkMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-700') : (darkMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700'))}>
                        {currentUser ? '☁ Cloud Sync' : '💾 Local'}
                    </span>
                </div>

                {/* Main KPI - Total PnL */}
                <div className={'rounded-2xl p-6 mb-6 text-center ' + (darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-800/50' : 'bg-gradient-to-br from-slate-50 to-white')}>
                    <div className={'text-xs font-semibold uppercase tracking-wider mb-2 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>총 손익</div>
                    <div className={'text-4xl font-black tracking-tight ' + (overallStats.totalPnL > 0 ? 'text-emerald-500' : overallStats.totalPnL < 0 ? 'text-rose-500' : (darkMode ? 'text-white' : 'text-slate-900'))}>
                        {overallStats.totalPnL > 0 ? '+' : ''}{formatNumber(overallStats.totalPnL)}
                    </div>
                    <div className={'text-sm font-medium mt-1 ' + (overallStats.holdingReturnRate > 0 ? 'text-emerald-500' : overallStats.holdingReturnRate < 0 ? 'text-rose-500' : 'text-slate-500')}>
                        {overallStats.holdingReturnRate > 0 ? '+' : ''}{overallStats.holdingReturnRate.toFixed(2)}%
                    </div>
                </div>

                {/* Sub KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatItem label="총 매수금" value={overallStats.totalBuyAmount} darkMode={darkMode} />
                    <StatItem label="총 매도금" value={overallStats.totalSellAmount} darkMode={darkMode} />
                    <StatItem label="실현손익" value={overallStats.totalRealizedPnL} colorize darkMode={darkMode} />
                    <StatItem label="평가손익" value={overallStats.evalPnL} colorize darkMode={darkMode} />
                </div>
            </div>

            {/* 2. PnL Charts */}
            {pnlChartPoints.length > 0 && (
                <div className={cardBaseClass}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className={sectionTitleClass}>자산 추이</h2>
                            <p className="text-xs text-slate-500 -mt-2">누적 실현 손익 그래프</p>
                        </div>
                        <div className={'flex rounded-lg p-1 ' + (darkMode ? 'bg-slate-800' : 'bg-slate-100')}>
                            {(['daily', 'monthly'] as PnLChartMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setPnlChartMode(mode)}
                                    className={
                                        'px-4 py-1.5 text-xs font-bold rounded-md transition-all ' +
                                        (pnlChartMode === mode
                                            ? (darkMode ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm')
                                            : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'))
                                    }
                                >
                                    {mode === 'daily' ? '일별' : '월별'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-72 w-full">
                        <PnLChart
                            data={
                                // Calculate cumulative
                                pnlChartPoints.reduce<{ date: string, cumulativePnL: number }[]>((acc, curr, idx) => {
                                    const prev = idx > 0 ? acc[idx - 1].cumulativePnL : 0;
                                    acc.push({
                                        date: curr.label,
                                        cumulativePnL: prev + curr.value
                                    });
                                    return acc;
                                }, [])
                            }
                            darkMode={darkMode}
                        />
                    </div>
                </div>
            )}

            {/* 3. Symbol Table */}
            <div className={cardBaseClass}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className={sectionTitleClass}>종목별 성과</h2>
                    <span className={'text-[10px] text-slate-400 px-2 py-1 rounded ' + (darkMode ? 'bg-slate-800' : 'bg-slate-100')}>
                        Tip: 현재가를 입력하면 평가손익이 계산됩니다.
                    </span>
                </div>

                <div className={tableWrapperClass}>
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                            <tr>
                                {[
                                    { k: 'symbol', l: '종목명' },
                                    { k: 'positionQty', l: '보유수량' },
                                    { k: 'avgCost', l: '평단가' },
                                    { k: 'totalBuyAmount', l: '총매수' },
                                    { k: 'totalSellAmount', l: '총매도' },
                                    { k: 'realizedPnL', l: '실현손익' },
                                    { k: 'currentPrice', l: '현재가' },
                                    { k: 'positionValue', l: '평가금액' },
                                    { k: 'unrealizedPnL', l: '평가손익' },
                                    { k: 'winRate', l: '승률' },
                                ].map((h) => (
                                    <th
                                        key={h.k}
                                        onClick={() => handleSymbolStatsSort(h.k as SymbolSortKey)}
                                        className={tableHeaderClass + ' cursor-pointer transition-colors select-none ' + (darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100')}
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
                                    <tr key={s.symbol} className={'transition-colors ' + (darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50')}>
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
                                                <span className={'px-1.5 py-0.5 rounded text-[10px] font-bold ' + (s.winRate >= 50 ? (darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (darkMode ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-100 text-rose-700'))}>
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
                <h2 className={sectionTitleClass}>전략/태그 분석</h2>
                <div className={tableWrapperClass}>
                    <table className="w-full text-left min-w-[600px]">
                        <thead>
                            <tr>
                                {[
                                    { k: 'tag', l: '태그명' },
                                    { k: 'tradeCount', l: '매매횟수' },
                                    { k: 'winRate', l: '승률' },
                                    { k: 'realizedPnL', l: '실현손익' },
                                    { k: 'avgPnLPerTrade', l: '거래당 평균 손익' },
                                ].map((h) => (
                                    <th
                                        key={h.k}
                                        onClick={() => handleTagStatsSort(h.k as TagSortKey)}
                                        className={tableHeaderClass + ' cursor-pointer transition-colors select-none ' + (darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100')}
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
                                <tr key={t.tag} className={'transition-colors ' + (darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50')}>
                                    <td className={tableCellClass}>
                                        <span
                                            className="px-2 py-1 rounded-md text-xs font-medium text-white shadow-sm"
                                            style={{ backgroundColor: tagColors[t.tag] || '#64748b' }}
                                        >
                                            #{t.tag}
                                        </span>
                                    </td>
                                    <td className={tableCellClass}>{t.tradeCount}</td>
                                    <td className={tableCellClass}>
                                        <div className="flex items-center gap-2">
                                            <div className={'w-16 h-1.5 rounded-full overflow-hidden ' + (darkMode ? 'bg-slate-800' : 'bg-slate-200')}>
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

    let colorClass = darkMode ? 'text-white' : 'text-slate-900';
    if (colorize && isPositive) colorClass = 'text-emerald-500';
    if (colorize && isNegative) colorClass = 'text-rose-500';

    return (
        <div className={'flex flex-col p-4 rounded-xl ' + (darkMode ? 'bg-slate-800/50' : 'bg-slate-50')}>
            <span className={'text-[10px] uppercase tracking-wider font-bold mb-2 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>{label}</span>
            <span className={'font-bold tracking-tight ' + (isLarge ? 'text-2xl ' : 'text-lg ') + colorClass}>
                {colorize && isPositive ? '+' : ''}{formatNumber(value)}{suffix}
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
