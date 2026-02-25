import React, { useState, useMemo } from 'react';
import { Trade } from '@/app/types/trade';
import { User } from '@supabase/supabase-js';
import { TradeList } from '@/app/components/TradeList';
import { CalendarView } from '@/app/components/CalendarView';
import { SymbolDetailCard } from '@/app/components/SymbolDetailCard';
import { MotionWrapper } from '@/app/components/MotionWrapper';
import { AnalysisDashboard } from '@/app/components/views/AnalysisDashboard';
import { isKRWSymbol } from '@/app/utils/format';
import {
  LayoutGrid, List as ListIcon, Search, X, ChevronDown,
  TrendingUp, TrendingDown, Wallet, BarChart3, DollarSign, Briefcase, Calendar, RotateCw, Brain
} from 'lucide-react';
import { useTradeFilter } from '@/app/hooks/useTradeFilter';
import { useTradeAnalysis } from '@/app/hooks/useTradeAnalysis';

interface TradeListViewProps {
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
}

// Format KRW amount with proper suffix
function formatKRW(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_0000_0000) {
    return `${(value / 1_0000_0000).toFixed(1)}억원`;
  }
  if (abs >= 1_0000) {
    return `${(value / 1_0000).toFixed(0)}만원`;
  }
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

export function TradeListView({
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
  pricesLoading
}: TradeListViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'analysis'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Trade analysis engine
  const { analysis, syncing, syncError, lastSyncedAt, syncToDatabase } = useTradeAnalysis(trades, currentUser);

  const {
    selectedSymbol, setSelectedSymbol,
    filterSymbol, setFilterSymbol,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    holdingOnly, setHoldingOnly,
  } = filterState;

  // Derive Daily Data for Calendar (evaluation P&L for held, realized P&L for sold)
  // Apply holding + symbol filters but NOT date filters (useless for calendar)
  const dailyData = useMemo(() => {
    const map = new Map<string, { krw: number; usd: number }>();

    // Build filtered source: apply all filters except date
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
  }, [trades, selectedSymbol, holdingOnly, filterSymbol, filterState.heldSymbols, showConverted, exchangeRate, currentPrices]);

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
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              {selectedSymbol && (
                <button
                  onClick={() => setSelectedSymbol('')}
                  className="p-1 h-auto aspect-square rounded-xl mr-1 hover:bg-white/10 text-white/40 transition-colors"
                >
                  <ChevronDown size={24} className="rotate-90" />
                </button>
              )}
              {selectedSymbol ? '종목 상세 분석' : (viewMode === 'calendar' ? '매매 캘린더' : viewMode === 'analysis' ? 'AI 매매 분석' : '매매 일지')}
              {selectedSymbol && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {selectedSymbol}
                </span>
              )}
            </h2>
            <p className="text-sm text-white/30 mt-1 font-medium">
              {viewMode === 'analysis' && analysis
                ? `${analysis.roundTrips.length}건의 완결된 거래 분석`
                : trades.length > 0 ? `총 ${trades.length}건의 매매 기록` : '첫 번째 매매를 기록해보세요'}
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      {trades.length > 0 && !selectedSymbol && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {/* Total Invested */}
          <div className="p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Wallet size={14} className="text-blue-400" />
              </div>
            </div>
            <div className="text-lg font-bold text-white truncate" title={`${Math.round(portfolioSummary.totalInvestedKRW).toLocaleString('ko-KR')}원`}>
              {formatKRW(portfolioSummary.totalInvestedKRW)}
            </div>
            <div className="text-xs text-white/30 font-medium mt-0.5">총 진입 금액</div>
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
            <div className="text-xs text-white/30 font-medium mt-0.5">전체 수익률</div>
          </div>

          {/* Unrealized P&L */}
          <div className="p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${portfolioSummary.totalUnrealizedKRW >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <BarChart3 size={14} className={portfolioSummary.totalUnrealizedKRW >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              </div>
            </div>
            <div className={`text-lg font-bold truncate ${portfolioSummary.totalUnrealizedKRW > 0 ? 'text-emerald-400' : portfolioSummary.totalUnrealizedKRW < 0 ? 'text-red-400' : 'text-white'}`}
              title={`${Math.round(portfolioSummary.totalUnrealizedKRW).toLocaleString('ko-KR')}원`}
            >
              {portfolioSummary.totalUnrealizedKRW > 0 ? '+' : ''}{formatKRW(portfolioSummary.totalUnrealizedKRW)}
            </div>
            <div className="text-xs text-white/30 font-medium mt-0.5">평가 손익</div>
          </div>

          {/* Realized P&L */}
          <div className="p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${portfolioSummary.totalRealizedKRW >= 0 ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`}>
                <DollarSign size={14} className={portfolioSummary.totalRealizedKRW >= 0 ? 'text-emerald-400' : 'text-orange-400'} />
              </div>
            </div>
            <div className={`text-lg font-bold truncate ${portfolioSummary.totalRealizedKRW > 0 ? 'text-emerald-400' : portfolioSummary.totalRealizedKRW < 0 ? 'text-orange-400' : 'text-white'}`}
              title={`${Math.round(portfolioSummary.totalRealizedKRW).toLocaleString('ko-KR')}원`}
            >
              {portfolioSummary.totalRealizedKRW > 0 ? '+' : ''}{formatKRW(portfolioSummary.totalRealizedKRW)}
            </div>
            <div className="text-xs text-white/30 font-medium mt-0.5">실현 손익</div>
          </div>
        </div>
      )}

      {/* View Toggle + Filter Area */}
      {!selectedSymbol && (
        <div className="flex-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 w-full sm:w-auto">
            {/* Row 1: Search Input */}
            <div className="relative flex-1 w-full sm:max-w-[280px] min-w-[160px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="종목명 검색..."
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

            {/* Row 2: Filter Buttons (on mobile this wraps to next line) */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Holding Only Toggle */}
              <button
                onClick={() => setHoldingOnly(!holdingOnly)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                  holdingOnly
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    : 'text-white/40 bg-white/5 border-white/8 hover:text-white/60 hover:bg-white/8'
                }`}
              >
                <Briefcase size={13} />
                보유 종목
              </button>

              {/* KRW Conversion Toggle */}
              <button
                onClick={() => onToggleConverted(!showConverted)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                  showConverted
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'text-white/40 bg-white/5 border-white/8 hover:text-white/60 hover:bg-white/8'
                }`}
              >
                <DollarSign size={13} />
                환율 적용
              </button>

              {/* Refresh Current Prices */}
              {onRefreshPrices && (
                <button
                  onClick={onRefreshPrices}
                  disabled={pricesLoading}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                    pricesLoading
                      ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 cursor-wait'
                      : 'text-white/40 bg-white/5 border-white/8 hover:text-white/60 hover:bg-white/8'
                  }`}
                >
                  <RotateCw size={13} className={pricesLoading ? 'animate-spin' : ''} />
                  현재가 조회
                </button>
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
          <div className="flex p-1 rounded-xl bg-white/5 border border-white/8 gap-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list'
                ? 'bg-white/10 text-white shadow-md'
                : 'text-white/30 hover:text-white/60'
                }`}
            >
              <ListIcon size={14} strokeWidth={2} />
              <span className="hidden sm:inline">목록</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar'
                ? 'bg-white/10 text-white shadow-md'
                : 'text-white/30 hover:text-white/60'
                }`}
            >
              <LayoutGrid size={14} strokeWidth={2} />
              <span className="hidden sm:inline">캘린더</span>
            </button>
            <button
              onClick={() => setViewMode('analysis')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'analysis'
                ? 'bg-white/10 text-white shadow-md'
                : 'text-white/30 hover:text-white/60'
                }`}
            >
              <Brain size={14} strokeWidth={2} />
              <span className="hidden sm:inline">분석</span>
            </button>
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
                    onSelectDate={(date) => {
                      setDateFrom(date);
                      setDateTo(date);
                    }}
                    selectedDateStr={dateFrom === dateTo ? dateFrom : undefined}
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
                tradesCount={trades.length}
                syncing={syncing}
                syncError={syncError}
                lastSyncedAt={lastSyncedAt}
                isLoggedIn={!!currentUser}
                onSync={syncToDatabase}
              />
            ) : viewMode === 'calendar' ? (
              <div className="rounded-2xl p-6 border border-white/8 bg-white/3">
                <CalendarView
                  currentDate={calendarDate}
                  onDateChange={setCalendarDate}
                  dailyData={dailyData}
                  onSelectDate={(date) => {
                    setDateFrom(date);
                    setDateTo(date);
                    setViewMode('list');
                  }}
                  selectedDateStr={dateFrom === dateTo ? dateFrom : undefined}
                  darkMode={darkMode}
                />
              </div>
            ) : (
              <TradeList
                trades={filteredTrades}
                allTrades={trades}
                onDelete={onDelete}
                onEdit={onEdit}
                openMonths={openMonths}
                toggleMonth={toggleMonth}
                darkMode={darkMode}
                onSymbolClick={(sym) => setSelectedSymbol(sym)}
                exchangeRate={exchangeRate}
                showConverted={showConverted}
                currentPrices={currentPrices}
                heldSymbols={filterState.heldSymbols}
              />
            )
          )}
        </MotionWrapper>
      </div>
    </div>
  );
}
