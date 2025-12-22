'use client';

import React, { useState, useEffect, useRef } from 'react';

// Types
import { ActiveTab, NotifyType } from '@/app/types/ui';

// Utils
import { isKRWSymbol } from '@/app/utils/format';

// Hooks
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth';
import { useTrades } from '@/app/hooks/useTrades';
import { useStats } from '@/app/hooks/useStats';
import { useStrategies } from '@/app/hooks/useStrategies';
import { useMonthlyGoals } from '@/app/hooks/useMonthlyGoals';
import { useRiskManagement } from '@/app/hooks/useRiskManagement';
import { useTagColors } from '@/app/hooks/useTagColors';
import { useBackupManager } from '@/app/hooks/useBackupManager';
import { useTradeFilter } from '@/app/hooks/useTradeFilter';
import { useMarketData } from '@/app/hooks/useMarketData';
import { useDiary } from '@/app/hooks/useDiary';

// Components
import { Header } from '@/app/components/Header';
import { LoginForm } from '@/app/components/LoginForm';
import { TradeForm } from '@/app/components/TradeForm';
import { DashboardView } from '@/app/components/views/DashboardView';
import { TradeListView } from '@/app/components/views/TradeListView';
import { SettingsView } from '@/app/components/views/SettingsView';
import { MarketDiaryView } from '@/app/components/views/MarketDiaryView';

// Styles & Icons
const THEME_KEY = 'stock-journal-theme-v1';
const OPEN_MONTHS_KEY = 'stock-journal-open-months-v1';

