import React, { useState } from 'react';
import { Trade } from '@/app/types/trade';
import { User } from '@supabase/supabase-js';
import { TradeList } from '@/app/components/TradeList';
import { CalendarView } from '@/app/components/CalendarView';
import { SymbolDetailCard } from '@/app/components/SymbolDetailCard';
import { MotionWrapper } from '@/app/components/MotionWrapper';
import { LayoutGrid, List as ListIcon, Search, Filter, X, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { supabase } from '@/app/lib/supabaseClient';
import { useTradeFilter } from '@/app/hooks/useTradeFilter';
import { PnLPoint } from '@/app/types/stats';

interface TradeListViewProps {
  darkMode: boolean;
  currentUser: User | null;
  trades: Trade[]; // All trades (for calendar daily data calc)
  filteredTrades: Trade[]; // Filtered trades for list
  filterState: ReturnType<typeof useTradeFilter>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (trade: Trade) => void;
  openMonths: Record<string, boolean>;
  toggleMonth: (key: string) => void;
  tagColors: Record<string, string>;
  currentPrices: Record<string, number>;
  exchangeRate: number;
  showConverted: boolean;
  onToggleConverted: (show: boolean) => void;
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
  tagColors,
  currentPrices,
  exchangeRate,
  showConverted,
  onToggleConverted
}: TradeListViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const {
    selectedSymbol, setSelectedSymbol,
    filterSymbol, setFilterSymbol,
    filterTag, setFilterTag,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    resetFilters
  } = filterState;

  // Reset selected symbol when user logs out
  React.useEffect(() => {
    if (!currentUser) {
      setSelectedSymbol('');
    }
  }, [currentUser, setSelectedSymbol]);

  // Derive Daily Data for Calendar
  const dailyData: PnLPoint[] = React.useMemo(() => {
    const map = new Map<string, number>();
    const source = selectedSymbol ? trades.filter(t => t.symbol === selectedSymbol) : trades;

    source.forEach(t => {
      const val = (t.side === 'SELL' ? 1 : -1) * t.price * t.quantity;
      map.set(t.date, (map.get(t.date) || 0) + val);
    });

    return Array.from(map.entries()).map(([key, value]) => ({
      key,
      value,
      label: key.slice(5) // MM-DD 
    }));
  }, [trades, selectedSymbol]);

  // Filter Bar Component - Toss Style
  const renderFilterBar = () => (
    <div className="mb-6 p-2 rounded-2xl bg-muted/30 flex flex-wrap gap-2 items-center lg:items-stretch">
      <div className="w-full sm:flex-1 sm:min-w-[200px]">
        <Input
          leftIcon={<Search size={18} className="text-muted-foreground" strokeWidth={2} />}
          placeholder="종목명 검색..."
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
        />
      </div>
      <div className="w-full sm:flex-1 sm:min-w-[200px]">
        <Input
          leftIcon={<Filter size={18} className="text-muted-foreground" strokeWidth={2} />}
          placeholder="태그 (쉼표 구분)"
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
        />
      </div>
      {(filterSymbol || filterTag || dateFrom) && (
        <Button
          variant="secondary"
          size="md"
          onClick={resetFilters}
          className="gap-2"
        >
          <RefreshCw size={16} />
          초기화
        </Button>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header Controls - Toss Style */}
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            {selectedSymbol && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSymbol('')}
                className="p-1 h-auto aspect-square rounded-xl mr-2 hover:bg-muted text-muted-foreground"
              >
                <ChevronDown size={28} className="rotate-90" />
              </Button>
            )}
            {selectedSymbol ? '종목 상세 분석' : (viewMode === 'calendar' ? '매매 캘린더' : '매매 피드')}
            {selectedSymbol && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                {selectedSymbol}
              </span>
            )}
          </h2>
        </div>

        <div className="flex gap-2">
          {/* Currency Toggle */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onToggleConverted(!showConverted)}
            className={showConverted ? 'border-primary/30 bg-primary/10 text-primary' : ''}
          >
            <RefreshCw size={14} className="mr-2" />
            <span>{showConverted ? `₩ ${exchangeRate.toLocaleString()}원` : '$ USD'}</span>
          </Button>

          <div className="flex p-1 rounded-xl bg-muted/50 gap-1">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`h-8 px-3 text-xs ${viewMode === 'list' ? 'shadow-toss-sm' : 'text-muted-foreground hover:bg-transparent'}`}
            >
              <ListIcon size={14} strokeWidth={2} className="mr-1.5" />
              <span className="hidden sm:inline">목록</span>
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={`h-8 px-3 text-xs ${viewMode === 'calendar' ? 'shadow-toss-sm' : 'text-muted-foreground hover:bg-transparent'}`}
            >
              <LayoutGrid size={14} strokeWidth={2} className="mr-1.5" />
              <span className="hidden sm:inline">캘린더</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar (Only in List View or when needed) */}
      {!selectedSymbol && viewMode === 'list' && renderFilterBar()}

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
                <div className="rounded-2xl p-6 border border-border/50 bg-card shadow-toss">
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
            viewMode === 'calendar' ? (
              <div className="rounded-2xl p-6 border border-border/50 bg-card shadow-toss">
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
                onDelete={onDelete}
                onEdit={onEdit}
                openMonths={openMonths}
                toggleMonth={toggleMonth}
                darkMode={darkMode}
                tagColors={tagColors}
                onSymbolClick={(sym) => setSelectedSymbol(sym)}
                onImagePreview={setPreviewImage}
                exchangeRate={exchangeRate}
                showConverted={showConverted}
              />
            )
          )}
        </MotionWrapper>
      </div>

      {/* Image Preview Modal - Toss Style */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-5xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded-2xl shadow-toss-lg" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-14 right-0 p-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors backdrop-blur-md"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
