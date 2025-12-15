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

// Constants
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

  // Stats state (for specific symbol selection in List view context, passed to stats hook? No, hooks calculates ALL stats)
  // But logic in page.tsx had "Selected Symbol" specific stats.
  // We can derive that from hook or manual calc.
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');

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

  const { symbolSummaries, tagStats, overallStats, dailyRealizedPoints, monthlyRealizedPoints } = useStats(trades, currentPrices);

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

      // Insert to Supabase one by one or batch? 
      // Supabase allows batch insert.
      // But we need to handle images? Guest images are Base64.
      // Logic: we can just upload base64 images? Supabase storage?
      // Original code just inserted rows. If image was base64 URL, it stores it as string.
      // That's fine for now (though efficient storage would act better).

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

      // Refresh trades
      // We can force reload or manually update.
      // Since useTrades listens to `currentUser`, we should just re-fetch?
      // But useTrades doesn't expose refetch.
      // We can rely on `addTrade` updating state, but here we did direct insert.
      // The easiest way is to window.location.reload() or implement reload in hook.
      // Or simply append to state.
      // I'll append to state using setTrades.
      // Wait, I need the inserted IDs.
      // Batch insert with select() returns data.

      // Let's simplify: Reload the page or just clear guest data and show success.
      // useTrades auto-fetches on mount. If I don't trigger re-fetch, list is stale.
      // I'll just reload for safety given migration is rare.

      localStorage.removeItem(GUEST_TRADES_KEY);
      // setTrades(prev => ... ) // Need inserted data.

      alert('마이그레이션이 완료되었습니다. 페이지를 새로고침합니다.');
      window.location.reload();

    } catch (e) {
      console.error(e);
      alert('마이그레이션 실패');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDropGuestData = () => {
    if (confirm('게스트 데이터를 모두 삭제하시겠습니까?')) {
      localStorage.removeItem(GUEST_TRADES_KEY);
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

  const containerClass = "max-w-4xl mx-auto p-4 md:p-6 pb-24 min-h-screen " +
    (darkMode ? 'text-slate-100' : 'text-slate-900');
  const mainClass = darkMode ? 'bg-slate-950 min-h-screen' : 'bg-white min-h-screen';

  return (
    <>
      <main className={mainClass}>
        <div className={containerClass}>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            onChange={handleBackupFileChange}
            className="hidden"
          />

          <Header
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            currentUser={currentUser}
            onLogout={logout}
            onShowLogin={() => setShowLoginModal(true)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* Journal Tab */}
          {activeTab === 'journal' && (
            <section className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 text-xs md:text-sm">
                <div className={'border rounded-lg p-3 ' + (darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50')}>
                  <div className="text-slate-500">거래 건수 ({currentUser ? '계정' : '게스트'})</div>
                  <div className="text-lg font-semibold">{tradesLoading ? '...' : `${filteredTrades.length} 건`}</div>
                </div>
                <div className={'border rounded-lg p-3 ' + (darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50')}>
                  <div className="text-slate-500">매수 합계</div>
                  {/* Use formatNumber from helper. Wait, I imported it inside components but not here? I need to import it. It's in hook? No. Import from utils. */}
                  {/* I imported utilities at top. */}
                  <div className="text-lg font-semibold">{journalStats.buy.toLocaleString()} 원</div>
                </div>
                <div className={'border rounded-lg p-3 ' + (darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50')}>
                  <div className="text-slate-500">실현 손익 (단순합산)</div>
                  <div className={'text-lg font-semibold ' + (journalNetCash > 0 ? 'text-emerald-500' : journalNetCash < 0 ? 'text-rose-400' : '')}>
                    {journalNetCash.toLocaleString()} 원
                  </div>
                </div>
              </div>

              {/* Migration Alert */}
              {currentUser && localStorage.getItem(GUEST_TRADES_KEY) && (
                <div className={'border rounded-lg p-3 text-xs md:text-sm ' + (darkMode ? 'border-amber-500/60 bg-slate-900' : 'border-amber-400/60 bg-amber-50')}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">게스트 모드 기록이 남아있습니다.</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleMigrateGuestToAccount} disabled={isMigrating} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">{isMigrating ? '이동 중...' : '계정으로 이동'}</button>
                    <button onClick={handleDropGuestData} className="px-3 py-1 border border-slate-300 rounded text-xs">삭제</button>
                  </div>
                </div>
              )}

              {/* Forms */}
              <div ref={addFormRef}>
                <TradeForm
                  darkMode={darkMode}
                  currentUser={currentUser}
                  baseTrades={trades}
                  onAddTrade={handleAddTrade}
                  allTags={allTags}
                />
              </div>

              {editingTrade && (
                <EditTradeForm
                  trade={editingTrade}
                  darkMode={darkMode}
                  onSave={handleEditSubmit}
                  onCancel={() => setEditingTrade(null)}
                />
              )}

              {/* Filters */}
              <div className={'border rounded-lg p-3 space-y-3 ' + (darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white')}>
                <div className="flex items-center justify-between"><span className="text-sm font-semibold">필터</span></div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <input type="text" placeholder="종목명 검색" value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)} className={'border rounded px-2 py-1 ' + (darkMode ? 'bg-slate-800 border-slate-600' : '')} />
                  <input type="text" placeholder="태그 검색 (쉼표 구분)" value={filterTag} onChange={e => setFilterTag(e.target.value)} className={'border rounded px-2 py-1 ' + (darkMode ? 'bg-slate-800 border-slate-600' : '')} />
                  <select value={tagFilterMode} onChange={e => setTagFilterMode(e.target.value as TagFilterMode)} className={'border rounded px-2 py-1 ' + (darkMode ? 'bg-slate-800 border-slate-600' : '')}>
                    <option value="OR">하나라도 포함 (OR)</option>
                    <option value="AND">모두 포함 (AND)</option>
                  </select>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={'border rounded px-2 py-1 ' + (darkMode ? 'bg-slate-800 border-slate-600' : '')} />
                  <span className="self-center">~</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={'border rounded px-2 py-1 ' + (darkMode ? 'bg-slate-800 border-slate-600' : '')} />
                </div>
              </div>

              {/* List */}
              <TradeList
                trades={filteredTrades}
                currentUser={currentUser}
                onDelete={handleDelete}
                onEdit={setEditingTrade}
                openMonths={openMonths}
                toggleMonth={toggleMonth}
                darkMode={darkMode}
              />
            </section>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
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
            />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <SettingsPanel
              darkMode={darkMode}
              currentUser={currentUser}
              onExportCsv={handleExportCsv}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackupClick}
              onClearAll={handleClearAll}
              backupMessage={backupMessage}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      {showLoginModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className={'w-full max-w-sm rounded-xl shadow-xl p-4 ' + (darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900')}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">로그인 / 회원가입</h2>
              <button onClick={() => setShowLoginModal(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <LoginForm onDone={() => setShowLoginModal(false)} />
          </div>
        </div>
      )}

      {/* Notifications */}
      {notify && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={'min-w-[220px] max-w-xs px-4 py-3 rounded-lg shadow-lg text-xs md:text-sm ' + (notify.type === 'success' ? 'bg-emerald-500 text-white' : notify.type === 'error' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-white')}>
            {notify.message}
          </div>
        </div>
      )}
    </>
  );
}