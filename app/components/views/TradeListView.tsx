import React, { useState } from 'react';
import { Trade } from '@/app/types/trade';
import { User } from '@supabase/supabase-js';
import { TradeList } from '@/app/components/TradeList';
import { CalendarView } from '@/app/components/CalendarView';
import { SymbolDetailCard } from '@/app/components/SymbolDetailCard';
import { MotionWrapper } from '@/app/components/MotionWrapper';
import { LayoutGrid, List as ListIcon, Search, Filter, X, Calendar as CalendarIcon, RefreshCw, ChevronDown, Upload } from 'lucide-react';
import { CsvImportModal } from '@/app/components/CsvImportModal';
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

  const handleBulkImport = async (newTrades: any[]) => {
    try {
      if (currentUser) {
        // DB Import
        const rows = newTrades.map(t => ({
          user_id: currentUser.id,
          date: t.date,
          symbol: t.symbol,
          side: t.side,
          price: t.price,
          quantity: t.quantity,
          memo: t.memo,
          tags: [],
          image: null
        }));

        const { error } = await supabase.from('trades').insert(rows);
        if (error) throw error;
        window.location.reload(); // Simple reload to refresh data
      } else {
        // Guest Mode Import
        const existingStr = localStorage.getItem('stock-journal-guest-trades-v1');
        const existingTrades = existingStr ? JSON.parse(existingStr) : [];
        const updatedTrades = [...existingTrades, ...newTrades];
        localStorage.setItem('stock-journal-guest-trades-v1', JSON.stringify(updatedTrades));
        window.location.reload();
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('가져오기에 실패했습니다.');
    }
  };

  // Glassmorphism Shared Classes
  const inputContainerClass = `flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${darkMode
    ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 focus-within:bg-slate-800/80 focus-within:border-indigo-500/50'
    : 'bg-white/60 border-indigo-50/80 hover:bg-white/80 focus-within:bg-white focus-within:border-indigo-200 shadow-sm'
    }`;

  const inputClass = `bg-transparent outline-none text-sm w-full font-medium ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
    }`;

  // Filter Bar Component
  const renderFilterBar = () => (
    <div className={`mb-6 p-1.5 rounded-2xl flex flex-wrap gap-2 items-center lg:items-stretch`}>
      <div className={`w-full sm:flex-1 sm:min-w-[200px] ${inputContainerClass}`}>
        <Search size={18} className={darkMode ? "text-indigo-400" : "text-indigo-400"} strokeWidth={2.5} />
        <input
          type="text"
          placeholder="종목명 검색..."
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className={`w-full sm:flex-1 sm:min-w-[200px] ${inputContainerClass}`}>
        <Filter size={18} className={darkMode ? "text-purple-400" : "text-purple-400"} strokeWidth={2.5} />
        <input
          type="text"
          placeholder="태그 (쉼표 구분)"
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className={inputClass}
        />
      </div>
      {(filterSymbol || filterTag || dateFrom) && (
        <button
          onClick={resetFilters}
          className={`
                    px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 hover:-translate-y-0.5 btn-press
                    ${darkMode
              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
              : 'bg-rose-50 text-rose-500 hover:bg-rose-100 shadow-sm'}
                `}
        >
          <RefreshCw size={14} className={darkMode ? "" : ""} />
          초기화
        </button>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header Controls */}
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2.5 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {selectedSymbol && (
              <button
                onClick={() => setSelectedSymbol('')}
                className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <ChevronDown size={28} className="rotate-90" />
              </button>
            )}
            {selectedSymbol ? '종목 상세 분석' : (viewMode === 'calendar' ? '매매 캘린더' : '매매 피드')}
            {selectedSymbol && (
              <span className={`text-sm font-bold px-3 py-1 rounded-lg ${darkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'}`}>
                {selectedSymbol}
              </span>
            )}
          </h2>
          {/* ... description ... */}
        </div>

        <div className="flex gap-3">
          {/* Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-md font-bold text-xs transition-all active:scale-95
                ${darkMode ? 'bg-slate-900/60 border-slate-700/50 text-slate-400 hover:bg-slate-800' : 'bg-white/60 border-white/60 text-slate-500 hover:bg-white'}
            `}
          >
            <Upload size={14} />
            <span className="hidden sm:inline">가져오기</span>
          </button>

          {/* Currency Toggle */}
          <button
            onClick={() => onToggleConverted(!showConverted)}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-md font-bold text-xs transition-all active:scale-95
                ${showConverted
                ? (darkMode ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-600')
                : (darkMode ? 'bg-slate-900/60 border-slate-700/50 text-slate-400 hover:bg-slate-800' : 'bg-white/60 border-white/60 text-slate-500 hover:bg-white')}
            `}
          >
            <RefreshCw size={14} className={showConverted ? "text-indigo-500" : ""} />
            <span>{showConverted ? `₩ ${exchangeRate.toLocaleString()}원` : '$ USD'}</span>
          </button>

          <div className={`flex p-1.5 rounded-xl border backdrop-blur-md ${darkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white/60 border-white/60 shadow-lg shadow-indigo-100/20'}`}>
            <button
              onClick={() => setViewMode('list')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95
                ${viewMode === 'list'
                  ? (darkMode ? 'bg-slate-700 text-white shadow-md' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200')
                  : (darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600')}
            `}
            >
              <ListIcon size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">목록</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95
                ${viewMode === 'calendar'
                  ? (darkMode ? 'bg-slate-700 text-white shadow-md' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200')
                  : (darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600')}
            `}
            >
              <LayoutGrid size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">캘린더</span>
            </button>
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
                <div className={`rounded-3xl p-6 border glass-card ${darkMode ? 'bg-slate-900/40 border-slate-700/50' : 'bg-white/60 border-white/60 shadow-lg'}`}>
                  <CalendarView
                    currentDate={calendarDate}
                    onDateChange={setCalendarDate}
                    dailyData={dailyData}
                    onSelectDate={(date) => {
                      // Optional: behavior when clicking a date in symbol view
                      // Maybe filter the list to that date?
                      // For now, let's just keep it consistent or allow navigation
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
              <div className={`rounded-3xl p-6 border glass-card ${darkMode ? 'bg-slate-900/40 border-slate-700/50' : 'bg-white/60 border-white/60 shadow-lg'}`}>
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
                currentUser={currentUser}
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-5xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded-2xl shadow-2xl" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all backdrop-blur-md"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <CsvImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleBulkImport}
      />
    </div>
  );
}
