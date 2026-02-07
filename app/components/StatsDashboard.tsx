import React, { useState, useMemo, useEffect } from 'react';
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

import { MonthlyBarChart } from './charts/MonthlyBarChart';
import { CalendarHeatmap } from './charts/CalendarHeatmap';
import { EquityCurve } from './charts/EquityCurve';
import { WeekdayStatsChart } from './charts/WeekdayStatsChart';
import { HoldingPeriodChart } from './charts/HoldingPeriodChart';
import { MonthlyGoalsWidget } from './MonthlyGoalsWidget';
import { RiskManagementWidget } from './RiskManagementWidget';
import { InsightsWidget } from './InsightsWidget';
import { SymbolSortKey, TagSortKey } from '@/app/types/ui';
import { formatNumber, formatQuantity } from '@/app/utils/format';
import { TrendingUp, Wallet, Target, ChevronUp, ChevronDown, RefreshCw, Loader2, Download, Trophy, AlertTriangle, Zap, Activity, Calendar } from 'lucide-react';
import { fetchStockChart } from '@/app/utils/stockApi';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';

interface StatsDashboardProps {
    darkMode: boolean;
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
    const [dailyViewMode, setDailyViewMode] = useState<'bar' | 'calendar'>('calendar');
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
            rootMargin: '-150px 0px -70% 0px', // Adjust trigger point
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

    // Exchange Rate Fetching - Moved to useMarketData hook
    // useEffect(() => { ... }, []);

    // 손익 Top 5 계산
    const topProfits = useMemo(() => {
        return [...symbolSummaries]
            .sort((a, b) => b.realizedPnL - a.realizedPnL)
            .slice(0, 5)
            .filter(s => s.realizedPnL > 0);
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
            <Card variant="default" className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border/50">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-muted">
                    <span className="text-3xl">📊</span>
                </div>
                <p className="font-bold text-lg mb-1 text-foreground">데이터가 없습니다</p>
                <p className="text-sm text-muted-foreground">
                    매매 일지를 작성하면 통계가 표시됩니다.
                </p>
            </Card>
        );
    }

    const sectionTitleClass = 'text-lg font-bold flex items-center gap-2 text-foreground';

    // Toss Design System - Table Styles
    const tableWrapperClass = 'border border-border/50 rounded-xl overflow-hidden';
    const tableHeaderClass = 'text-left text-[11px] font-semibold uppercase tracking-wide py-3 px-4 bg-muted/30 text-muted-foreground';
    const tableCellClass = 'py-3 px-4 text-sm border-b border-border/50 last:border-0 text-foreground';

    // Current Month Goal Calculation
    const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const currentMonthGoal = monthlyGoals.find(g => g.year === new Date().getFullYear() && g.month === new Date().getMonth() + 1);
    const currentMonthPnL = monthlyRealizedPoints.find(p => p.key === currentMonthKey)?.value || 0;

