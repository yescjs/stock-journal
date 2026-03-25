import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Trade } from '@/app/types/trade';
import { User } from '@supabase/supabase-js';
import { TradeList } from '@/app/components/TradeList';
import { CalendarView } from '@/app/components/CalendarView';
import { SymbolDetailCard } from '@/app/components/SymbolDetailCard';
import { MotionWrapper } from '@/app/components/MotionWrapper';
import { AnalysisDashboard } from '@/app/components/views/AnalysisDashboard';
import { CalendarDayPanelContent } from '@/app/components/CalendarDayPanel';
import { BottomSheet } from '@/app/components/BottomSheet';
import { AnimatePresence, motion } from 'framer-motion';
import { isKRWSymbol } from '@/app/utils/format';
import {
  LayoutGrid, List as ListIcon, Search, X, ChevronDown,
  TrendingUp, TrendingDown, Wallet, BarChart3, DollarSign, Briefcase, Calendar, RotateCw, Brain,
  BookOpen, PenLine, BarChart2, Sparkles, ArrowDown, Upload, ArrowUpDown, MoreHorizontal
} from 'lucide-react';
import { useTradeFilter, DatePreset, SideFilter } from '@/app/hooks/useTradeFilter';
import { useTradeAnalysis } from '@/app/hooks/useTradeAnalysis';
import { usePortfolio } from '@/app/hooks/usePortfolio';
import { StreakBadge } from '@/app/components/StreakBadge';
import { OnboardingChecklist } from '@/app/components/OnboardingChecklist';
import type { OnboardingSteps } from '@/app/hooks/useOnboarding';

interface TradeListViewProps {
  tradesLoading?: boolean;
  darkMode: boolean;
  currentUser: User | null;
  trades: Trade[];
  filteredTrades: Trade[];
  filterState: ReturnType<typeof useTradeFilter>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (trade: Trade) => void;
  openMonths: Record<string, boolean>;
  toggleMonth: (key: string) => void;
  currentPrices: Record<string, number>;
  exchangeRate: number;
  showConverted: boolean;
  onToggleConverted: (show: boolean) => void;
  onRefreshPrices?: () => void;
  pricesLoading?: boolean;
  coinBalance?: number;
  onChargeCoins?: () => void;
  onCoinsConsumed?: () => void;
  onImport?: () => void;
  streak: { currentStreak: number; longestStreak: number; lastRecordDate: string | null };
  streakLoading: boolean;
  onboardingSteps: OnboardingSteps;
  onboardingCompletedCount: number;
  onboardingTotalSteps: number;
  onboardingVisible: boolean;
  onDismissOnboarding: () => void;
  onCompleteOnboardingStep?: (step: keyof OnboardingSteps) => void;
  onOpenAddTrade?: () => void;
  onCopy?: (trade: Trade) => void;
}

const DATE_PRESET_KEYS: DatePreset[] = ['today', 'week', 'month', 'year', 'all'];

// ─── Trade List Skeleton ─────────────────────────────────────────────────

function TradeListSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Month header skeleton */}
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="h-5 w-24 rounded-lg bg-white/10" />
        <div className="h-4 w-12 rounded-lg bg-white/8" />
      </div>
      {/* Trade card skeletons */}
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-white/8 bg-white/3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex-none" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 rounded-lg bg-white/10" />
              <div className="h-3 w-12 rounded-lg bg-white/8" />
            </div>
            <div className="h-3 w-32 rounded-lg bg-white/8" />
          </div>
          <div className="h-4 w-16 rounded-lg bg-white/10 flex-none" />
        </div>
      ))}
    </div>
  );
}

// ─── Smart Empty State ───────────────────────────────────────────────────