export default function Home() {
    // --- 1. Auth & Data Hooks ---
    const { user: currentUser, loading: authLoading, logout } = useSupabaseAuth();

    // Data Logic
    const { trades, loading: tradesLoading, addTrade, removeTrade, updateTrade, clearAllTrades, setTrades } = useTrades(currentUser);
    const { strategies, addStrategy, updateStrategy, removeStrategy } = useStrategies(currentUser);

    // Market Data (Prices, Exchange Rate)
    const {
        currentPrices, setCurrentPrices, handleCurrentPriceChange,
        exchangeRate, setExchangeRate,
        showConverted, setShowConverted
    } = useMarketData();

    // Filters
    const filterState = useTradeFilter(trades);
    const { filteredTrades, allTags } = filterState;

    // Stats Logic
    const dashboardStats = useStats(trades, currentPrices, exchangeRate);

    // Risk Management
    const today = new Date().toISOString().split('T')[0];
    const todayPnL = dashboardStats.dailyRealizedPoints.find(p => p.key === today)?.value || 0;

    const riskData = useRiskManagement(currentUser, dashboardStats.symbolSummaries, currentPrices, todayPnL);
    const goalsData = useMonthlyGoals(currentUser);

    // Diary Data
    const diaryData = useDiary(currentUser);

    // Backup Manager
    const [notify, setNotify] = useState<{ type: NotifyType; message: string } | null>(null);
    const showNotify = (type: NotifyType, message: string) => {
        setNotify({ type, message });
        setTimeout(() => setNotify(null), 3000); // reduced to 3s
    };

    const backupManager = useBackupManager({
        trades, setTrades, currentUser, currentPrices, setCurrentPrices,
        onNotify: (t, m) => showNotify(t as NotifyType, m)
    });

    // --- 2. UI State ---
    const [activeTab, setActiveTab] = useState<ActiveTab>('journal');
    const [darkMode, setDarkMode] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Tag Colors
    const { tagColors } = useTagColors();

    // UI Ref for Scroll
    const addFormRef = useRef<HTMLDivElement>(null);

    // Persist Open Months State
    const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(OPEN_MONTHS_KEY);
            if (saved) { try { setOpenMonths(JSON.parse(saved)); } catch { } }
        }
    }, []);
    useEffect(() => { localStorage.setItem(OPEN_MONTHS_KEY, JSON.stringify(openMonths)); }, [openMonths]);

    const toggleMonth = (key: string) => setOpenMonths(prev => ({ ...prev, [key]: !prev[key] }));

    // Theme Init & Sync
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem(THEME_KEY);
            if (savedTheme) setDarkMode(savedTheme === 'true');
            else setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(THEME_KEY, String(darkMode));
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [darkMode]);


    // Journal Side Stats (Simple Cache)
    const journalStats = React.useMemo(() => {
        return filteredTrades.reduce(
            (acc, t) => {
                const amtRaw = t.price * t.quantity;
                const isKRW = isKRWSymbol(t.symbol);
                const multiplier = isKRW ? 1 : exchangeRate;
                const amt = amtRaw * multiplier;

                if (t.side === 'BUY') acc.buy += amt;
                else acc.sell += amt;
                return acc;
            },
            { buy: 0, sell: 0 }
        );
    }, [filteredTrades, exchangeRate]);

    const journalNetCash = journalStats.sell - journalStats.buy;

    // Handlers
    const handleAddTrade = async (data: any, imageFile: File | null) => {
        try {
            await addTrade(data, imageFile);
            showNotify('success', '기록이 저장되었습니다.');
        } catch (e: any) {
            alert(`저장 실패: ${e.message}`);
        }
    };

    const [editingTrade, setEditingTrade] = useState<any | null>(null);

    const handleUpdateTrade = async (id: string, data: any, imageFile: File | null) => {
        try {
            await updateTrade(id, data, imageFile);
            showNotify('success', '수정이 완료되었습니다.');
            setEditingTrade(null);
        } catch (e: any) {
            alert(`수정 실패: ${e.message}`);
        }
    };

    if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-100">Loading...</div>;

    return (
        <div className={`h-screen flex flex-col ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} overflow-hidden transition-colors duration-300`}>

            {/* Toast Notification */}
            {notify && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg text-sm font-bold animate-in fade-in slide-in-from-top-4 ${notify.type === 'success' ? 'bg-emerald-500 text-white' :
                    notify.type === 'error' ? 'bg-rose-500 text-white' :
                        'bg-blue-500 text-white'
                    }`}>
                    {notify.message}
                </div>
            )}

            {/* Header */}
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

            {/* Main Content */}
            <div className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 pb-4">

                {activeTab === 'journal' ? (
                    <div className="h-full lg:flex lg:gap-8 items-start">
                        {/* LEFT: Feed View */}
                        <div className="flex-1 h-full min-w-0 flex flex-col">
                            <TradeListView
                                darkMode={darkMode}
                                currentUser={currentUser}
                                trades={trades}
                                filteredTrades={filteredTrades}
                                filterState={filterState}
                                onDelete={removeTrade}
                                onEdit={(t) => setEditingTrade(t)}
                                openMonths={openMonths}
                                toggleMonth={toggleMonth}
                                tagColors={tagColors}
                                currentPrices={currentPrices}
                                exchangeRate={exchangeRate}
                                showConverted={showConverted}
                                onToggleConverted={setShowConverted}
                            />
                        </div>

                        {/* RIGHT: Sidebar */}
                        <div className="hidden lg:block w-80 xl:w-96 flex-none pl-4 pb-4 h-full overflow-y-auto scrollbar-thin">
                            <div className="space-y-4 pr-2">
                                {/* Guest Data Alert */}
                                {currentUser && backupManager.hasGuestData && (
                                    <div className="p-4 rounded-xl border border-amber-500/50 bg-amber-500/10">
                                        <h3 className="font-bold text-amber-500 mb-2">게스트 데이터 발견</h3>
                                        <p className="text-xs text-slate-400 mb-3">로그인 전 작성한 데이터가 있습니다.</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={backupManager.handleMigrateGuestToAccount}
                                                disabled={backupManager.isMigrating}
                                                className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg"
                                            >
                                                가져오기
                                            </button>
                                            <button
                                                onClick={backupManager.handleDropGuestData}
                                                className="px-3 py-1.5 border border-slate-600 text-slate-400 text-xs font-bold rounded-lg"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                        <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">매수 합계</div>
                                        <div className="font-black text-lg">{journalStats.buy.toLocaleString()}</div>
                                    </div>
                                    <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                        <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">순손익</div>
                                        <div className={`font-black text-lg ${journalNetCash >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {journalNetCash > 0 ? '+' : ''}{journalNetCash.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Trade Form */}
                                <div ref={addFormRef} className={`rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                    <div className={`px-3 py-2 border-b font-bold text-xs flex items-center gap-2 ${darkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                                        <span>✍️</span> 매매 기록 작성
                                    </div>
                                    <div className="p-3">
                                        <TradeForm
                                            darkMode={darkMode}
                                            currentUser={currentUser}
                                            baseTrades={trades}
                                            onAddTrade={handleAddTrade}
                                            allTags={allTags}
                                            strategies={strategies}
                                            isCompact={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'diary' ? (
                    <div className="h-full overflow-y-auto scrollbar-thin pb-20">
                        <MarketDiaryView
                            darkMode={darkMode}
                            currentUser={currentUser}
                            diaryData={diaryData}
                        />
                    </div>
                ) : activeTab === 'stats' ? (
                    <div className="h-full overflow-y-auto scrollbar-thin pb-20">
                        <DashboardView
                            darkMode={darkMode}
                            currentUser={currentUser}
                            statsData={dashboardStats}
                            riskData={riskData}
                            goalsData={goalsData}
                            currentPrices={currentPrices}
                            onCurrentPriceChange={handleCurrentPriceChange}
                            tagColors={tagColors}
                            exchangeRate={exchangeRate}
                            onExchangeRateChange={setExchangeRate}
                        />
                    </div>
                ) : activeTab === 'settings' ? (
                    <div className="h-full overflow-y-auto scrollbar-thin pb-20">
                        <SettingsView
                            darkMode={darkMode}
                            setDarkMode={setDarkMode}
                            currentUser={currentUser}
                            backupManager={backupManager}
                            strategies={strategies}
                            onAddStrategy={addStrategy}
                            onUpdateStrategy={updateStrategy}
                            onRemoveStrategy={removeStrategy}
                        />
                    </div>
                ) : null}

            </div>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            ✕
                        </button>
                        <div className="mb-6 text-center">
                            <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>로그인</h2>
                            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>데이터 동기화를 위해 로그인하세요</p>
                        </div>
                        <LoginForm
                            darkMode={darkMode}
                            onDone={() => setShowLoginModal(false)}
                        />
                    </div>
                </div>
            )}

            {/* Edit Trade Modal */}
            {editingTrade && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`relative w-full max-w-lg rounded-3xl p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
                        <div className={`px-6 py-4 flex items-center justify-between border-b ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
                            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>매매 기록 수정</h3>
                            <button
                                onClick={() => setEditingTrade(null)}
                                className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <TradeForm
                                darkMode={darkMode}
                                currentUser={currentUser}
                                baseTrades={trades}
                                onAddTrade={async () => { }} // Not used in edit mode
                                onUpdateTrade={handleUpdateTrade}
                                allTags={allTags}
                                strategies={strategies}
                                isCompact={false}
                                initialData={editingTrade}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}