    return (
        <div className="space-y-8 pb-20 max-w-full overflow-x-hidden">
            {/* 1. Sticky Navigation & Controls - Toss Style */}
            <div className="sticky top-24 z-40 mb-6 pointer-events-none">
                <div className="flex justify-center">
                    <div className={`pointer-events-auto flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-2xl border border-border/50 shadow-toss-md backdrop-blur-xl transition-all max-w-[95vw] overflow-x-auto scrollbar-hide ${darkMode
                        ? 'bg-background/90'
                        : 'bg-background/90'
                        }`}>

                        {/* Navigation Links */}
                        <div className="flex items-center gap-1 shrink-0">
                            {NAV_ITEMS.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className={`
                                            whitespace-nowrap px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-150
                                            ${activeSection === item.id
                                            ? 'bg-primary text-foreground shadow-toss-sm'
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                        }
                                        `}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="w-px h-6 md:h-8 mx-0.5 md:mx-1 shrink-0 bg-border/50" />

                        {/* Controls: Export & Exchange Rate */}
                        <div className="flex items-center gap-2 pr-1 shrink-0">
                            {/* Exchange Rate Input - Toss Style */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-border/50 bg-muted/30 transition-colors hover:bg-muted/50">
                                <span className="text-[10px] md:text-xs font-semibold text-primary">$1</span>
                                <span className="text-muted-foreground">=</span>
                                <div className="flex items-center">
                                    <input
                                        type="number"
                                        value={exchangeRate}
                                        onChange={(e) => onExchangeRateChange(Number(e.target.value))}
                                        className="w-16 md:w-24 text-sm md:text-base font-bold bg-transparent text-right text-foreground outline-none"
                                    />
                                    <span className="text-xs md:text-sm ml-1 font-semibold text-muted-foreground">원</span>
                                </div>
                            </div>

                            {/* Export Button */}
                            <Button
                                onClick={exportToCSV}
                                variant="secondary"
                                size="sm"
                                title="CSV 내보내기"
                            >
                                <Download size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

                {/* 2. Bento Grid Summary Section - Toss Style */}
                <div id="section-summary" className="scroll-mt-32 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                        {/* Hero Card: Total PnL (2x2 on Desktop) - Toss Style */}
                        <Card
                            variant="elevated"
                            className="col-span-1 md:col-span-2 row-span-2 p-8 flex flex-col justify-between relative overflow-hidden h-full"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 lg:opacity-10 scale-150 transform rotate-12 pointer-events-none">
                                <Wallet size={200} />
                            </div>
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    누적 실현 손익
                                </span>
                                <h3 className="text-lg font-bold mt-2 text-foreground" title="모든 매매의 실현 수익과 손실을 합산한 금액입니다.">
                                    총 실현 손익
                                </h3>
                            </div>
                            <div className="mt-8 relative z-10">
                                <div className={`text-5xl lg:text-7xl font-bold tracking-tight ${overallStats.totalPnL > 0 ? 'text-color-up' : overallStats.totalPnL < 0 ? 'text-color-down' : 'text-foreground'
                                    }`}>
                                    {overallStats.totalPnL > 0 ? '+' : ''}{formatNumber(overallStats.totalPnL)}
                                    <span className="text-2xl lg:text-3xl font-semibold ml-2 opacity-50 text-foreground">원</span>
                                </div>
                                <div className="mt-4 text-sm font-medium text-muted-foreground">
                                    총 {overallStats.totalTrades.toLocaleString()}회의 매매를 통해 실현된 수익입니다.
                                </div>
                            </div>
                        </Card>

                        {/* Monthly Goal Progress (2x1 on Desktop, or just 2 cols) - Toss Style */}
                        <Card className="col-span-1 md:col-span-2 p-6 flex flex-col justify-between relative overflow-hidden h-full hover">
                            <CurrentMonthGoalCard
                                goal={currentMonthGoal}
                                actualPnL={currentMonthPnL}
                                darkMode={darkMode}
                                onSetGoal={() => {
                                    if (onSetMonthlyGoal) {
                                        const el = document.getElementById('section-details');
                                        el?.scrollIntoView({ behavior: 'smooth' });
                                        setTimeout(() => {
                                            setShowDetails(true);
                                        }, 500);
                                    }
                                }}
                            />
                        </Card>

                        {/* Consolidated Metrics Card (2x1) - Toss Style */}
                        <Card className="col-span-1 md:col-span-2 p-6 flex flex-col justify-between h-full">
                            <div className="flex items-center gap-2 mb-6">
                                <h3 className="text-base font-bold text-foreground">핵심 지표</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Win Rate */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 rounded-lg bg-grey-100 text-grey-500">
                                            <Target size={16} />
                                        </div>
                                        <span className="text-xs font-bold text-grey-500">승률</span>
                                    </div>
                                    <div className={`text-2xl font-bold ${overallStats.winRate >= 50 ? 'text-color-up' : 'text-color-down'}`}>
                                        {overallStats.winRate.toFixed(1)}%
                                    </div>
                                </div>

                                {/* Profit Factor */}
                                <div className="flex flex-col gap-1 border-l pl-4 border-border/10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 rounded-lg bg-grey-100 text-grey-500">
                                            <TrendingUp size={16} />
                                        </div>
                                        <span className="text-xs font-bold text-grey-500">손익비</span>
                                    </div>
                                    <div className={`text-2xl font-bold ${overallStats.profitFactor >= 2.0 ? 'text-color-up' : overallStats.profitFactor >= 1 ? 'text-foreground' : 'text-color-down'}`}>
                                        {overallStats.profitFactor.toFixed(2)}
                                    </div>
                                </div>

                                {/* Streak */}
                                <div className="flex flex-col gap-1 border-l pl-4 border-border/10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 rounded-lg bg-grey-100 text-grey-500">
                                            <Zap size={16} />
                                        </div>
                                        <span className="text-xs font-bold text-grey-500">연속</span>
                                    </div>
                                    <div className={`text-2xl font-bold ${overallStats.currentStreak > 0 ? 'text-color-up' : overallStats.currentStreak < 0 ? 'text-color-down' : 'text-grey-400'}`}>
                                        {Math.abs(overallStats.currentStreak)}
                                        <span className="text-xs font-semibold ml-1 text-grey-400">
                                            {overallStats.currentStreak > 0 ? "승" : "패"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                    {/* Risk Status (Summary) - Toss Style */}
                    {dailyLossAlert && (
                        <Card variant="elevated" className="p-6 flex flex-col justify-between bg-destructive/10 text-destructive border-destructive/30 hover:scale-[1.02]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 rounded-xl bg-destructive/20 text-destructive">
                                    <AlertTriangle size={20} />
                                </div>
                                <span className="text-xs font-semibold text-destructive">리스크 경고</span>
                            </div>
                            <div>
                                <div className="text-xl font-bold">
                                    손실 한도 초과
                                </div>
                                <p className="text-xs mt-1 font-medium text-destructive/90">{dailyLossAlert.message}</p>
                            </div>
                        </Card>
                    )}

                </div>
            </div>

            {/* 3. Main Chart Section (Grid) - Toss Style */}
            <div id="section-monthly" className="grid grid-cols-1 lg:grid-cols-3 gap-6 scroll-mt-32 mb-6">
                {/* PnL Chart (Spans 2 cols) - Toss Style */}
                {pnlChartPoints.length > 0 && (
                    <Card className="lg:col-span-2 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className={sectionTitleClass}>
                                {pnlChartMode === 'daily'
                                    ? (dailyViewMode === 'calendar'
                                        ? <Calendar size={20} className="text-muted-foreground" />
                                        : <TrendingUp size={20} className="text-muted-foreground" />
                                      )
                                    : <Target size={20} className="text-muted-foreground" />
                                }
                                {pnlChartMode === 'daily'
                                    ? (dailyViewMode === 'calendar' ? '월별 매매 캘린더' : '일별 손익 현황')
                                    : '월별 손익 현황'
                                }
                            </h2>
                            <div className="flex items-center gap-3">
                                {pnlChartMode === 'daily' && (
                                    <div className="flex p-1 rounded-lg bg-muted">
                                        <Button
                                            onClick={() => setDailyViewMode('calendar')}
                                            variant="ghost"
                                            className={'p-1.5 h-auto rounded-md ' + (dailyViewMode === 'calendar' ? 'bg-background text-foreground shadow-toss-sm' : 'text-muted-foreground hover:text-foreground')}
                                            title="캘린더 뷰"
                                        >
                                            <Calendar size={14} />
                                        </Button>
                                        <Button
                                            onClick={() => setDailyViewMode('bar')}
                                            variant="ghost"
                                            className={'p-1.5 h-auto rounded-md ' + (dailyViewMode === 'bar' ? 'bg-background text-foreground shadow-toss-sm' : 'text-muted-foreground hover:text-foreground')}
                                            title="차트 뷰"
                                        >
                                            <Activity size={14} />
                                        </Button>
                                    </div>
                                )}

                                <div className="flex p-1 rounded-lg bg-muted">
                                    <Button
                                        onClick={() => setPnlChartMode('daily')}
                                        variant="ghost"
                                        className={'px-3 py-1.5 h-auto text-xs font-semibold rounded-md ' + (pnlChartMode === 'daily' ? 'bg-background text-foreground shadow-toss-sm' : 'text-muted-foreground hover:text-foreground')}
                                    >
                                        일별
                                    </Button>
                                    <Button
                                        onClick={() => setPnlChartMode('monthly')}
                                        variant="ghost"
                                        className={'px-3 py-1.5 h-auto text-xs font-semibold rounded-md ' + (pnlChartMode === 'monthly' ? 'bg-background text-foreground shadow-toss-sm' : 'text-muted-foreground hover:text-foreground')}
                                    >
                                        월별
                                    </Button>
                                </div>
                            </div>
                        </div>
                        {pnlChartMode === 'daily' ? (
                            dailyViewMode === 'calendar' ? (
                                <CalendarHeatmap
                                    dailyData={dailyRealizedPoints}
                                    darkMode={darkMode}
                                />
                            ) : (
                                <MonthlyBarChart
                                    data={dailyRealizedPoints}
                                    darkMode={darkMode}
                                    title="일별 손익"
                                />
                            )
                        ) : (
                            <MonthlyBarChart
                                data={monthlyRealizedPoints}
                                darkMode={darkMode}
                                title="월별 손익"
                            />
                        )}
                    </Card>
                )}

                {/* Equity Curve or Top Profits (Third col) - Toss Style */}
                <div className="space-y-6">
                    {/* Top Profits List - Toss Style */}
                    <Card className="p-5">
                        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                            <Trophy size={16} className="text-color-up" />
                            수익 Top 3
                        </h3>
                        {topProfits.slice(0, 3).length > 0 ? (
                            <div className="space-y-3">
                                {topProfits.slice(0, 3).map((s, idx) => (
                                    <div
                                        key={s.symbol}
                                        className="flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer hover:scale-[1.02] hover:bg-muted/50 bg-muted/30"
                                        onClick={() => onSymbolClick?.(s.symbol)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ' + (darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600')}>
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <span className={'font-bold text-sm block ' + (darkMode ? 'text-slate-200' : 'text-slate-700')}>
                                                    {s.symbol_name || s.symbol}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="font-bold text-[color:var(--color-up)] tabular-nums text-sm">
                                            +{formatNumber(s.realizedPnL)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-slate-400 text-xs">수익 종목이 없습니다</div>
                        )}
                    </Card>

                    {equityPoints.length > 0 && (
                        <div>
                            <EquityCurve
                                data={equityPoints}
                                monthlyData={monthlyEquityPoints}
                                darkMode={darkMode}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 4. AI Insights Widget */}
            {insights && (
                <div id="section-insights" className="scroll-mt-32 mb-6">
                    <InsightsWidget insights={insights} darkMode={darkMode} />
                </div>
            )}

            {/* 5. Detailed Stats Toggle Section */}
            <div id="section-details" className="scroll-mt-32 mb-6">
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
                        <span>{showDetails ? '상세 분석 접기' : '더 많은 분석 보기'}</span>
                        <ChevronDown
                            size={18}
                            className={`transition-transform duration-300 ${showDetails ? 'rotate-180' : ''}`}
                        />
                    </button>
                </div>

                {/* Collapsible Content */}
                <div className={`
                    grid transition-all duration-500 ease-in-out overflow-hidden
                    ${showDetails ? 'grid-rows-[1fr] opacity-100 mt-8' : 'grid-rows-[0fr] opacity-0'}
                `}>
                    <div className="min-h-0 space-y-8">

                        {/* 7.1 Monthly Goals (Full Widget) */}
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

                        {/* 7.2 Strategy Performance */}
                        {strategyStats.length > 0 && (
                            <Card className="p-6">
                                <h2 className={sectionTitleClass + ' mb-4'}>
                                    <Zap size={20} className={darkMode ? 'text-purple-400' : 'text-purple-600'} />
                                    전략별 성과
                                </h2>
                                <div className={tableWrapperClass}>
                                    <table className="w-full text-left min-w-[700px] whitespace-nowrap">
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
                                                <tr key={s.strategyId} className={'transition-colors ' + (darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50')}>
                                                    <td className={tableCellClass + ' font-bold'}>
                                                        <span className={'px-2 py-1 rounded-lg text-xs font-medium ' + (darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-700')}>
                                                            {s.strategyName}
                                                        </span>
                                                    </td>
                                                    <td className={tableCellClass + ' font-mono tabular-nums'}>{s.tradeCount}</td>
                                                    <td className={tableCellClass}>
                                                        <span className={
                                                            'px-2 py-1 rounded-lg text-[11px] font-bold ' +
                                                            (s.winRate >= 50
                                                                ? (darkMode ? 'bg-slate-800 text-[color:var(--color-up)]' : 'bg-slate-100 text-[color:var(--color-up)]')
                                                                : (darkMode ? 'bg-slate-800 text-[color:var(--color-down)]' : 'bg-slate-100 text-[color:var(--color-down)]'))
                                                        }>
                                                            {s.winRate.toFixed(0)}%
                                                        </span>
                                                    </td>
                                                    <td className={tableCellClass}><PnLText value={s.totalPnL} /></td>
                                                    <td className={tableCellClass}><PnLText value={s.avgPnLPerTrade} /></td>
                                                    <td className={tableCellClass + ' text-[color:var(--color-up)] font-bold tabular-nums'}>
                                                        {s.maxWin > 0 ? '+' + formatNumber(s.maxWin) : '-'}
                                                    </td>
                                                    <td className={tableCellClass + ' text-[color:var(--color-down)] font-bold tabular-nums'}>
                                                        {s.maxLoss < 0 ? formatNumber(s.maxLoss) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}

                        {/* 7.3 Weekday & Holding Period */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {weekdayStats.length > 0 && (
                                <div>
                                    <WeekdayStatsChart data={weekdayStats} darkMode={darkMode} />
                                </div>
                            )}
                            {holdingPeriodStats.length > 0 && (
                                <div>
                                    <HoldingPeriodChart data={holdingPeriodStats} darkMode={darkMode} />
                                </div>
                            )}
                        </div>

                        {/* 7.4 Risk Management */}
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

                        {/* Symbol Table */}
                        <Card id="section-symbols" className="p-6 scroll-mt-28">
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

                            <div className={`${tableWrapperClass} max-w-[calc(100vw-2rem)]`}>
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
                                                        (darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50')
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
                                                                    ? (darkMode ? 'bg-slate-800 text-[color:var(--color-up)]' : 'bg-slate-100 text-[color:var(--color-up)]')
                                                                    : (darkMode ? 'bg-slate-800 text-[color:var(--color-down)]' : 'bg-slate-100 text-[color:var(--color-down)]'))
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
                                                                    ? (darkMode ? 'bg-slate-800 text-[color:var(--color-up)]' : 'bg-slate-100 text-[color:var(--color-up)]')
                                                                    : (darkMode ? 'bg-slate-800 text-[color:var(--color-down)]' : 'bg-slate-100 text-[color:var(--color-down)]'))
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
                        </Card>

                        {/* Tag Table */}
                        <Card className="p-6">
                            <h2 className={sectionTitleClass + ' mb-4'}>
                                🏷️ 태그 통계
                            </h2>
                            <div className={`${tableWrapperClass} max-w-[calc(100vw-2rem)]`}>
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
                                            <tr key={t.tag} className={'transition-colors ' + (darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50')}>
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
                                                            ? (darkMode ? 'bg-slate-800 text-[color:var(--color-up)]' : 'bg-slate-100 text-[color:var(--color-up)]')
                                                            : (darkMode ? 'bg-slate-800 text-[color:var(--color-down)]' : 'bg-slate-100 text-[color:var(--color-down)]'))
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
                        </Card>

                    </div>
                </div>
            </div>
        </div >
    );
}

// Compact Goal Card for Bento Grid
function CurrentMonthGoalCard({ goal, actualPnL, darkMode, onSetGoal }: { goal?: MonthlyGoal, actualPnL: number, darkMode: boolean, onSetGoal?: () => void }) {
    if (!goal) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-4 cursor-pointer" onClick={onSetGoal}>
                <div className={`p-3 rounded-full mb-3 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    <Target size={24} />
                </div>
                <p className={`font-bold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>이번 달 목표 설정하기</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>목표를 설정하고 달성을 시작하세요</p>
            </div>
        )
    }

    const progress = Math.min(100, Math.max(0, (actualPnL / goal.target_pnl) * 100));
    const isAchieved = progress >= 100;
    const remaining = goal.target_pnl - actualPnL;

    return (
        <div className="h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${darkMode ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                        <Calendar size={20} />
                    </div>
                    <div>
                        <span className={`text-[10px] font-black uppercase tracking-widest block ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            THIS MONTH GOAL
                        </span>
                        <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {new Date().getMonth() + 1}월 목표 달성률
                        </span>
                    </div>
                </div>
                {isAchieved && <Trophy size={20} className="text-amber-400" fill="currentColor" />}
            </div>

            <div className="mt-4">
                <div className="flex items-end gap-2 mb-2">
                    <span className={`text-3xl font-black ${isAchieved ? 'text-[color:var(--color-up)]' : (darkMode ? 'text-slate-200' : 'text-slate-800')}`}>
                        {progress.toFixed(0)}%
                    </span>
                    <span className={`text-xs font-medium mb-1.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        / {formatNumber(goal.target_pnl)}원
                    </span>
                </div>
                <div className={`h-2 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${isAchieved ? 'bg-[color:var(--color-up)]' : 'bg-violet-500'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className={`text-[10px] mt-2 text-right ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {remaining > 0 ? `${formatNumber(remaining)}원 남음` : '목표 달성!'}
                </div>
            </div>
        </div>
    );
}

function PnLText({ value }: { value: number }) {
    const color =
        value > 0 ? 'text-[color:var(--color-up)]' : value < 0 ? 'text-[color:var(--color-down)]' : 'text-slate-500';
    return (
        <span className={`font-bold tabular-nums ${color}`}>
            {value > 0 && '+'}
            {formatNumber(value)}
        </span>
    );
}