function SmartEmptyState() {
  const te = useTranslations('trade.empty');
  const tc = useTranslations('common');

  const steps = [
    {
      icon: <PenLine size={18} className="text-blue-400" />,
      iconBg: 'bg-blue-500/10',
      title: te('step1Title'),
      desc: te('step1Desc'),
    },
    {
      icon: <BookOpen size={18} className="text-emerald-400" />,
      iconBg: 'bg-emerald-500/10',
      title: te('step2Title'),
      desc: te('step2Desc'),
    },
    {
      icon: <BarChart2 size={18} className="text-purple-400" />,
      iconBg: 'bg-purple-500/10',
      title: te('step3Title'),
      desc: te('step3Desc'),
    },
    {
      icon: <Sparkles size={18} className="text-yellow-400" />,
      iconBg: 'bg-yellow-500/10',
      title: te('step4Title'),
      desc: te('step4Desc'),
    },
  ];

  return (
    <div className="flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
        <Brain size={30} className="text-white/20" />
      </div>
      <h3 className="text-xl font-extrabold text-white mb-1">{te('title')}</h3>
      <p className="text-sm text-white/35 mb-8 text-center max-w-xs">
        {te('desc')}
      </p>

      {/* Steps */}
      <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${step.iconBg}`}>
              {step.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white mb-0.5">{step.title}</div>
              <div className="text-xs text-white/35 leading-relaxed">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Ghost sample trades */}
      <div className="w-full max-w-md space-y-2 mb-8 pointer-events-none select-none opacity-40">
        {[
          { symbol: 'AAPL', name: 'Apple', side: te('ghostBuy'), price: '$182.50', qty: 10, pnl: '+$245', date: '2024-01-15' },
          { symbol: '005930', name: 'Samsung', side: te('ghostSell'), price: '71,200', qty: 50, pnl: '+12.3', date: '2024-01-12' },
        ].map((t, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/3"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-none ${
              t.side === te('ghostBuy') ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {t.side}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{t.name}</span>
                <span className="text-xs text-white/30">{t.symbol}</span>
              </div>
              <div className="text-xs text-white/30">{t.date} · {t.price} × {t.qty}{tc('shares')}</div>
            </div>
            <div className="text-xs font-bold text-emerald-400 flex-none">{t.pnl}</div>
          </div>
        ))}
      </div>

      {/* CTA Arrow */}
      <div className="flex flex-col items-center gap-2 text-white/30">
        <p className="text-xs font-semibold">{te('ctaText')}</p>
        <ArrowDown size={20} className="animate-bounce" />
      </div>
    </div>
  );
}

// Format KRW amount with proper suffix
function formatKRW(value: number, locale: string = 'ko'): string {
  const abs = Math.abs(value);
  const numLocale = locale === 'ko' ? 'ko-KR' : 'en-US';
  if (locale === 'ko') {
    if (abs >= 1_0000_0000) return `${(value / 1_0000_0000).toFixed(1)}억원`;
    if (abs >= 1_0000) return `${(value / 1_0000).toFixed(0)}만원`;
    return `${Math.round(value).toLocaleString(numLocale)}원`;
  }
  // English: use standard abbreviations
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KRW`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K KRW`;
  return `${Math.round(value).toLocaleString(numLocale)} KRW`;
}

// Format USD amount with proper suffix (sign$number: -$1.2M, +$5K)
function formatUSD(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
}

// Format portfolio value based on locale (KRW for ko, USD for en)
function formatPortfolioValue(value: number, locale: string, exchangeRate: number): string {
  if (locale === 'ko') {
    return formatKRW(value, locale);
  }
  // EN locale: convert KRW to USD
  const usdValue = value / exchangeRate;
  return formatUSD(usdValue);
}

export function TradeListView({
  tradesLoading,
  darkMode,
  currentUser,
  trades,
  filteredTrades,
  filterState,
  onDelete,
  onEdit,
  openMonths,
  toggleMonth,
  currentPrices,
  exchangeRate,
  showConverted,
  onToggleConverted,
  onRefreshPrices,
  pricesLoading,
  coinBalance = 0,
  onChargeCoins,
  onCoinsConsumed,
  onImport,
  streak,
  streakLoading,
  onboardingSteps,
  onboardingCompletedCount,
  onboardingTotalSteps,
  onboardingVisible,
  onDismissOnboarding,
  onCompleteOnboardingStep,
  onOpenAddTrade,
  onCopy,
}: TradeListViewProps) {
  const tv = useTranslations('trade.view');
  const tc = useTranslations('common');
  const currentLocale = useLocale();

  const DATE_PRESETS = useMemo(() => DATE_PRESET_KEYS.map(key => ({
    key,
    label: tv(`datePreset${key.charAt(0).toUpperCase() + key.slice(1)}` as 'datePresetToday' | 'datePresetWeek' | 'datePresetMonth' | 'datePresetYear' | 'datePresetAll'),
  })), [tv]);

  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'analysis'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [analysisInitialTab, setAnalysisInitialTab] = useState<'performance' | 'charts' | 'ai' | 'trades' | undefined>();
  const [calendarDayDate, setCalendarDayDate] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobileView(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!showSortDropdown) return;
    const handler = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSortDropdown]);

  useEffect(() => {
    if (!showMoreDropdown) return;
    const handler = (e: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setShowMoreDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreDropdown]);

  const switchToAnalysis = useCallback(() => {
    setViewMode('analysis');
    onCompleteOnboardingStep?.('visitAnalysis');
  }, [onCompleteOnboardingStep]);

  const handleOnboardingStepClick = useCallback((step: keyof OnboardingSteps) => {
    switch (step) {
      case 'firstTrade':
      case 'buySellCycle':
        onOpenAddTrade?.();
        break;
      case 'visitAnalysis':
        switchToAnalysis();
        break;
      case 'aiReport':
        setAnalysisInitialTab('ai');
        switchToAnalysis();
        break;
    }
  }, [onOpenAddTrade, switchToAnalysis]);

  // Trade analysis engine — uses filteredTrades so analysis view respects active filters
  const { analysis } = useTradeAnalysis(filteredTrades, currentUser, currentLocale);
  const portfolio = usePortfolio(trades, currentPrices, exchangeRate);

  // USD 종목 존재 여부 (환율 적용 버튼 표시 조건)
  const hasUSDTrades = useMemo(
    () => trades.some(t => !isKRWSymbol(t.symbol)),
    [trades]
  );

  // 매수/매도 건수 (분석 탭 EmptyState용) — filteredTrades 기준
  const buyCount = useMemo(() => filteredTrades.filter(t => t.side === 'BUY').length, [filteredTrades]);
  const sellCount = useMemo(() => filteredTrades.filter(t => t.side === 'SELL').length, [filteredTrades]);

  const {
    selectedSymbol, setSelectedSymbol,
    filterSymbol, setFilterSymbol,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    holdingOnly, setHoldingOnly,
    activeDatePreset, applyDatePreset,
    sideFilter, setSideFilter,
    sortBy, setSortBy,
  } = filterState;

  // Derive Daily Data for Calendar (evaluation P&L for held, realized P&L for sold)
  // Apply all active filters including date range
  const dailyData = useMemo(() => {
    const map = new Map<string, { krw: number; usd: number }>();

    // Build filtered source: apply all filters
    let source = trades;
    if (selectedSymbol) {
      source = source.filter(t => t.symbol === selectedSymbol);
    }
    if (holdingOnly) {
      source = source.filter(t => filterState.heldSymbols.has(t.symbol));
    }
    if (filterSymbol) {
      const lower = filterSymbol.toLowerCase();
      source = source.filter(t =>
        t.symbol.toLowerCase().includes(lower) ||
        (t.symbol_name && t.symbol_name.toLowerCase().includes(lower))
      );
    }
    // Apply date filter so calendar reflects active preset/date range
    if (dateFrom) source = source.filter(t => t.date >= dateFrom);
    if (dateTo) source = source.filter(t => t.date <= dateTo);

    // Pre-compute avg buy price per symbol
    const buyData = new Map<string, { totalQty: number; totalAmount: number }>();
    for (const t of trades) {
      if (t.side !== 'BUY') continue;
      const existing = buyData.get(t.symbol) ?? { totalQty: 0, totalAmount: 0 };
      existing.totalQty += t.quantity;
      existing.totalAmount += t.price * t.quantity;
      buyData.set(t.symbol, existing);
    }
    const avgBuyPriceMap = new Map<string, number>();
    for (const [symbol, data] of buyData) {
      avgBuyPriceMap.set(symbol, data.totalQty > 0 ? data.totalAmount / data.totalQty : 0);
    }

    // Compute holding quantity per symbol
    const holdingQtyMap = new Map<string, number>();
    for (const t of trades) {
      const curr = holdingQtyMap.get(t.symbol) ?? 0;
      holdingQtyMap.set(t.symbol, t.side === 'BUY' ? curr + t.quantity : curr - t.quantity);
    }

    // Track which symbols' evaluation P&L we've already added (once per symbol per day computation)
    const evaluationAdded = new Set<string>();

    source.forEach(t => {
      const existing = map.get(t.date) || { krw: 0, usd: 0 };
      const isKR = isKRWSymbol(t.symbol);
      const rate = isKR ? 1 : (showConverted ? exchangeRate : 1);

      if (t.side === 'SELL') {
        // Realized P&L for SELL: (sellPrice - avgBuyPrice) * quantity
        const avgBuyPrice = avgBuyPriceMap.get(t.symbol) ?? 0;
        if (avgBuyPrice > 0) {
          const realizedPnl = (t.price - avgBuyPrice) * t.quantity * rate;
          if (isKR || showConverted) {
            existing.krw += realizedPnl;
          } else {
            existing.usd += realizedPnl;
          }
        }
      } else if (t.side === 'BUY') {
        // For BUY trades: show evaluation P&L if still held and current price available
        // Only add once per symbol to avoid duplicate counting on the purchase date
        const holdingQty = holdingQtyMap.get(t.symbol) ?? 0;
        const cp = currentPrices[t.symbol];
        if (holdingQty > 0 && cp && cp > 0 && !evaluationAdded.has(t.symbol)) {
          evaluationAdded.add(t.symbol);
          const avgBuyPrice = avgBuyPriceMap.get(t.symbol) ?? t.price;
          const evalPnl = (cp - avgBuyPrice) * holdingQty * rate;
          if (isKR || showConverted) {
            existing.krw += evalPnl;
          } else {
            existing.usd += evalPnl;
          }
        }
      }

      map.set(t.date, existing);
    });

    return Array.from(map.entries()).map(([key, { krw, usd }]) => ({
      key,
      krwValue: krw,
      usdValue: usd,
    }));
  }, [trades, selectedSymbol, holdingOnly, filterSymbol, filterState.heldSymbols, showConverted, exchangeRate, currentPrices, dateFrom, dateTo, sideFilter]);

  // Trades and P&L for the selected calendar day
  const calendarDayTrades = useMemo(() => {
    if (!calendarDayDate) return [];
    return trades.filter(t => t.date === calendarDayDate);
  }, [calendarDayDate, trades]);

  const calendarDayPnL = useMemo(() => {
    if (!calendarDayDate) return undefined;
    const entry = dailyData.find(d => d.key === calendarDayDate);
    if (!entry) return undefined;
    return { krw: entry.krwValue, usd: entry.usdValue };
  }, [calendarDayDate, dailyData]);

  // Portfolio Summary: calculate invested amount, unrealized/realized P&L
  const portfolioSummary = useMemo(() => {
    // Build per-symbol position data
    const symbolData = new Map<string, {
      totalBuyQty: number;
      totalBuyAmount: number; // price * qty sum for avg cost
      totalSellQty: number;
      totalSellAmount: number;
      isKRW: boolean;
    }>();

    for (const t of trades) {
      const existing = symbolData.get(t.symbol) ?? {
        totalBuyQty: 0,
        totalBuyAmount: 0,
        totalSellQty: 0,
        totalSellAmount: 0,
        isKRW: isKRWSymbol(t.symbol),
      };

      if (t.side === 'BUY') {
        existing.totalBuyQty += t.quantity;
        existing.totalBuyAmount += t.price * t.quantity;
      } else {
        existing.totalSellQty += t.quantity;
        existing.totalSellAmount += t.price * t.quantity;
      }

      symbolData.set(t.symbol, existing);
    }

    let totalInvestedKRW = 0;      // Current holdings at cost (KRW)
    let totalMarketValueKRW = 0;   // Current holdings at market price (KRW)
    let totalRealizedKRW = 0;      // Realized P&L (KRW)

    for (const [symbol, data] of symbolData) {
      const rate = data.isKRW ? 1 : exchangeRate;
      const avgBuyPrice = data.totalBuyQty > 0
        ? data.totalBuyAmount / data.totalBuyQty
        : 0;
      const holdingQty = data.totalBuyQty - data.totalSellQty;

      // Invested amount (holdings at cost)
      if (holdingQty > 0) {
        totalInvestedKRW += avgBuyPrice * holdingQty * rate;

        // Market value (holdings at current price)
        const cp = currentPrices[symbol];
        if (cp && cp > 0) {
          totalMarketValueKRW += cp * holdingQty * rate;
        } else {
          // No current price: use cost as fallback
          totalMarketValueKRW += avgBuyPrice * holdingQty * rate;
        }
      }

      // Realized P&L: (sell price - avg buy price) × sold qty
      if (data.totalSellQty > 0 && avgBuyPrice > 0) {
        const avgSellPrice = data.totalSellAmount / data.totalSellQty;
        totalRealizedKRW += (avgSellPrice - avgBuyPrice) * data.totalSellQty * rate;
      }
    }

    const totalUnrealizedKRW = totalMarketValueKRW - totalInvestedKRW;
    const totalReturnRate = totalInvestedKRW > 0
      ? ((totalMarketValueKRW - totalInvestedKRW) / totalInvestedKRW) * 100
      : 0;

    return {
      totalInvestedKRW,
      totalMarketValueKRW,
      totalUnrealizedKRW,
      totalRealizedKRW,
      totalReturnRate,
    };
  }, [trades, currentPrices, exchangeRate]);


  return (
    <div className="h-full flex flex-col">
      {/* Page Title */}
      <div className="flex-none mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                {selectedSymbol && (
                  <button
                    onClick={() => setSelectedSymbol('')}
                    className="p-1 h-auto aspect-square rounded-xl mr-1 hover:bg-white/10 text-white/40 transition-colors"
                  >
                    <ChevronDown size={24} className="rotate-90" />
                  </button>
                )}
                {selectedSymbol ? tv('symbolDetail') : (viewMode === 'calendar' ? tv('tradeCalendar') : viewMode === 'analysis' ? tv('aiAnalysis') : tv('tradeJournal'))}
                {selectedSymbol && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {selectedSymbol}
                  </span>
                )}
              </h2>
              <StreakBadge
                currentStreak={streak.currentStreak}
                longestStreak={streak.longestStreak}
                loading={streakLoading}
              />
            </div>
            <p className="text-sm text-white/30 mt-1 font-medium">
              {viewMode === 'analysis' && analysis
                ? tv('completedTradesAnalysis', { count: analysis.roundTrips.length })
                : trades.length > 0 ? tv('totalTradeRecords', { count: trades.length }) : tv('firstTradePrompt')}
            </p>
          </div>
        </div>
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist
        steps={onboardingSteps}
        completedCount={onboardingCompletedCount}
        totalSteps={onboardingTotalSteps}
        isVisible={onboardingVisible}
        onDismiss={onDismissOnboarding}
        onStepClick={handleOnboardingStepClick}
      />

      {/* Portfolio Summary Cards */}
      {trades.length > 0 && !selectedSymbol && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {/* Total Invested */}
          <div className="p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Wallet size={14} className="text-blue-400" />
              </div>
            </div>
            <div className="text-lg font-bold text-white truncate" title={currentLocale === 'ko'
              ? `${Math.round(portfolioSummary.totalInvestedKRW).toLocaleString('ko-KR')}원`
              : `$${Math.round(Math.abs(portfolioSummary.totalInvestedKRW / exchangeRate)).toLocaleString('en-US')}`}>
              {formatPortfolioValue(portfolioSummary.totalInvestedKRW, currentLocale, exchangeRate)}
            </div>
            <div className="text-xs text-white/30 font-medium mt-0.5">{tv('totalInvested')}</div>
          </div>

          {/* Total Return Rate */}
          <div className="p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${portfolioSummary.totalReturnRate >= 0 ? 'bg-rose-500/10' : 'bg-blue-500/10'}`}>
                {portfolioSummary.totalReturnRate >= 0
                  ? <TrendingUp size={14} className="text-rose-400" />
                  : <TrendingDown size={14} className="text-blue-400" />
                }
              </div>
            </div>
            <div className={`text-lg font-bold ${portfolioSummary.totalReturnRate > 0 ? 'text-rose-400' : portfolioSummary.totalReturnRate < 0 ? 'text-blue-400' : 'text-white'}`}>
              {portfolioSummary.totalReturnRate > 0 ? '+' : ''}{portfolioSummary.totalReturnRate.toFixed(2)}%
            </div>
            <div className="text-xs text-white/30 font-medium mt-0.5">{tv('totalReturn')}</div>
          </div>

          {/* Unrealized P&L */}
          <div className="p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${portfolioSummary.totalUnrealizedKRW >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <BarChart3 size={14} className={portfolioSummary.totalUnrealizedKRW >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              </div>
            </div>
            <div className={`text-lg font-bold truncate ${portfolioSummary.totalUnrealizedKRW > 0 ? 'text-emerald-400' : portfolioSummary.totalUnrealizedKRW < 0 ? 'text-red-400' : 'text-white'}`}
              title={currentLocale === 'ko'
                ? `${Math.round(portfolioSummary.totalUnrealizedKRW).toLocaleString('ko-KR')}원`
                : `${portfolioSummary.totalUnrealizedKRW < 0 ? '-' : ''}$${Math.round(Math.abs(portfolioSummary.totalUnrealizedKRW / exchangeRate)).toLocaleString('en-US')}`}
            >
              {portfolioSummary.totalUnrealizedKRW > 0 ? '+' : ''}{formatPortfolioValue(portfolioSummary.totalUnrealizedKRW, currentLocale, exchangeRate)}
            </div>
            <div className="text-xs text-white/30 font-medium mt-0.5">{tv('unrealizedPnl')}</div>
          </div>

          {/* Realized P&L */}
          <div className="p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${portfolioSummary.totalRealizedKRW >= 0 ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`}>
                <DollarSign size={14} className={portfolioSummary.totalRealizedKRW >= 0 ? 'text-emerald-400' : 'text-orange-400'} />
              </div>
            </div>
            <div className={`text-lg font-bold truncate ${portfolioSummary.totalRealizedKRW > 0 ? 'text-emerald-400' : portfolioSummary.totalRealizedKRW < 0 ? 'text-orange-400' : 'text-white'}`}
              title={currentLocale === 'ko'
                ? `${Math.round(portfolioSummary.totalRealizedKRW).toLocaleString('ko-KR')}원`
                : `${portfolioSummary.totalRealizedKRW < 0 ? '-' : ''}$${Math.round(Math.abs(portfolioSummary.totalRealizedKRW / exchangeRate)).toLocaleString('en-US')}`}
            >
              {portfolioSummary.totalRealizedKRW > 0 ? '+' : ''}{formatPortfolioValue(portfolioSummary.totalRealizedKRW, currentLocale, exchangeRate)}
            </div>
            <div className="text-xs text-white/30 font-medium mt-0.5">{tv('realizedPnl')}</div>
          </div>
        </div>
      )}

      {/* View Toggle + Filter Area */}
      {!selectedSymbol && (
        <div className="flex-none flex flex-col gap-2 mb-5">
          {/* Row 1: Search + Filter Buttons + View Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 w-full sm:max-w-[280px] min-w-[160px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder={tv('searchPlaceholder')}
                value={filterSymbol}
                onChange={(e) => setFilterSymbol(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm font-medium rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/25 outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
              />
              {filterSymbol && (
                <button onClick={() => setFilterSymbol('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Side Filter */}
              <div className="flex p-0.5 rounded-xl bg-white/5 border border-white/8 gap-0.5">
                {(['ALL', 'BUY', 'SELL'] as const).map(side => (
                  <button
                    key={side}
                    onClick={() => setSideFilter(side as SideFilter)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      sideFilter === side
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    {side === 'ALL' ? tv('sideAll') : side === 'BUY' ? tc('buy') : tc('sell')}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  onClick={() => setShowSortDropdown(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                    sortBy !== 'date-desc'
                      ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                      : 'text-white/40 bg-white/5 border-white/8 hover:text-white/60 hover:bg-white/8'
                  }`}
                >
                  <ArrowUpDown size={13} />
                  {tv({
                    'date-desc': 'sort_date-desc' as const,
                    'date-asc': 'sort_date-asc' as const,
                    'pnl-desc': 'sort_pnl-desc' as const,
                    'pnl-asc': 'sort_pnl-asc' as const,
                  }[sortBy])}
                </button>
                {showSortDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-40 z-20 rounded-xl border border-white/10 bg-card shadow-toss-lg overflow-hidden">
                    {(['date-desc', 'date-asc', 'pnl-desc', 'pnl-asc'] as const).map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setSortBy(opt); setShowSortDropdown(false); }}
                        className={`w-full text-left px-3 py-2.5 text-xs font-semibold transition-colors ${
                          sortBy === opt ? 'bg-indigo-500/10 text-indigo-400' : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        {tv({
                          'date-desc': 'sort_date-desc' as const,
                          'date-asc': 'sort_date-asc' as const,
                          'pnl-desc': 'sort_pnl-desc' as const,
                          'pnl-asc': 'sort_pnl-asc' as const,
                        }[opt])}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Holding Only Toggle */}
              <button
                onClick={() => setHoldingOnly(!holdingOnly)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${holdingOnly
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'text-white/40 bg-white/5 border-white/8 hover:text-white/60 hover:bg-white/8'
                }`}
              >
                <Briefcase size={13} />
                {tv('holdingOnly')}
              </button>

              {/* More Actions Dropdown */}
              {(hasUSDTrades || onRefreshPrices || onImport) && (
              <div className="relative" ref={moreDropdownRef}>
                <button
                  onClick={() => setShowMoreDropdown(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                    showMoreDropdown || showConverted
                      ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                      : 'text-white/40 bg-white/5 border-white/8 hover:text-white/60 hover:bg-white/8'
                  }`}
                  title={tv('moreActions')}
                >
                  <MoreHorizontal size={15} />
                </button>
                {showMoreDropdown && (
                  <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1 w-48 z-20 rounded-xl border border-white/10 bg-card shadow-toss-lg overflow-hidden">
                    {/* KRW Conversion Toggle */}
                    {hasUSDTrades && (
                      <button
                        onClick={() => { onToggleConverted(!showConverted); setShowMoreDropdown(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                          showConverted ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        <DollarSign size={13} />
                        {tv('applyExchangeRate')}
                        {showConverted && <span className="ml-auto text-emerald-400 text-[10px]">ON</span>}
                      </button>
                    )}
                    {/* Refresh Current Prices */}
                    {onRefreshPrices && (
                      <button
                        onClick={() => { onRefreshPrices(); setShowMoreDropdown(false); }}
                        disabled={pricesLoading}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                          pricesLoading ? 'text-indigo-400 cursor-wait' : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        <RotateCw size={13} className={pricesLoading ? 'animate-spin' : ''} />
                        {tv('refreshPrices')}
                      </button>
                    )}
                    {/* Import Trades */}
                    {onImport && (
                      <button
                        onClick={() => { onImport(); setShowMoreDropdown(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-white/60 hover:bg-white/5 transition-colors"
                      >
                        <Upload size={13} />
                        {tv('importTrades')}
                      </button>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* Date Filter Active Badge */}
              {dateFrom && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all whitespace-nowrap"
                >
                  <Calendar size={13} />
                  {dateFrom === dateTo ? dateFrom : `${dateFrom} ~ ${dateTo}`}
                  <X size={12} className="ml-0.5 opacity-60" />
                </button>
              )}
            </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex p-1 rounded-xl bg-white/5 border border-white/8 gap-0.5 flex-none">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list'
                  ? 'bg-white/10 text-white shadow-md'
                  : 'text-white/30 hover:text-white/60'
                  }`}
              >
                <ListIcon size={14} strokeWidth={2} />
                <span className="hidden sm:inline">{tv('listView')}</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar'
                  ? 'bg-white/10 text-white shadow-md'
                  : 'text-white/30 hover:text-white/60'
                  }`}
              >
                <LayoutGrid size={14} strokeWidth={2} />
                <span className="hidden sm:inline">{tv('calendarView')}</span>
              </button>
              <button
                onClick={switchToAnalysis}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'analysis'
                  ? 'bg-white/10 text-white shadow-md'
                  : 'text-white/30 hover:text-white/60'
                  }`}
              >
                <Brain size={14} strokeWidth={2} />
                <span className="hidden sm:inline">{tv('analysisView')}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Date Preset Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
            {DATE_PRESETS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => applyDatePreset(key)}
                className={`flex-none px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                  activeDatePreset === key
                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    : 'text-white/40 bg-white/5 border-white/8 hover:text-white/60 hover:bg-white/8'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 pb-20 custom-scrollbar">
        <MotionWrapper key={selectedSymbol ? 'detail' : viewMode}>
          {selectedSymbol ? (
            <div className="animate-slide-up">
              {viewMode === 'list' ? (
                <SymbolDetailCard
                  symbol={selectedSymbol}
                  trades={trades}
                  currentPrice={currentPrices[selectedSymbol]}
                  onClose={() => setSelectedSymbol('')}
                  darkMode={darkMode}
                  exchangeRate={exchangeRate}
                  showConverted={showConverted}
                />
              ) : (
                <div className="rounded-2xl p-6 border border-white/8 bg-white/3">
                  <CalendarView
                    currentDate={calendarDate}
                    onDateChange={setCalendarDate}
                    dailyData={dailyData}
                    onSelectDate={setCalendarDayDate}
                    selectedDateStr={calendarDayDate || undefined}
                    darkMode={darkMode}
                  />
                </div>
              )}
            </div>
          ) : (
            viewMode === 'analysis' ? (
              <AnalysisDashboard
                analysis={analysis}
                darkMode={darkMode}
                tradesCount={filteredTrades.length}
                buyCount={buyCount}
                sellCount={sellCount}
                currentUser={currentUser}
                coinBalance={coinBalance}
                exchangeRate={exchangeRate}
                onChargeCoins={onChargeCoins}
                onCoinsConsumed={onCoinsConsumed}
                onCompleteAIReportStep={() => onCompleteOnboardingStep?.('aiReport')}
                portfolio={portfolio}
                pricesLoading={pricesLoading}
                onRefreshPrices={onRefreshPrices}
                initialTab={analysisInitialTab}
              />
            ) : viewMode === 'calendar' ? (
              <>
                <div className="flex gap-4 min-h-0">
                  <div className="flex-1 min-w-0 rounded-2xl p-6 border border-white/8 bg-white/3">
                    <CalendarView
                      currentDate={calendarDate}
                      onDateChange={setCalendarDate}
                      dailyData={dailyData}
                      onSelectDate={setCalendarDayDate}
                      selectedDateStr={calendarDayDate || undefined}
                      darkMode={darkMode}
                    />
                  </div>

                  {/* Desktop side panel */}
                  <AnimatePresence>
                    {calendarDayDate && (
                      <motion.div
                        initial={{ opacity: 0, x: 16, width: 0 }}
                        animate={{ opacity: 1, x: 0, width: 288 }}
                        exit={{ opacity: 0, x: 16, width: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                        className="hidden md:flex flex-col flex-none overflow-hidden rounded-2xl border border-white/8 bg-white/3"
                        style={{ minWidth: 0 }}
                      >
                        <CalendarDayPanelContent
                          dateStr={calendarDayDate}
                          trades={calendarDayTrades}
                          dailyPnL={calendarDayPnL}
                          onClose={() => setCalendarDayDate(null)}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          showConverted={showConverted}
                          exchangeRate={exchangeRate}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile BottomSheet */}
                {isMobileView && (
                  <BottomSheet
                    isOpen={!!calendarDayDate}
                    onClose={() => setCalendarDayDate(null)}
                    title={calendarDayDate ? '' : undefined}
                  >
                    {calendarDayDate && (
                      <CalendarDayPanelContent
                        dateStr={calendarDayDate}
                        trades={calendarDayTrades}
                        dailyPnL={calendarDayPnL}
                        onClose={() => setCalendarDayDate(null)}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        showConverted={showConverted}
                        exchangeRate={exchangeRate}
                      />
                    )}
                  </BottomSheet>
                )}
              </>
            ) : tradesLoading ? (
              <TradeListSkeleton />
            ) : trades.length === 0 ? (
              <SmartEmptyState />
            ) : (
              <TradeList
                trades={filteredTrades}
                allTrades={trades}
                onDelete={onDelete}
                onEdit={onEdit}
                onCopy={onCopy}
                openMonths={openMonths}
                toggleMonth={toggleMonth}
                darkMode={darkMode}
                onSymbolClick={(sym) => setSelectedSymbol(sym)}
                exchangeRate={exchangeRate}
                showConverted={showConverted}
                currentPrices={currentPrices}
                heldSymbols={filterState.heldSymbols}
                sortBy={sortBy}
              />
            )
          )}
        </MotionWrapper>
      </div>
    </div>
  );
}
