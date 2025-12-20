'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/app/lib/supabaseClient';

// Types
import { Trade, TradeSide } from '@/app/types/trade';
import { ActiveTab, NotifyType, TagFilterMode, SortState } from '@/app/types/ui';
import { PnLPoint } from '@/app/types/stats';

// Utils
import { parseTagString, getKoreanWeekdayLabel } from '@/app/utils/format';

// Hooks
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth';
import { useTrades } from '@/app/hooks/useTrades';
import { useStats } from '@/app/hooks/useStats';

// Components
import { Header } from '@/app/components/Header';
import { LoginForm } from '@/app/components/LoginForm';
import { TradeForm } from '@/app/components/TradeForm';
import { EditTradeForm } from '@/app/components/EditTradeForm';
import { TradeList } from '@/app/components/TradeList';
import { StatsDashboard } from '@/app/components/StatsDashboard';
import { SettingsPanel } from '@/app/components/SettingsPanel';
import { CalendarView } from '@/app/components/CalendarView';
import { TagManagerModal } from '@/app/components/TagManagerModal';
import { LayoutGrid, List as ListIcon, Tag as TagIcon, X, Plus, Filter, Search, Activity } from 'lucide-react';
import { MotionWrapper } from '@/app/components/MotionWrapper';
import { SymbolDetailCard } from '@/app/components/SymbolDetailCard';

// Hooks
import { useTagColors } from '@/app/hooks/useTagColors';

const CURRENT_PRICE_KEY = 'stock-journal-current-prices-v1';
const THEME_KEY = 'stock-journal-theme-v1';
const GUEST_TRADES_KEY = 'stock-journal-guest-trades-v1';
const OPEN_MONTHS_KEY = 'stock-journal-open-months-v1';

