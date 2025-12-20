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
import { formatNumber, formatQuantity } from '@/app/utils/format';
import { TrendingUp, TrendingDown, Wallet, Target, ArrowUpRight, ArrowDownRight, Cloud, HardDrive, ChevronUp, ChevronDown, RefreshCw, Loader2, Download, Trophy, AlertTriangle } from 'lucide-react';
import { fetchStockChart } from '@/app/utils/stockApi';

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
    onSymbolClick?: (symbol: string) => void;
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
    onSymbolClick,
    tagColors = {},
    insights,
}: StatsDashboardProps) {
    const [pnlChartMode, setPnlChartMode] = useState<PnLChartMode>('daily');
    const [loadingPrices, setLoadingPrices] = useState<Record<string, boolean>>({});
    const [loadingAllPrices, setLoadingAllPrices] = useState(false);

    const [symbolSort, setSymbolSort] = useState<{
        key: SymbolSortKey;
        dir: 'asc' | 'desc';
    }>({
        key: 'realizedPnL',
        dir: 'desc',
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

    // 손익 Top 5 계산
    const topProfits = useMemo(() => {
        return [...symbolSummaries]
            .sort((a, b) => b.realizedPnL - a.realizedPnL)
            .slice(0, 5)
            .filter(s => s.realizedPnL > 0);
    }, [symbolSummaries]);

    const topLosses = useMemo(() => {
        return [...symbolSummaries]
            .sort((a, b) => a.realizedPnL - b.realizedPnL)
            .slice(0, 5)
            .filter(s => s.realizedPnL < 0);
    }, [symbolSummaries]);

    // 현재가 자동 조회 함수
    const fetchCurrentPrice = async (symbol: string) => {
        setLoadingPrices(prev => ({ ...prev, [symbol]: true }));
        try {
            const data = await fetchStockChart(symbol, '1d');
            if (data.prices && data.prices.length > 0) {
                const lastPrice = data.prices[data.prices.length - 1];
                onCurrentPriceChange(symbol, lastPrice.close.toString());
            }
        } catch (error) {
            console.error(`Failed to fetch price for ${symbol}:`, error);
        } finally {
            setLoadingPrices(prev => ({ ...prev, [symbol]: false }));
        }
    };

    // 전체 현재가 조회
    const fetchAllCurrentPrices = async () => {
        const holdingSymbols = symbolSummaries.filter(s => s.positionQty > 0).map(s => s.symbol);
        if (holdingSymbols.length === 0) return;

        setLoadingAllPrices(true);
        try {
            await Promise.all(holdingSymbols.map(symbol => fetchCurrentPrice(symbol)));
        } finally {
            setLoadingAllPrices(false);
        }
    };

    // CSV 내보내기
    const exportToCSV = () => {
        const headers = ['종목명', '종목코드', '보유수량', '평단가', '현재가', '실현손익', '평가손익', '수익률', '승률'];
        const rows = symbolSummaries.map(s => {
            const currentPrice = currentPrices[s.symbol];
            const hasPrice = currentPrice !== undefined;
            const unrealizedPnL = (s.positionQty > 0 && hasPrice) ? (currentPrice - s.avgCost) * s.positionQty : 0;
            const returnRate = (s.positionQty > 0 && hasPrice && s.avgCost > 0) ? ((currentPrice - s.avgCost) / s.avgCost) * 100 : 0;

            return [
                s.symbol_name || s.symbol,
                s.symbol,
                s.positionQty,
                s.avgCost,
                currentPrice || '',
                s.realizedPnL,
                hasPrice ? unrealizedPnL : '',
                hasPrice ? returnRate.toFixed(2) + '%' : '',
                s.winRate.toFixed(0) + '%'
            ].join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stock_stats_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleSymbolStatsSort = (key: SymbolSortKey) => {
        setSymbolSort((prev) => {
            if (prev.key === key) {
                return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
            }
            return { key, dir: 'desc' };
        });
    };

    const sortedSymbolSummaries = useMemo(() => {
        const getMetric = (s: SymbolSummary): number | string => {
            switch (symbolSort.key) {
                case 'symbol':
                    return s.symbol_name || s.symbol;
                case 'positionQty':
                    return s.positionQty;
                case 'avgCost':
                    return s.avgCost ?? 0;
                case 'totalBuyAmount':
                    return s.totalBuyAmount ?? 0;
                case 'totalSellAmount':
                    return s.totalSellAmount ?? 0;
                case 'realizedPnL':
                    return s.realizedPnL ?? 0;
                case 'currentPrice':
                    return currentPrices[s.symbol] ?? 0;
                case 'positionValue':
                    return s.positionQty * (currentPrices[s.symbol] ?? 0);
                case 'unrealizedPnL':
                    return s.positionQty > 0 ? ((currentPrices[s.symbol] ?? 0) - (s.avgCost ?? 0)) * s.positionQty : 0;
                case 'winRate':
                    return s.winRate ?? 0;
                default:
                    return 0;
            }
        };
        const list = [...symbolSummaries];
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
            return { key, dir: 'asc' };
        });
    };

    const sortedTagStats = useMemo(() => {
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
                    return 0;
            }
        };
        const list = [...tagStats];
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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportToCSV}
                            className={
                                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all btn-press ' +
                                (darkMode
                                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                            }
                        >
                            <Download size={12} />
                            CSV
                        </button>
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
                <div className="grid grid-cols-2 gap-4">
                    <StatItem label="실현손익" value={overallStats.totalRealizedPnL} icon={<Target size={14} />} colorize darkMode={darkMode} />
                    <StatItem label="평가손익" value={overallStats.evalPnL} icon={<Wallet size={14} />} colorize darkMode={darkMode} />
                </div>
            </div>

            {/* 2. Top Performers Section */}
            {(topProfits.length > 0 || topLosses.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Top Profits */}
                    <div className={cardBaseClass + ' p-5'}>
                        <h3 className={'text-sm font-bold flex items-center gap-2 mb-4 ' + (darkMode ? 'text-emerald-400' : 'text-emerald-600')}>
                            <Trophy size={16} />
                            수익 Top 5
                        </h3>
                        {topProfits.length > 0 ? (
                            <div className="space-y-2">
                                {topProfits.map((s, idx) => (
                                    <div
                                        key={s.symbol}
                                        className={
                                            'flex items-center justify-between p-3 rounded-xl transition-all ' +
                                            (onSymbolClick ? 'cursor-pointer hover:scale-[1.02] ' : '') +
                                            (darkMode ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'bg-emerald-50 hover:bg-emerald-100')
                                        }
                                        onClick={() => onSymbolClick?.(s.symbol)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ' + (darkMode ? 'bg-emerald-500/30 text-emerald-400' : 'bg-emerald-200 text-emerald-700')}>
                                                {idx + 1}
                                            </span>
                                            <span className={'font-bold text-sm ' + (darkMode ? 'text-slate-200' : 'text-slate-700')}>
                                                {s.symbol_name || s.symbol}
                                            </span>
                                        </div>
                                        <span className="font-bold text-emerald-500 tabular-nums">
                                            +{formatNumber(s.realizedPnL)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={'text-sm text-center py-4 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                                수익 종목이 없습니다
                            </p>
                        )}
                    </div>

                    {/* Top Losses */}
                    <div className={cardBaseClass + ' p-5'}>
                        <h3 className={'text-sm font-bold flex items-center gap-2 mb-4 ' + (darkMode ? 'text-rose-400' : 'text-rose-600')}>
                            <AlertTriangle size={16} />
                            손실 Top 5
                        </h3>
                        {topLosses.length > 0 ? (
                            <div className="space-y-2">
                                {topLosses.map((s, idx) => (
                                    <div
                                        key={s.symbol}
                                        className={
                                            'flex items-center justify-between p-3 rounded-xl transition-all ' +
                                            (onSymbolClick ? 'cursor-pointer hover:scale-[1.02] ' : '') +
                                            (darkMode ? 'bg-rose-500/10 hover:bg-rose-500/20' : 'bg-rose-50 hover:bg-rose-100')
                                        }
                                        onClick={() => onSymbolClick?.(s.symbol)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ' + (darkMode ? 'bg-rose-500/30 text-rose-400' : 'bg-rose-200 text-rose-700')}>
                                                {idx + 1}
                                            </span>
                                            <span className={'font-bold text-sm ' + (darkMode ? 'text-slate-200' : 'text-slate-700')}>
                                                {s.symbol_name || s.symbol}
                                            </span>
                                        </div>
                                        <span className="font-bold text-rose-500 tabular-nums">
                                            {formatNumber(s.realizedPnL)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={'text-sm text-center py-4 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                                손실 종목이 없습니다
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* 3. PnL Charts */}
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

            {/* 4. Symbol Table */}
            <div className={cardBaseClass + ' p-6'}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className={sectionTitleClass}>
                        📈 종목별 성과
                    </h2>
                    <button
                        onClick={fetchAllCurrentPrices}
                        disabled={loadingAllPrices}
                        className={
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all btn-press ' +
                            (darkMode
                                ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30'
                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200')
                        }
                    >
                        {loadingAllPrices ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        현재가 조회
                    </button>
                </div>

                <div className={tableWrapperClass}>
                    <table className="w-full text-left min-w-[700px]">
                        <thead>
                            <tr>
                                {[
                                    { k: 'symbol', l: '종목명' },
                                    { k: 'positionQty', l: '보유수량' },
                                    { k: 'avgCost', l: '평단가' },
                                    { k: 'currentPrice', l: '현재가' },
                                    { k: 'realizedPnL', l: '실현손익' },
                                    { k: 'unrealizedPnL', l: '평가손익' },
                                    { k: 'returnRate', l: '수익률' },
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
                                const unrealizedPnL = (s.positionQty > 0 && hasPrice) ? (currentPrice - s.avgCost) * s.positionQty : 0;
                                const returnRate = (s.positionQty > 0 && hasPrice && s.avgCost > 0) ? ((currentPrice - s.avgCost) / s.avgCost) * 100 : 0;
                                const isLoading = loadingPrices[s.symbol];
                                const isKorean = s.symbol.includes('.KS') || s.symbol.includes('.KQ') || /^\d+$/.test(s.symbol);

                                return (
                                    <tr
                                        key={s.symbol}
                                        className={
                                            'transition-colors ' +
                                            (onSymbolClick ? 'cursor-pointer ' : '') +
                                            (darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-indigo-50/30')
                                        }
                                        onClick={() => onSymbolClick?.(s.symbol)}
                                    >
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
                                        <td className={tableCellClass + ' font-mono tabular-nums'}>{formatQuantity(s.positionQty, s.symbol)}</td>
                                        <td className={tableCellClass + ' font-mono tabular-nums'}>{s.positionQty > 0 ? formatNumber(s.avgCost, 0) : '-'}</td>
                                        <td className={tableCellClass}>
                                            <div className="flex items-center gap-2">
                                                {isLoading ? (
                                                    <Loader2 size={14} className="animate-spin text-indigo-400" />
                                                ) : hasPrice ? (
                                                    <span className="font-mono tabular-nums">
                                                        <span className="text-slate-400 text-xs mr-1">{isKorean ? '₩' : '$'}</span>
                                                        {formatNumber(currentPrice, isKorean ? 0 : 2)}
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            fetchCurrentPrice(s.symbol);
                                                        }}
                                                        className={
                                                            'px-2 py-1 rounded text-[10px] font-bold transition-all ' +
                                                            (darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                                                        }
                                                    >
                                                        조회
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className={tableCellClass}>
                                            <PnLText value={s.realizedPnL} />
                                        </td>
                                        <td className={tableCellClass}>
                                            {s.positionQty > 0 && hasPrice ? <PnLText value={unrealizedPnL} /> : <span className="text-slate-400">-</span>}
                                        </td>
                                        <td className={tableCellClass}>
                                            {s.positionQty > 0 && hasPrice ? (
                                                <span className={
                                                    'px-2 py-1 rounded-lg text-[11px] font-bold ' +
                                                    (returnRate >= 0
                                                        ? (darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                                                        : (darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'))
                                                }>
                                                    {returnRate >= 0 ? '+' : ''}{returnRate.toFixed(2)}%
                                                </span>
                                            ) : <span className="text-slate-400">-</span>}
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

            {/* 5. Tag Table */}
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
                            {sortedTagStats.map((t) => (
                                <tr key={t.tag} className={'transition-colors ' + (darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-indigo-50/30')}>
                                    <td className={tableCellClass + ' font-bold'}>
                                        <span className={'px-2 py-1 rounded-lg text-xs font-medium ' + (darkMode ? 'bg-slate-800' : 'bg-slate-100')} style={{ color: tagColors[t.tag] }}>
                                            {t.tag}
                                        </span>
                                    </td>
                                    <td className={tableCellClass + ' font-mono tabular-nums'}>{t.tradeCount}</td>
                                    <td className={tableCellClass}>
                                        <span className={
                                            'px-2 py-1 rounded-lg text-[11px] font-bold ' +
                                            (t.winRate >= 50
                                                ? (darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                                                : (darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'))
                                        }>
                                            {t.winRate.toFixed(0)}%
                                        </span>
                                    </td>
                                    <td className={tableCellClass}><PnLText value={t.realizedPnL} /></td>
                                    <td className={tableCellClass}><PnLText value={t.avgPnLPerTrade} /></td>
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
    const colorClass = colorize
        ? isPositive
            ? 'text-emerald-500'
            : isNegative
                ? 'text-rose-500'
                : darkMode ? 'text-white' : 'text-slate-900'
        : darkMode ? 'text-white' : 'text-slate-900';
    const bgClass = darkMode ? 'bg-slate-800/50' : 'bg-slate-50';
    return (
        <div className={`rounded-xl p-4 ${bgClass}`}>
            <div className={'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                {icon}
                {label}
            </div>
            <div className={`text-xl font-black tabular-nums ${colorClass}`}>
                {colorize && isPositive && '+'}
                {formatNumber(value)}
            </div>
        </div>
    );
}

function PnLText({ value }: { value: number }) {
    const color =
        value > 0 ? 'text-emerald-500' : value < 0 ? 'text-rose-500' : 'text-slate-500';
    return (
        <span className={`font-bold tabular-nums ${color}`}>
            {value > 0 && '+'}
            {formatNumber(value)}
        </span>
    );
}
