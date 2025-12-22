import React, { useState, useMemo, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import {
    SymbolSummary,
    TagPerf,
    PnLPoint,
    OverallStats,
    PnLChartMode,
    InsightData,
    StrategyPerf,
    EquityPoint,
    WeekdayStats,
    HoldingPeriodStats,
    MonthlyGoal,
    AccountBalance,
    PositionRisk,
    RiskSettings,
} from '@/app/types/stats';

import { WinLossChart } from './charts/WinLossChart';
import { MonthlyBarChart } from './charts/MonthlyBarChart';
import { EquityCurve } from './charts/EquityCurve';
import { WeekdayStatsChart } from './charts/WeekdayStatsChart';
import { HoldingPeriodChart } from './charts/HoldingPeriodChart';
import { MonthlyGoalsWidget } from './MonthlyGoalsWidget';
import { RiskManagementWidget } from './RiskManagementWidget';
import { InsightsWidget } from './InsightsWidget';
import { SymbolSortKey, TagSortKey } from '@/app/types/ui';
import { formatNumber, formatQuantity } from '@/app/utils/format';
import { TrendingUp, TrendingDown, Wallet, Target, ArrowUpRight, ArrowDownRight, Cloud, HardDrive, ChevronUp, ChevronDown, RefreshCw, Loader2, Download, Trophy, AlertTriangle, Zap, Activity } from 'lucide-react';
import { fetchStockChart } from '@/app/utils/stockApi';

interface StatsDashboardProps {
    darkMode: boolean;
    currentUser: User | null;
    symbolSummaries: SymbolSummary[];
    tagStats: TagPerf[];
    strategyStats?: StrategyPerf[];
    overallStats: OverallStats;
    dailyRealizedPoints: PnLPoint[];
    monthlyRealizedPoints: PnLPoint[];
    equityPoints?: EquityPoint[];
    monthlyEquityPoints?: EquityPoint[];
    weekdayStats?: WeekdayStats[];
    holdingPeriodStats?: HoldingPeriodStats[];
    monthlyGoals?: MonthlyGoal[];
    onSetMonthlyGoal?: (goal: Omit<MonthlyGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
    onRemoveMonthlyGoal?: (id: string) => Promise<void>;
    // Risk Management
    accountBalance?: number;
    balanceHistory?: AccountBalance[];
    positionRisks?: PositionRisk[];
    highRiskPositions?: PositionRisk[];
    dailyLossAlert?: { type: 'percent' | 'amount'; value: number; limit: number; message: string } | null;
    riskSettings?: RiskSettings;
    dailyPnL?: number;
    onUpdateBalance?: (balance: number, deposit?: number, withdrawal?: number, notes?: string) => Promise<void>;
    onUpdateRiskSettings?: (settings: Partial<RiskSettings>) => Promise<void>;
    currentPrices: Record<string, number>;
    onCurrentPriceChange: (symbol: string, value: string) => void;
    onSymbolClick?: (symbol: string) => void;
    tagColors?: Record<string, string>;
    insights?: InsightData;
    // Currency
    exchangeRate: number;
    onExchangeRateChange: (rate: number) => void;
}

export function StatsDashboard({
    darkMode,
    currentUser,
    symbolSummaries,
    tagStats,
    strategyStats = [],
    overallStats,
    dailyRealizedPoints,
    monthlyRealizedPoints,
    equityPoints = [],
    monthlyEquityPoints = [],
    weekdayStats = [],
    holdingPeriodStats = [],
    monthlyGoals = [],
    onSetMonthlyGoal,
    onRemoveMonthlyGoal,
    // Risk management
    accountBalance = 0,
    balanceHistory = [],
    positionRisks = [],
    highRiskPositions = [],
    dailyLossAlert,
    riskSettings,
    dailyPnL = 0,
    onUpdateBalance,
    onUpdateRiskSettings,
    currentPrices,
    onCurrentPriceChange,
    onSymbolClick,
    tagColors = {},
    insights,
    exchangeRate,
    onExchangeRateChange,
}: StatsDashboardProps) {
    const [pnlChartMode, setPnlChartMode] = useState<PnLChartMode>('daily');
    const [loadingPrices, setLoadingPrices] = useState<Record<string, boolean>>({});
    const [loadingAllPrices, setLoadingAllPrices] = useState(false);

    const [showDetails, setShowDetails] = useState(false);

    // Sticky Navigation with simpler logic
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const [activeSection, setActiveSection] = useState<string>('section-summary');

    const NAV_ITEMS = [
        { id: 'section-summary', label: '요약' },
        { id: 'section-monthly', label: '손익 차트' },
        { id: 'section-details', label: '상세 분석' },
    ];

    // ScrollSpy Implementation
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '-100px 0px -70% 0px', // Adjust trigger point
            threshold: 0
        };

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);
        NAV_ITEMS.forEach(item => {
            const element = document.getElementById(item.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, []);

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

    // Exchange Rate Fetching
    useEffect(() => {
        const fetchExchangeRate = async () => {
            try {
                const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                const data = await res.json();
                if (data && data.rates && data.rates.KRW) {
                    onExchangeRateChange(data.rates.KRW);
                }
            } catch (error) {
                console.error("Failed to fetch exchange rate:", error);
            }
        };

        // Fetch on mount
        fetchExchangeRate();
    }, []);

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
        <div className="space-y-8 pb-20">
            {/* 1. Sticky Navigation & Controls (Floating Glass Design) */}
            <div className="sticky top-4 z-40 flex justify-center mb-10 pointer-events-none">
                <div className={`pointer-events-auto flex items-center gap-3 p-2 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all ${darkMode
                    ? 'bg-slate-950/90 border-slate-700/50 shadow-black/50'
                    : 'bg-white/90 border-white/50 shadow-slate-200/50'
                    }`}>
                    {/* Navigation Links */}
                    <div className="flex items-center gap-1">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => scrollToSection(item.id)}
                                className={`
                                        whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all
                                        ${activeSection === item.id
                                        ? (darkMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105')
                                        : (darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')
                                    }
                                    `}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className={`w-px h-8 mx-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />

                    {/* Controls: Export & Exchange Rate */}
                    <div className="flex items-center gap-3 pr-2">
                        {/* Exchange Rate Input - Enhanced Visibility */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${darkMode
                            ? 'bg-indigo-950/30 border-indigo-500/30 hover:border-indigo-500/50'
                            : 'bg-indigo-50 border-indigo-100 hover:border-indigo-200'
                            }`}>
                            <span className={`text-xs font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-500'}`}>$1USD</span>
                            <span className={darkMode ? 'text-slate-500' : 'text-slate-300'}>=</span>
                            <div className="flex items-center">
                                <input
                                    type="number"
                                    value={exchangeRate}
                                    onChange={(e) => onExchangeRateChange(Number(e.target.value))}
                                    className={`w-24 text-base font-extrabold bg-transparent text-right outline-none ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}
                                />
                                <span className={`text-sm ml-1 font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>원</span>
                            </div>
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={exportToCSV}
                            className={`p-2.5 rounded-xl transition-all border ${darkMode
                                ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-700'
                                : 'border-slate-200 text-slate-400 hover:bg-white hover:text-slate-600 hover:shadow-sm'
                                }`}
                            title="CSV 내보내기"
                        >
                            <Download size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Compact Summary Section (Bento Grid Redesign) */}
            <div id="section-summary" className="scroll-mt-48 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total PnL - Hero Card */}
                    <div className={`col-span-1 md:col-span-2 row-span-2 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden transition-all ${darkMode
                        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-800'
                        : 'bg-white border border-slate-200 shadow-sm'
                        }`}>
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Wallet size={120} />
                        </div>
                        <div>
                            <span className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                TOTAL PNL
                            </span>
                            <h3 className={`text-lg font-bold mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                총 실현 손익
                            </h3>
                        </div>
                        <div className="mt-8">
                            <div className={`text-5xl lg:text-6xl font-black tracking-tighter ${overallStats.totalPnL > 0 ? 'text-emerald-500' : overallStats.totalPnL < 0 ? 'text-rose-500' : (darkMode ? 'text-slate-200' : 'text-slate-700')
                                }`}>
                                {overallStats.totalPnL > 0 ? '+' : ''}{formatNumber(overallStats.totalPnL)}
                                <span className="text-2xl font-bold ml-2 opacity-50">원</span>
                            </div>
                        </div>
                    </div>

                    {/* Win Rate */}
                    <div className={`rounded-3xl p-6 flex flex-col justify-between border transition-all ${darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/50' : 'bg-white border-slate-200 hover:shadow-md'
                        }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-xl ${darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                <Target size={20} />
                            </div>
                            <span className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>WIN RATE</span>
                        </div>
                        <div>
                            <div className={`text-3xl font-black ${overallStats.winRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {overallStats.winRate.toFixed(1)}%
                            </div>
                            <p className={`text-xs mt-1 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>승률</p>
                        </div>
                    </div>

                    {/* Profit Factor */}
                    <div className={`rounded-3xl p-6 flex flex-col justify-between border transition-all ${darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/50' : 'bg-white border-slate-200 hover:shadow-md'
                        }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-xl ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                <TrendingUp size={20} />
                            </div>
                            <span className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>PF</span>
                        </div>
                        <div>
                            <div className={`text-3xl font-black ${overallStats.profitFactor >= 2.0 ? 'text-emerald-500' : overallStats.profitFactor >= 1 ? (darkMode ? 'text-blue-400' : 'text-blue-600') : 'text-rose-500'
                                }`}>
                                {overallStats.profitFactor.toFixed(2)}
                            </div>
                            <p className={`text-xs mt-1 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>손익비</p>
                        </div>
                    </div>

                    {/* Streak */}
                    <div className={`rounded-3xl p-6 flex flex-col justify-between border transition-all ${darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/50' : 'bg-white border-slate-200 hover:shadow-md'
                        }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-xl ${darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                                <Zap size={20} />
                            </div>
                            <span className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>STREAK</span>
                        </div>
                        <div>
                            <div className={`text-3xl font-black ${overallStats.currentStreak > 0 ? 'text-emerald-500' : overallStats.currentStreak < 0 ? 'text-rose-500' : (darkMode ? 'text-slate-400' : 'text-slate-600')}`}>
                                {Math.abs(overallStats.currentStreak)}
                                <span className="text-sm font-bold ml-1 text-slate-500">
                                    {overallStats.currentStreak > 0 ? "연승" : "연패"}
                                </span>
                            </div>
                            <p className={`text-xs mt-1 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>현재 연속 기록</p>
                        </div>
                    </div>

                    {/* Trade Count (New Addition for Bento filler) */}
                    <div className={`rounded-3xl p-6 flex flex-col justify-between border transition-all ${darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800/50' : 'bg-white border-slate-200 hover:shadow-md'
                        }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-xl ${darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                                <Activity size={20} />
                            </div>
                            <span className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>TRADES</span>
                        </div>
                        <div>
                            <div className={`text-3xl font-black ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                {overallStats.totalTrades || 0}
                            </div>
                            <p className={`text-xs mt-1 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>총 매매 횟수</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. PnL Chart (Monthly/Daily) - High Priority */}
            {pnlChartPoints.length > 0 && (
                <div id="section-monthly" className="scroll-mt-48 mb-6">
                    <div className={cardBaseClass + ' p-6'}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className={sectionTitleClass}>
                                {pnlChartMode === 'daily' ? <TrendingUp size={20} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} /> : <Target size={20} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />}
                                {pnlChartMode === 'daily' ? '일별 손익 현황' : '월별 손익 현황'}
                            </h2>
                            <div className={'flex p-1 rounded-lg ' + (darkMode ? 'bg-slate-800' : 'bg-slate-100')}>
                                <button
                                    onClick={() => setPnlChartMode('daily')}
                                    className={'px-3 py-1.5 text-xs font-bold rounded-md transition-all ' + (pnlChartMode === 'daily' ? (darkMode ? 'bg-slate-700 text-white shadow' : 'bg-white text-indigo-600 shadow') : (darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'))}
                                >
                                    일별
                                </button>
                                <button
                                    onClick={() => setPnlChartMode('monthly')}
                                    className={'px-3 py-1.5 text-xs font-bold rounded-md transition-all ' + (pnlChartMode === 'monthly' ? (darkMode ? 'bg-slate-700 text-white shadow' : 'bg-white text-indigo-600 shadow') : (darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'))}
                                >
                                    월별
                                </button>
                            </div>
                        </div>
                        {pnlChartMode === 'daily' ? (
                            <MonthlyBarChart
                                data={dailyRealizedPoints}
                                darkMode={darkMode}
                                title="일별 손익 (Daily PnL)"
                            />
                        ) : (
                            <MonthlyBarChart
                                data={monthlyRealizedPoints}
                                darkMode={darkMode}
                                title="월별 손익 (Monthly PnL)"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* 4. Equity Curve (Combined) - High Priority */}
            {equityPoints.length > 0 && (
                <div id="section-equity" className="scroll-mt-48 mb-6">
                    <EquityCurve
                        data={equityPoints}
                        monthlyData={monthlyEquityPoints}
                        darkMode={darkMode}
                    />
                </div>
            )}

            {/* 5. AI Insights Widget */}
            {insights && (
                <div id="section-insights" className="scroll-mt-48 mb-6">
                    <InsightsWidget insights={insights} darkMode={darkMode} />
                </div>
            )}

            {/* 6. Top Performers (Win/Loss) */}
            {(topProfits.length > 0 || topLosses.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

            {/* 7. Detailed Stats Toggle Section */}
            <div id="section-details" className="scroll-mt-48 mb-6">
                <div className="flex flex-col items-center">
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className={`
                            group flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all
                            ${darkMode
                                ? 'bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 shadow-sm'
                            }
                        `}
                    >
                        <span>{showDetails ? '상세 분석 접기' : '상세 분석 더보기'}</span>
                        <ChevronDown
                            size={18}
                            className={`transition-transform duration-300 ${showDetails ? 'rotate-180' : ''}`}
                        />
                    </button>
                    {!showDetails && (
                        <p className={`mt-3 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            전략 성과, 요일별 통계, 리스크 관리 등 더 자세한 정보를 확인하세요
                        </p>
                    )}
                </div>

                {/* Collapsible Content */}
                <div className={`
                    grid transition-all duration-500 ease-in-out overflow-hidden
                    ${showDetails ? 'grid-rows-[1fr] opacity-100 mt-8' : 'grid-rows-[0fr] opacity-0'}
                `}>
                    <div className="min-h-0 space-y-8">

                        {/* 7.1 Strategy Performance */}
                        {strategyStats.length > 0 && (
                            <div className={cardBaseClass + ' p-6'}>
                                <h2 className={sectionTitleClass + ' mb-4'}>
                                    <Zap size={20} className={darkMode ? 'text-purple-400' : 'text-purple-600'} />
                                    전략별 성과
                                </h2>
                                <div className={tableWrapperClass}>
                                    <table className="w-full text-left min-w-[700px]">
                                        <thead>
                                            <tr>
                                                {[
                                                    { l: '전략명' },
                                                    { l: '매매횟수' },
                                                    { l: '승률' },
                                                    { l: '총 손익' },
                                                    { l: '평균 손익' },
                                                    { l: '최대 수익' },
                                                    { l: '최대 손실' },
                                                ].map((h, i) => (
                                                    <th key={i} className={tableHeaderClass}>
                                                        {h.l}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {strategyStats.map((s) => (
                                                <tr key={s.strategyId} className={'transition-colors ' + (darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-indigo-50/30')}>
                                                    <td className={tableCellClass + ' font-bold'}>
                                                        <span className={'px-2 py-1 rounded-lg text-xs font-medium ' + (darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700')}>
                                                            {s.strategyName}
                                                        </span>
                                                    </td>
                                                    <td className={tableCellClass + ' font-mono tabular-nums'}>{s.tradeCount}</td>
                                                    <td className={tableCellClass}>
                                                        <span className={
                                                            'px-2 py-1 rounded-lg text-[11px] font-bold ' +
                                                            (s.winRate >= 50
                                                                ? (darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                                                                : (darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'))
                                                        }>
                                                            {s.winRate.toFixed(0)}%
                                                        </span>
                                                    </td>
                                                    <td className={tableCellClass}><PnLText value={s.totalPnL} /></td>
                                                    <td className={tableCellClass}><PnLText value={s.avgPnLPerTrade} /></td>
                                                    <td className={tableCellClass + ' text-emerald-500 font-bold tabular-nums'}>
                                                        {s.maxWin > 0 ? '+' + formatNumber(s.maxWin) : '-'}
                                                    </td>
                                                    <td className={tableCellClass + ' text-rose-500 font-bold tabular-nums'}>
                                                        {s.maxLoss < 0 ? formatNumber(s.maxLoss) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 7.2 Weekday Stats */}
                        {weekdayStats.length > 0 && (
                            <div>
                                <WeekdayStatsChart data={weekdayStats} darkMode={darkMode} />
                            </div>
                        )}

                        {/* 7.3 Holding Period Stats */}
                        {holdingPeriodStats.length > 0 && (
                            <div>
                                <HoldingPeriodChart data={holdingPeriodStats} darkMode={darkMode} />
                            </div>
                        )}

                        {/* 7.4 Monthly Goals */}
                        {onSetMonthlyGoal && onRemoveMonthlyGoal && (
                            <div>
                                <MonthlyGoalsWidget
                                    goals={monthlyGoals}
                                    monthlyPnLPoints={monthlyRealizedPoints}
                                    onSetGoal={onSetMonthlyGoal}
                                    onRemoveGoal={onRemoveMonthlyGoal}
                                    darkMode={darkMode}
                                />
                            </div>
                        )}

                        {/* 7.5 Risk Management */}
                        {onUpdateBalance && onUpdateRiskSettings && riskSettings && (
                            <div>
                                <RiskManagementWidget
                                    accountBalance={accountBalance}
                                    balanceHistory={balanceHistory}
                                    positionRisks={positionRisks}
                                    highRiskPositions={highRiskPositions}
                                    dailyLossAlert={dailyLossAlert ?? null}
                                    riskSettings={riskSettings}
                                    dailyPnL={dailyPnL}
                                    onUpdateBalance={onUpdateBalance}
                                    onUpdateRiskSettings={onUpdateRiskSettings}
                                    darkMode={darkMode}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>


            <div id="section-symbols" className={cardBaseClass + ' p-6 scroll-mt-28'}>
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
        </div >
    );
}

interface StatItemProps {
    label: string;
    value: number | string;
    suffix?: string;
    isCurrency?: boolean;
    trend?: 'up' | 'down' | 'neutral';
    icon?: React.ReactNode;
    darkMode: boolean;
}

function StatItem({ label, value, suffix, isCurrency, trend, icon, darkMode }: StatItemProps) {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));

    // Determine color based on trend or value
    let colorClass = darkMode ? 'text-white' : 'text-slate-900';
    if (trend) {
        if (trend === 'up') colorClass = 'text-emerald-500';
        else if (trend === 'down') colorClass = 'text-rose-500';
        else colorClass = darkMode ? 'text-slate-400' : 'text-slate-500';
    } else if (isCurrency) {
        if (numValue > 0) colorClass = 'text-emerald-500';
        else if (numValue < 0) colorClass = 'text-rose-500';
    }

    const bgClass = darkMode ? 'bg-slate-800/50' : 'bg-slate-50';

    return (
        <div className={`rounded-xl p-4 ${bgClass} flex flex-col justify-between`}>
            <div className={'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                {icon}
                {label}
            </div>
            <div className={`text-lg lg:text-xl font-black tabular-nums flex items-baseline gap-1 ${colorClass}`}>
                {isCurrency && numValue > 0 && '+'}
                {typeof value === 'number' ? formatNumber(Math.abs(value)) : value}
                {suffix && <span className="text-xs font-medium opacity-70">{suffix}</span>}
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
