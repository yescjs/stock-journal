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
import { TrendingUp, TrendingDown, Wallet, Target, ArrowUpRight, ArrowDownRight, Cloud, HardDrive, ChevronUp, ChevronDown } from 'lucide-react';

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
            <div className={'flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed ' + (darkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200')}>
                <div className={'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ' + (darkMode ? 'bg-slate-800' : 'bg-slate-100')}>
                    <span className="text-3xl">📊</span>
                </div>
                <p className={'font-bold text-lg mb-1 ' + (darkMode ? 'text-slate-300' : 'text-slate-700')}>데이터가 없습니다</p>
                <p className={'text-sm ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                    매매 일지를 작성하면 통계가 표시됩니다.
                </p>
            </div>
        );
    }

    const cardBaseClass =
        'rounded-2xl border shadow-sm transition-all duration-300 ' +
        (darkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200');

    const sectionTitleClass = 'text-lg font-bold flex items-center gap-2 ' + (darkMode ? 'text-slate-100' : 'text-slate-900');

    const tableWrapperClass = 'border rounded-xl overflow-hidden overflow-x-auto ' + (darkMode ? 'border-slate-800' : 'border-slate-200');
    const tableHeaderClass = 'text-left text-[11px] font-bold uppercase tracking-wider py-3 px-4 ' + (darkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-indigo-50/80 text-indigo-600');
    const tableCellClass = 'py-3.5 px-4 text-sm border-t ' + (darkMode ? 'border-slate-800' : 'border-slate-100');

    return (
        <div className="space-y-6">
            {/* 1. Hero KPI Section */}
            <div className={cardBaseClass + ' p-6'}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className={sectionTitleClass}>
                            <Wallet size={20} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                            내 포트폴리오
                        </h2>
                        <p className={'text-xs mt-1 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>전체 성과 요약</p>
                    </div>
                    <span className={
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase ' +
                        (currentUser
                            ? (darkMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-700')
                            : (darkMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700'))
                    }>
                        {currentUser ? <Cloud size={12} /> : <HardDrive size={12} />}
                        {currentUser ? 'Cloud Sync' : 'Local'}
                    </span>
                </div>

                {/* Main KPI - Total PnL */}
                <div className={
                    'rounded-2xl p-8 mb-6 text-center relative overflow-hidden ' +
                    (darkMode
                        ? 'bg-gradient-to-br from-slate-800 to-slate-900'
                        : 'bg-gradient-to-br from-indigo-50 to-white border border-indigo-100')
                }>
                    <div className={'text-xs font-bold uppercase tracking-widest mb-3 ' + (darkMode ? 'text-slate-500' : 'text-indigo-400')}>
                        총 손익
                    </div>
                    <div className={'text-5xl font-black tracking-tight flex items-center justify-center gap-3 ' + (overallStats.totalPnL > 0 ? 'text-emerald-500' : overallStats.totalPnL < 0 ? 'text-rose-500' : (darkMode ? 'text-white' : 'text-slate-900'))}>
                        {overallStats.totalPnL > 0 ? <ArrowUpRight size={32} className="text-emerald-500" /> : overallStats.totalPnL < 0 ? <ArrowDownRight size={32} className="text-rose-500" /> : null}
                        <span>{formatNumber(Math.abs(overallStats.totalPnL))}</span>
                    </div>
                    <div className={'text-sm font-semibold mt-2 ' + (overallStats.holdingReturnRate > 0 ? 'text-emerald-500' : overallStats.holdingReturnRate < 0 ? 'text-rose-500' : 'text-slate-500')}>
                        {overallStats.holdingReturnRate > 0 ? '+' : ''}{overallStats.holdingReturnRate.toFixed(2)}%
                    </div>
                </div>

                {/* Sub KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatItem label="총 매수금" value={overallStats.totalBuyAmount} icon={<TrendingUp size={14} />} darkMode={darkMode} />
                    <StatItem label="총 매도금" value={overallStats.totalSellAmount} icon={<TrendingDown size={14} />} darkMode={darkMode} />
                    <StatItem label="실현손익" value={overallStats.totalRealizedPnL} icon={<Target size={14} />} colorize darkMode={darkMode} />
                    <StatItem label="평가손익" value={overallStats.evalPnL} icon={<Wallet size={14} />} colorize darkMode={darkMode} />
                </div>
            </div>

            {/* 2. PnL Charts */}
            {pnlChartPoints.length > 0 && (
                <div className={cardBaseClass + ' p-6'}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className={sectionTitleClass}>
                                <TrendingUp size={20} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                                자산 추이
                            </h2>
                            <p className={'text-xs mt-1 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>누적 실현 손익 그래프</p>
                        </div>
                        <div className={'flex rounded-xl p-1 ' + (darkMode ? 'bg-slate-800' : 'bg-slate-100')}>
                            {(['daily', 'monthly'] as PnLChartMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setPnlChartMode(mode)}
                                    className={
                                        'px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 btn-press ' +
                                        (pnlChartMode === mode
                                            ? (darkMode ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white text-indigo-600 shadow-md')
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
            <div className={cardBaseClass + ' p-6'}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className={sectionTitleClass}>
                        📈 종목별 성과
                    </h2>
                    <span className={'text-[10px] font-medium px-3 py-1.5 rounded-lg ' + (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-indigo-50 text-indigo-600')}>
                        💡 현재가를 입력하면 평가손익이 계산됩니다
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
                                        className={tableHeaderClass + ' cursor-pointer transition-colors select-none ' + (darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-indigo-100/50')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {h.l}
                                            {symbolSort.key === h.k && (
                                                symbolSort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
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
                                    <tr key={s.symbol} className={'transition-colors ' + (darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-indigo-50/30')}>
                                        <td className={tableCellClass + ' font-bold'}>
                                            <div>
                                                <div className={darkMode ? 'text-slate-100' : 'text-slate-900'}>{s.symbol_name || s.symbol}</div>
                                                {s.symbol_name && (
                                                    <div className={'text-[10px] font-mono ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                                                        {s.symbol}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className={tableCellClass + ' font-mono tabular-nums'}>{formatNumber(s.positionQty)}</td>
                                        <td className={tableCellClass + ' font-mono tabular-nums'}>{s.positionQty > 0 ? formatNumber(s.avgCost, 0) : '-'}</td>
                                        <td className={tableCellClass + ' font-mono tabular-nums ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>{formatNumber(s.totalBuyAmount)}</td>
                                        <td className={tableCellClass + ' font-mono tabular-nums ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>{formatNumber(s.totalSellAmount)}</td>
                                        <td className={tableCellClass}>
                                            <PnLText value={s.realizedPnL} />
                                        </td>
                                        <td className={tableCellClass}>
                                            {s.positionQty > 0 ? (
                                                <input
                                                    type="number"
                                                    className={
                                                        'w-24 px-3 py-1.5 text-right text-xs font-mono rounded-lg border transition-all ' +
                                                        (darkMode ? 'bg-slate-800 border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30' : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100')
                                                    }
                                                    value={currentPrice ?? ''}
                                                    onChange={(e) => onCurrentPriceChange(s.symbol, e.target.value)}
                                                    placeholder="가격"
                                                />
                                            ) : <span className="text-slate-400">-</span>}
                                        </td>
                                        <td className={tableCellClass + ' font-mono tabular-nums'}>
                                            {s.positionQty > 0 ? formatNumber(positionValue) : <span className="text-slate-400">-</span>}
                                        </td>
                                        <td className={tableCellClass}>
                                            {s.positionQty > 0 ? <PnLText value={unrealizedPnL} /> : <span className="text-slate-400">-</span>}
                                        </td>
                                        <td className={tableCellClass}>
                                            {s.tradeCount > 0 ? (
                                                <span className={
                                                    'px-2 py-1 rounded-lg text-[11px] font-bold ' +
                                                    (s.winRate >= 50
                                                        ? (darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                                                        : (darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'))
                                                }>
                                                    {s.winRate.toFixed(0)}%
                                                </span>
                                            ) : <span className="text-slate-400">-</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. Tag Table */}
            <div className={cardBaseClass + ' p-6'}>
                <h2 className={sectionTitleClass + ' mb-4'}>
                    🏷️ 전략/태그 분석
                </h2>
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
                                        className={tableHeaderClass + ' cursor-pointer transition-colors select-none ' + (darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-indigo-100/50')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {h.l}
                                            {tagSort.key === h.k && (
                                                tagSort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTagStats.map(t => (
                                <tr key={t.tag} className={'transition-colors ' + (darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-indigo-50/30')}>
                                    <td className={tableCellClass}>
                                        <span
                                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white shadow-sm"
                                            style={{ backgroundColor: tagColors[t.tag] || '#6366f1' }}
                                        >
                                            #{t.tag}
                                        </span>
                                    </td>
                                    <td className={tableCellClass + ' font-mono tabular-nums font-semibold'}>{t.tradeCount}</td>
                                    <td className={tableCellClass}>
                                        <div className="flex items-center gap-3">
                                            <div className={'w-20 h-2 rounded-full overflow-hidden ' + (darkMode ? 'bg-slate-800' : 'bg-slate-200')}>
                                                <div className={'h-full rounded-full transition-all ' + (t.winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-500')} style={{ width: `${t.winRate}%` }}></div>
                                            </div>
                                            <span className={'text-xs font-bold ' + (t.winRate >= 50 ? 'text-emerald-500' : 'text-rose-500')}>{t.winRate.toFixed(0)}%</span>
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
function StatItem({ label, value, colorize = false, icon, darkMode }: { label: string; value: number; colorize?: boolean; icon?: React.ReactNode; darkMode: boolean }) {
    const isPositive = value > 0;
    const isNegative = value < 0;

    let colorClass = darkMode ? 'text-white' : 'text-slate-900';
    if (colorize && isPositive) colorClass = 'text-emerald-500';
    if (colorize && isNegative) colorClass = 'text-rose-500';

    return (
        <div className={'flex flex-col p-4 rounded-xl transition-all duration-200 hover:scale-105 ' + (darkMode ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100')}>
            <div className={'flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold mb-2 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                {icon && <span className={darkMode ? 'text-indigo-400' : 'text-indigo-500'}>{icon}</span>}
                {label}
            </div>
            <span className={'font-bold tracking-tight text-lg ' + colorClass}>
                {colorize && isPositive ? '+' : ''}{formatNumber(Math.abs(value))}
            </span>
        </div>
    );
}

function PnLText({ value }: { value: number }) {
    if (value === 0) return <span className="text-slate-400 font-medium">-</span>;
    return (
        <span className={'font-bold font-mono tabular-nums ' + (value > 0 ? 'text-emerald-500' : 'text-rose-500')}>
            {value > 0 ? '+' : ''}{formatNumber(Math.abs(value))}
        </span>
    );
}