export default function Home() {
  // --- 1. Auth & Data Hooks ---
  const { user: currentUser, loading: authLoading, logout } = useSupabaseAuth();
  const { trades, loading: tradesLoading, addTrade, removeTrade, updateTrade, clearAllTrades, setTrades } = useTrades(currentUser);

  // --- 2. UI State ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('journal');
  const [darkMode, setDarkMode] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [notify, setNotify] = useState<{ type: NotifyType; message: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Editing state
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Backup/Settings state
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Filters state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [tagFilterMode, setTagFilterMode] = useState<TagFilterMode>('OR');
  const [hideGuestAlert, setHideGuestAlert] = useState(false);
  const [hasGuestData, setHasGuestData] = useState(false);

  // Stats state (for specific symbol selection in List view context, passed to stats hook? No, hooks calculates ALL stats)
  // But logic in page.tsx had "Selected Symbol" specific stats.
  // We can derive that from hook or manual calc.
  // Stats state (for specific symbol selection in List view context, passed to stats hook? No, hooks calculates ALL stats)
  // But logic in page.tsx had "Selected Symbol" specific stats.
  // We can derive that from hook or manual calc.
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');

  // Tag Manager State
  const [showTagModal, setShowTagModal] = useState(false);
  const { tagColors, setTagColor } = useTagColors();

  // Mobile Bottom Sheet State
  const [showMobileAddForm, setShowMobileAddForm] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Prices state
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

  // UI Ref
  const addFormRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 3. Effects ---

  // Theme Init
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme) {
        setDarkMode(savedTheme === 'true');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(prefersDark);
      }
    }
  }, []);

  // Reset selectedSymbol when switching to stats tab (show all stats)
  useEffect(() => {
    if (activeTab === 'stats') {
      setSelectedSymbol('');
    }
  }, [activeTab]);

  // Theme Sync
  useEffect(() => {
    localStorage.setItem(THEME_KEY, String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Current Prices Init/Sync
  useEffect(() => {
    const saved = localStorage.getItem(CURRENT_PRICE_KEY);
    if (saved) {
      try {
        setCurrentPrices(JSON.parse(saved));
      } catch { }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CURRENT_PRICE_KEY, JSON.stringify(currentPrices));
  }, [currentPrices]);

  // Open Months State (Passed to TradeList, but maintained here for persistence)
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const saved = localStorage.getItem(OPEN_MONTHS_KEY);
    if (saved) {
      try {
        setOpenMonths(JSON.parse(saved));
      } catch { }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(OPEN_MONTHS_KEY, JSON.stringify(openMonths));
  }, [openMonths]);

  // Check for Guest Data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const guestData = localStorage.getItem(GUEST_TRADES_KEY);
      if (guestData && guestData !== '[]') {
        try {
          const parsed = JSON.parse(guestData);
          setHasGuestData(Array.isArray(parsed) && parsed.length > 0);
        } catch {
          setHasGuestData(false);
        }
      } else {
        setHasGuestData(false);
      }
    }
  }, []);


  // --- 4. Helpers & Handlers ---

  const showNotify = (type: NotifyType, message: string) => {
    setNotify({ type, message });
    setTimeout(() => setNotify(null), 3000);
  };

  const handleCurrentPriceChange = (symbol: string, value: string) => {
    const num = Number(value);
    setCurrentPrices(prev => {
      if (!value) {
        const next = { ...prev };
        delete next[symbol];
        return next;
      }
      return { ...prev, [symbol]: num };
    });
  };

  const toggleMonth = (key: string) => {
    setOpenMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const scrollToAddForm = () => {
    if (addFormRef.current) {
      const headerHeight = 210;
      const y = addFormRef.current.getBoundingClientRect().top + window.scrollY - headerHeight;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  // --- 5. Filtering Logic ---

  // Available tags for autocomplete
  const allTags = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => t.tags?.forEach(tag => set.add(tag)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [trades]);

  // Filtered trades
  const filteredTrades = useMemo(() => {
    let result = trades;

    // Symbol Filter
    if (filterSymbol) {
      const lower = filterSymbol.toLowerCase();
      result = result.filter(t => t.symbol.toLowerCase().includes(lower));
    }

    // Tag Filter
    if (filterTag) {
      const keywords = filterTag.split(/[,\s]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
      if (keywords.length > 0) {
        result = result.filter(t => {
          const tTags = (t.tags ?? []).map(tag => tag.toLowerCase());
          if (tTags.length === 0) return false;
          if (tagFilterMode === 'AND') {
            return keywords.every(kw => tTags.some(tag => tag.includes(kw)));
          } else {
            return keywords.some(kw => tTags.some(tag => tag.includes(kw)));
          }
        });
      }
    }

    // Selected Symbol (for drill-down)
    if (selectedSymbol) {
      result = result.filter(t => t.symbol === selectedSymbol);
    }

    // Date Filter
    if (dateFrom) {
      result = result.filter(t => t.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(t => t.date <= dateTo);
    }

    return result;
  }, [trades, filterSymbol, filterTag, tagFilterMode, selectedSymbol, dateFrom, dateTo]);

  // --- 6. Stats Hook ---
  // We pass ALL trades to useStats to get the global stats, NOT filtered ones? 
  // Wait, if I filter by date, I want stats for that period.
  // The original code calculated stats based on "displayedTrades" (filtered).
  // So I should pass `filteredTrades` to `useStats`.

  // NOTE: The original code showed "Summary" cards in Journal that updated with filters.
  // And "Stats" tab also likely updated with filters? 
  // Wait, original code: `stats` (buy/sell total) derived from `displayedTrades`.
  // `symbolSummaries` derived from `baseTrades` (ALL trades)?
  // Let's re-read line 1471 of original code: `const symbolSummaries: SymbolSummary[] = (() => { if (baseTrades.length === 0) return []; ...`
  // So Symbol Summaries were based on ALL trades, ignoring filters?
  // But `symbolStats` (lines 1455) was based on `displayedTrades` IF filtered?

  // Actually, standard behavior for "Stats Dashboard" is usually global or filtered.
  // The original code seemed to compute `symbolSummaries` from `baseTrades`. 
  // EXCEPT when `selectedSymbol` logic applies?
  // Let's stick to original behavior: `useStats` should probably take `trades` (all).
  // I'll pass `trades` to `useStats`.

  // However, the Journal Summary box uses `netCash` etc. computed from `displayedTrades`.
  // I will compute simple Journal stats locally or use `useStats` on filtered list for that.
  // Using `useStats` is heavy if run twice.
  // Simple stats (buy/sell sum) are cheap.

  // --- 6. Stats Hook ---
  // Using filteredTrades to ensure stats reflect current filters (Date/Symbol/Tags)
  const { symbolSummaries, tagStats, overallStats, dailyRealizedPoints, monthlyRealizedPoints, insights } = useStats(filteredTrades, currentPrices);

  // For Journal Summary (filtered)
  const journalStats = useMemo(() => {
    return filteredTrades.reduce(
      (acc, t) => {
        const amt = t.price * t.quantity;
        if (t.side === 'BUY') acc.buy += amt;
        else acc.sell += amt;
        return acc;
      },
      { buy: 0, sell: 0 }
    );
  }, [filteredTrades]);

  const journalNetCash = journalStats.sell - journalStats.buy;


  // --- 7. Actions ---

  const handleAddTrade = async (data: any, imageFile: File | null) => {
    try {
      await addTrade({ ...data }, imageFile);
      showNotify('success', '기록이 저장되었습니다.');
    } catch (e) {
      alert('저장 중 오류가 발생했습니다.');
      console.error(e);
    }
  };

  const handleEditSubmit = async (id: string, data: Trade) => {
    try {
      await updateTrade(data.date, data);
      setEditingTrade(null);
      showNotify('success', '기록이 수정되었습니다.');
    } catch (e) {
      alert('수정 중 오류가 발생했습니다.');
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await removeTrade(id);
      showNotify('success', '삭제되었습니다.');
    } catch (e) {
      alert('삭제 실패');
    }
  };

  // Migration / Backup Logic
  const handleMigrateGuestToAccount = async () => {
    if (!currentUser) return;
    const guestDataStr = localStorage.getItem(GUEST_TRADES_KEY);
    if (!guestDataStr) return;

    try {
      setIsMigrating(true);
      const guestTrades: Trade[] = JSON.parse(guestDataStr);
      if (guestTrades.length === 0) return;

      const rows = guestTrades.map(t => ({
        user_id: currentUser.id,
        date: t.date,
        symbol: t.symbol,
        side: t.side,
        price: t.price,
        quantity: t.quantity,
        memo: t.memo,
        tags: t.tags ?? [],
        image: t.image ?? null
      }));

      const { error } = await supabase.from('trades').insert(rows);
      if (error) throw error;

      localStorage.removeItem(GUEST_TRADES_KEY);
      setHasGuestData(false); // Update state

      alert('마이그레이션이 완료되었습니다. 페이지를 새로고침합니다.');
      window.location.reload();

    } catch (e: any) {
      console.error(e);
      alert(`마이그레이션 실패: ${e.message || '알 수 없는 오류'}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDropGuestData = () => {
    if (confirm('게스트 데이터를 모두 삭제하시겠습니까?')) {
      localStorage.removeItem(GUEST_TRADES_KEY);
      setHasGuestData(false); // Update state
      if (!currentUser) setTrades([]);
      showNotify('success', '게스트 데이터가 삭제되었습니다.');
    }
  };

  const handleClearAll = async () => {
    if (confirm('모든 데이터를 삭제하시겠습니까? 복구할 수 없습니다.')) {
      try {
        await clearAllTrades();
        showNotify('success', '모두 삭제되었습니다.');
      } catch (e) {
        alert('초기화 실패');
      }
    }
  }

  const resetFilters = () => {
    setFilterSymbol('');
    setFilterTag('');
    setDateFrom('');
    setDateTo('');
    setTagFilterMode('OR');
  };

  const handleExportCsv = () => {
    if (trades.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }
    const headers = [
      'ID', 'Date', 'Symbol', 'Side', 'Price', 'Quantity', 'Memo', 'Tags', 'Image', 'Created_At'
    ];
    const csvContent = [
      headers.join(','),
      ...trades.map(t => [
        t.id, t.date, t.symbol, t.side, t.price, t.quantity,
        `"${(t.memo || '').replace(/"/g, '""')}"`,
        `"${(t.tags || []).join(' ')}"`,
        t.image || '',
        (t as any).created_at || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBackup = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      trades,
      currentPrices
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-journal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackupClick = () => {
    fileInputRef.current?.click();
  };

  const handleBackupFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json.trades || !Array.isArray(json.trades)) throw new Error('Invalid format');

        // Logic:
        // If guest, just load to state & LS.
        // If auth, ask to overwrite DB?

        if (currentUser) {
          if (!confirm('현재 계정의 데이터를 모두 지우고 백업 데이터로 덮어쓰시겠습니까?')) return;

          // 1. Delete all
          await supabase.from('trades').delete().eq('user_id', currentUser.id);

          // 2. Insert all
          const rows = json.trades.map((t: any) => ({
            user_id: currentUser.id,
            date: t.date,
            symbol: t.symbol,
            side: t.side,
            price: t.price,
            quantity: t.quantity,
            memo: t.memo,
            tags: t.tags ?? [],
            image: t.image ?? null
          }));

          const { error } = await supabase.from('trades').insert(rows);
          if (error) throw error;

          setTrades(json.trades); // Optimistic update or reload?
          // ID might be different from DB, so reload is safer.
          window.location.reload();
        } else {
          setTrades(json.trades);
          setCurrentPrices(json.currentPrices || {});
          showNotify('success', '백업을 불러왔습니다.');
          e.target.value = '';
        }
      } catch (err) {
        alert('백업 파일 로드 실패');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  // --- Render ---

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="text-sm text-slate-500">로그인 상태를 확인하는 중입니다…</div>
      </main>
    );
  }

  // Dashboard Style Layout
  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} overflow-hidden transition-colors duration-300`}>
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        onChange={handleBackupFileChange}
        className="hidden"
      />

      {/* Header Section - Fixed Top */}
      <div className="flex-none pt-4 px-4 w-full max-w-7xl mx-auto z-30">
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          currentUser={currentUser}
          onLogout={logout}
          onShowLogin={() => setShowLoginModal(true)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>

      {/* Main Content Area - Scrollable Columns */}
      <div className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 pb-4">

        {activeTab === 'journal' ? (
          <div className="h-full lg:flex lg:gap-8 items-start">

            {/* LEFT: Feed (Main Content) - Scrollable */}
            <div className="flex-1 h-full min-w-0 flex flex-col">

              {/* Feed Header (View Toggle & Filters indicator) */}
              <div className="flex-none flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold tracking-tight">
                  {selectedSymbol ? '종목 상세' : (viewMode === 'calendar' ? '캘린더' : '매매 피드')}
                </h2>
                <div className={'flex rounded-lg p-1 shadow-sm border ' + (darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300')}>
                  <button
                    onClick={() => setViewMode('list')}
                    className={'p-2 rounded-md transition-all ' + (viewMode === 'list' ? (darkMode ? 'bg-slate-700 font-bold text-indigo-400' : 'bg-indigo-50 font-bold text-indigo-600') : (darkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50'))}
                    title="목록 보기"
                  >
                    <ListIcon size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={'p-2 rounded-md transition-all ' + (viewMode === 'calendar' ? (darkMode ? 'bg-slate-700 font-bold text-indigo-400' : 'bg-indigo-50 font-bold text-indigo-600') : (darkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50'))}
                    title="달력 보기"
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Feed Area */}
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                <MotionWrapper key={selectedSymbol ? 'detail' : 'feed'}>
                  {selectedSymbol ? (
                    // Detail View Mode
                    <div>
                      <SymbolDetailCard
                        symbol={selectedSymbol}
                        trades={trades}
                        currentPrice={currentPrices[selectedSymbol]}
                        onClose={() => setSelectedSymbol('')}
                        darkMode={darkMode}
                      />
                      {viewMode === 'calendar' ? (
                        // Calendar View for selected symbol
                        <div className={`mt-4 rounded-2xl p-4 border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                          <CalendarView
                            currentDate={calendarDate}
                            onDateChange={setCalendarDate}
                            dailyData={trades.filter(t => t.symbol === selectedSymbol).map(t => ({
                              key: t.date,
                              value: (t.side === 'SELL' ? 1 : -1) * t.price * t.quantity
                            }))}
                            onSelectDate={(date) => {
                              setDateFrom(date);
                              setDateTo(date);
                            }}
                            selectedDateStr={dateFrom === dateTo ? dateFrom : undefined}
                            darkMode={darkMode}
                          />
                        </div>
                      ) : (
                        // List View for selected symbol
                        <TradeList
                          trades={trades.filter(t => t.symbol === selectedSymbol)}
                          currentUser={currentUser}
                          onDelete={handleDelete}
                          onEdit={setEditingTrade}
                          openMonths={openMonths}
                          toggleMonth={toggleMonth}
                          darkMode={darkMode}
                          tagColors={tagColors}
                          onSymbolClick={(sym) => setSelectedSymbol(sym)}
                          onImagePreview={setPreviewImage}
                        />
                      )}
                    </div>
                  ) : (
                    // Standard Mode
                    viewMode === 'calendar' ? (
                      <CalendarView
                        currentDate={calendarDate}
                        onDateChange={setCalendarDate}
                        dailyData={dailyRealizedPoints}
                        onSelectDate={(date) => {
                          setDateFrom(date);
                          setDateTo(date);
                          setViewMode('list');
                        }}
                        selectedDateStr={dateFrom === dateTo ? dateFrom : undefined}
                        darkMode={darkMode}
                      />
                    ) : (
                      <TradeList
                        trades={filteredTrades}
                        currentUser={currentUser}
                        onDelete={handleDelete}
                        onEdit={setEditingTrade}
                        openMonths={openMonths}
                        toggleMonth={toggleMonth}
                        darkMode={darkMode}
                        tagColors={tagColors}
                        onSymbolClick={(sym) => setSelectedSymbol(sym)}
                        onImagePreview={setPreviewImage}
                      />
                    )
                  )}
                </MotionWrapper>
              </div>
            </div>

            {/* RIGHT: Sidebar - Compact & Unified */}
            <div className="hidden lg:block w-80 xl:w-96 flex-none pl-4 pb-4">
              <div className="space-y-3 pr-2">

                <div className="grid grid-cols-2 gap-2">
                  <div className={'rounded-xl p-3 border transition-all duration-200 card-hover ' + (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm')}>
                    <div className={'flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider mb-1 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                      <span className={darkMode ? 'text-indigo-400' : 'text-indigo-500'}>📈</span>
                      매수 합계
                    </div>
                    <div className={'text-base font-black tracking-tight ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                      {journalStats.buy.toLocaleString()}
                    </div>
                  </div>

                  <div className={'rounded-xl p-3 border transition-all duration-200 card-hover ' + (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm')}>
                    <div className={'flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider mb-1 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                      <span className={journalNetCash >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{journalNetCash >= 0 ? '💰' : '📉'}</span>
                      순손익
                    </div>
                    <div className={'text-base font-black tracking-tight ' + (journalNetCash > 0 ? 'text-emerald-500' : journalNetCash < 0 ? 'text-rose-500' : (darkMode ? 'text-slate-100' : 'text-slate-900'))}>
                      {journalNetCash >= 0 ? '+' : ''}{journalNetCash.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 2. Trade Form - Compact */}
                <div ref={addFormRef} className={'rounded-xl border overflow-hidden transition-all duration-200 ' + (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm')}>
                  <div className={'px-3 py-2 border-b flex items-center gap-2 ' + (darkMode ? 'border-slate-800 bg-gradient-to-r from-slate-800/50 to-slate-900' : 'border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white')}>
                    <span className={darkMode ? 'text-indigo-400' : 'text-indigo-500'}>✍️</span>
                    <h3 className={'text-xs font-bold ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                      매매 기록 작성
                    </h3>
                  </div>
                  <div className="p-3">
                    <TradeForm
                      darkMode={darkMode}
                      currentUser={currentUser}
                      baseTrades={trades}
                      onAddTrade={handleAddTrade}
                      allTags={allTags}
                      isCompact={true}
                    />
                  </div>
                </div>

                {/* 3. Filters / Symbol Info - Enhanced */}
                {selectedSymbol ? (
                  // 종목 상세 모드 - 종목 정보 및 돌아가기 버튼
                  <div className={'rounded-2xl border overflow-hidden transition-all duration-200 ' + (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm')}>
                    <div className={'px-4 py-3 border-b flex items-center gap-2 ' + (darkMode ? 'border-slate-800 bg-gradient-to-r from-slate-800/50 to-slate-900' : 'border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white')}>
                      <Activity size={14} className={darkMode ? 'text-indigo-400' : 'text-indigo-500'} />
                      <h3 className={'text-xs font-bold ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                        선택된 종목
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className={'p-3 rounded-xl border ' + (darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-indigo-50/50 border-indigo-100')}>
                        <div className={'text-sm font-bold mb-1 ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                          {trades.find(t => t.symbol === selectedSymbol)?.symbol_name || selectedSymbol}
                        </div>
                        <div className={'text-xs font-mono ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>
                          {selectedSymbol}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedSymbol('')}
                        className={'w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all btn-press border ' + (darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200')}
                      >
                        ← 전체 목록으로 돌아가기
                      </button>
                    </div>
                  </div>
                ) : (
                  // 일반 모드 - 검색 필터
                  <div className={'rounded-xl border overflow-hidden transition-all duration-200 ' + (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm')}>
                    <div className={'px-3 py-2 border-b flex items-center gap-2 ' + (darkMode ? 'border-slate-800 bg-gradient-to-r from-slate-800/50 to-slate-900' : 'border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white')}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Search size={14} className={darkMode ? 'text-indigo-400' : 'text-indigo-500'} />
                          <h3 className={'text-xs font-bold ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                            검색 필터
                          </h3>
                        </div>
                        <button
                          onClick={resetFilters}
                          className={'text-[10px] font-bold px-2 py-1 rounded-lg transition-all btn-press ' + (darkMode ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900')}
                        >
                          초기화
                        </button>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      {/* 종목명/태그 */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className={'block mb-0.5 text-[10px] font-bold uppercase tracking-wider ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>종목</label>
                          <input type="text" placeholder="검색..." value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)}
                            className={'w-full px-2.5 py-1.5 text-xs font-medium rounded-lg outline-none transition-all ' + (darkMode ? 'bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-700 focus:ring-1 focus:ring-slate-600' : 'bg-slate-100 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100')}
                          />
                        </div>
                        <div>
                          <label className={'block mb-0.5 text-[10px] font-bold uppercase tracking-wider ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>태그</label>
                          <input type="text" placeholder="검색..." value={filterTag} onChange={e => setFilterTag(e.target.value)}
                            className={'w-full px-2.5 py-1.5 text-xs font-medium rounded-lg outline-none transition-all ' + (darkMode ? 'bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-700 focus:ring-1 focus:ring-slate-600' : 'bg-slate-100 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100')}
                          />
                        </div>
                      </div>

                      {/* 기간 */}
                      <div>
                        <label className={'block mb-0.5 text-[10px] font-bold uppercase tracking-wider ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>기간</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className={'w-full px-2 py-1.5 text-xs font-medium rounded-lg outline-none transition-all text-center ' + (darkMode ? 'bg-slate-800 text-white focus:bg-slate-700 focus:ring-1 focus:ring-slate-600' : 'bg-slate-100 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100')}
                          />
                          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className={'w-full px-2 py-1.5 text-xs font-medium rounded-lg outline-none transition-all text-center ' + (darkMode ? 'bg-slate-800 text-white focus:bg-slate-700 focus:ring-1 focus:ring-slate-600' : 'bg-slate-100 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100')}
                          />
                        </div>
                      </div>

                      {/* 태그 필터 모드 */}
                      <div>
                        <label className={'block mb-0.5 text-[10px] font-bold uppercase tracking-wider ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>태그 조건</label>
                        <select value={tagFilterMode} onChange={e => setTagFilterMode(e.target.value as TagFilterMode)}
                          className={'w-full px-2.5 py-1.5 text-xs font-medium rounded-lg outline-none transition-all appearance-none cursor-pointer ' + (darkMode ? 'bg-slate-800 text-white focus:bg-slate-700 focus:ring-1 focus:ring-slate-600' : 'bg-slate-100 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-100')}
                        >
                          <option value="OR">하나라도 포함 (OR)</option>
                          <option value="AND">모두 포함 (AND)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Migration Alert */}
                {currentUser && hasGuestData && !hideGuestAlert && (
                  <div className={'border rounded-xl p-3 text-sm relative ' + (darkMode ? 'border-amber-500/60 bg-slate-900' : 'border-amber-400/60 bg-amber-50')}>
                    <button
                      onClick={() => setHideGuestAlert(true)}
                      className={'absolute top-2 right-2 transition-colors ' + (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')}
                    >
                      ✕
                    </button>
                    <div className="font-semibold mb-2">게스트 데이터 발견</div>
                    <div className="flex gap-2">
                      <button onClick={handleMigrateGuestToAccount} disabled={isMigrating} className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition">{isMigrating ? '이동 중...' : '계정으로 가져오기'}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'stats' ? (
          <div className="h-full overflow-y-auto">
            <MotionWrapper key="stats">
              <StatsDashboard
                darkMode={darkMode}
                currentUser={currentUser}
                symbolSummaries={symbolSummaries}
                tagStats={tagStats}
                overallStats={overallStats}
                dailyRealizedPoints={dailyRealizedPoints}
                monthlyRealizedPoints={monthlyRealizedPoints}
                currentPrices={currentPrices}
                onCurrentPriceChange={handleCurrentPriceChange}
                onSymbolClick={(symbol) => {
                  setSelectedSymbol(symbol);
                  setActiveTab('journal');
                }}
                tagColors={tagColors}
                insights={insights}
              />
            </MotionWrapper>
          </div>
        ) : (
          <div className="h-full overflow-y-auto max-w-7xl mx-auto">
            <MotionWrapper key="settings">
              <div className="space-y-6">
                <div className={'p-6 rounded-2xl border shadow-sm ' + (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}>
                  <h3 className="text-lg font-bold mb-2">태그 색상 관리</h3>
                  <p className="text-sm text-slate-500 mb-4">전략별 태그 색상을 지정하여 한눈에 식별하세요.</p>
                  <button
                    onClick={() => setShowTagModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    <TagIcon size={16} />
                    태그 색상 변경
                  </button>
                </div>

                <SettingsPanel
                  darkMode={darkMode}
                  currentUser={currentUser}
                  onExportCsv={handleExportCsv}
                  onExportBackup={handleExportBackup}
                  onImportBackup={handleImportBackupClick}
                  onClearAll={handleClearAll}
                  backupMessage={backupMessage}
                />
              </div>
            </MotionWrapper>
          </div>
        )}
      </div>

      {
        editingTrade && (
          <EditTradeForm
            trade={editingTrade}
            darkMode={darkMode}
            onSave={handleEditSubmit}
            onCancel={() => setEditingTrade(null)}
          />
        )
      }

      {/* Tag Manager Modal */}
      <TagManagerModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        allTags={allTags}
        darkMode={darkMode}
        tagColors={tagColors}
        setTagColor={setTagColor}
      />

      {/* Login Modal */}
      {
        showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className={'w-full max-w-sm rounded-2xl shadow-2xl p-6 relative ' + (darkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-900')}>
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="mb-6">
                <h2 className="text-xl font-bold">로그인</h2>
                <p className="text-sm text-slate-500 mt-1">계정에 로그인하여 데이터를 동기화하세요.</p>
              </div>
              <LoginForm onDone={() => setShowLoginModal(false)} darkMode={darkMode} />
            </div>
          </div>
        )
      }

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-0 right-0 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X size={24} />
            </button>
            <img
              src={previewImage}
              alt="Trade chart preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Mobile FAB (Floating Action Buttons) - Only visible on mobile when on journal tab */}
      {activeTab === 'journal' && (
        <div className="lg:hidden fixed bottom-6 right-4 flex flex-col gap-3 z-40">
          {/* Filter Button */}
          <button
            onClick={() => setShowMobileFilter(true)}
            className={'w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ' +
              (darkMode
                ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50')}
          >
            <Filter size={20} />
          </button>
          {/* Add Trade Button */}
          <button
            onClick={() => setShowMobileAddForm(true)}
            className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* Mobile Add Form Bottom Sheet */}
      {showMobileAddForm && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileAddForm(false)}
          />
          <div className={'relative rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up ' +
            (darkMode ? 'bg-slate-900' : 'bg-white')}>
            {/* Handle Bar */}
            <div className="flex justify-center py-3">
              <div className={'w-10 h-1 rounded-full ' + (darkMode ? 'bg-slate-700' : 'bg-slate-300')} />
            </div>
            {/* Form Content */}
            <div className="px-4 pb-8">
              <TradeForm
                darkMode={darkMode}
                currentUser={currentUser}
                baseTrades={trades}
                onAddTrade={async (data, imageFile) => {
                  await handleAddTrade(data, imageFile);
                  setShowMobileAddForm(false);
                }}
                allTags={allTags}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Bottom Sheet */}
      {showMobileFilter && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileFilter(false)}
          />
          <div className={'relative rounded-t-3xl max-h-[70vh] overflow-y-auto animate-slide-up ' +
            (darkMode ? 'bg-slate-900' : 'bg-white')}>
            {/* Handle Bar */}
            <div className="flex justify-center py-3">
              <div className={'w-10 h-1 rounded-full ' + (darkMode ? 'bg-slate-700' : 'bg-slate-300')} />
            </div>
            {/* Filter Content */}
            <div className="px-4 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className={'font-bold text-lg ' + (darkMode ? 'text-white' : 'text-slate-900')}>
                  검색 필터
                </h3>
                <button
                  onClick={() => {
                    setFilterSymbol('');
                    setFilterTag('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className={'text-xs px-3 py-1.5 rounded-lg transition ' +
                    (darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900')}
                >
                  초기화
                </button>
              </div>

              <div className="space-y-4">
                {/* Symbol Filter */}
                <div>
                  <label className={'block text-xs font-semibold mb-2 ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>종목</label>
                  <div className="relative">
                    <Search size={16} className={'absolute left-3 top-1/2 -translate-y-1/2 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')} />
                    <input
                      type="text"
                      value={filterSymbol}
                      onChange={(e) => setFilterSymbol(e.target.value)}
                      placeholder="종목명 검색"
                      className={'w-full pl-10 pr-4 py-3 rounded-xl text-sm ' +
                        (darkMode
                          ? 'bg-slate-800 text-white placeholder-slate-500 border border-slate-700'
                          : 'bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200')}
                    />
                  </div>
                </div>

                {/* Tag Filter */}
                <div>
                  <label className={'block text-xs font-semibold mb-2 ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>태그</label>
                  <input
                    type="text"
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    placeholder="태그 검색"
                    className={'w-full px-4 py-3 rounded-xl text-sm ' +
                      (darkMode
                        ? 'bg-slate-800 text-white placeholder-slate-500 border border-slate-700'
                        : 'bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200')}
                  />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={'block text-xs font-semibold mb-2 ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>시작일</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className={'w-full px-3 py-3 rounded-xl text-sm ' +
                        (darkMode
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'bg-slate-50 text-slate-900 border border-slate-200')}
                    />
                  </div>
                  <div>
                    <label className={'block text-xs font-semibold mb-2 ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>종료일</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className={'w-full px-3 py-3 rounded-xl text-sm ' +
                        (darkMode
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'bg-slate-50 text-slate-900 border border-slate-200')}
                    />
                  </div>
                </div>
              </div>

              {/* Apply Button */}
              <button
                onClick={() => setShowMobileFilter(false)}
                className="w-full mt-6 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition"
              >
                필터 적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}