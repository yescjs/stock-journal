'use client';

import React, { useState, useEffect, useRef } from 'react';

// Types
import { ActiveTab, NotifyType } from '@/app/types/ui';
import { Trade } from '@/app/types/trade';

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

import { useDataCorrection } from '@/app/hooks/useDataCorrection';

// Components
import { Header } from '@/app/components/Header';
import { LoginForm } from '@/app/components/LoginForm';
import { LandingPage } from '@/app/components/LandingPage';
import { TradeForm, TradeSubmitData } from '@/app/components/TradeForm';
import { DashboardView } from '@/app/components/views/DashboardView';
import { TradeListView } from '@/app/components/views/TradeListView';
import { SettingsView } from '@/app/components/views/SettingsView';
import { MarketDiaryView } from '@/app/components/views/MarketDiaryView';
import { EconomicReportsView } from '@/app/components/views/EconomicReportsView';
import { UserGuide } from '@/app/components/UserGuide';

// Styles & Icons
const THEME_KEY = 'stock-journal-theme-v1';
const OPEN_MONTHS_KEY = 'stock-journal-open-months-v1';

export default function Home() {
    const [showGuide, setShowGuide] = useState(false);
    // --- 1. Auth & Data Hooks ---
    const { user: currentUser, loading: authLoading, logout: supabaseLogout, authError } = useSupabaseAuth();

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
    const { filteredTrades, allTags, setSelectedSymbol } = filterState;

    // Stats Logic
    const dashboardStats = useStats(trades, currentPrices, exchangeRate);

    // Navigation Handler
    const handleSymbolClick = (symbol: string) => {
        setSelectedSymbol(symbol);
        setActiveTab('journal');
    };

    const handleLogout = async () => {
        await supabaseLogout();
        setSelectedSymbol('');
    };

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

    const dataCorrection = useDataCorrection(currentUser, (t, m) => showNotify(t as NotifyType, m));

    // --- 2. UI State ---
    const [activeTab, setActiveTab] = useState<ActiveTab>('journal');
    const [darkMode, setDarkMode] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Tag Colors
    const { tagColors } = useTagColors();

    // UI Ref for Scroll
    const addFormRef = useRef<HTMLDivElement>(null);

    // Persist Open Months State
    const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(OPEN_MONTHS_KEY);
            if (saved) { 
                try { 
                    const parsed = JSON.parse(saved);
                    setTimeout(() => setOpenMonths(parsed), 0);
                } catch { } 
            }
        }
    }, []);
    useEffect(() => { localStorage.setItem(OPEN_MONTHS_KEY, JSON.stringify(openMonths)); }, [openMonths]);

    const toggleMonth = (key: string) => setOpenMonths(prev => ({ ...prev, [key]: !prev[key] }));

    // Theme Init & Sync
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem(THEME_KEY);
            setTimeout(() => {
                if (savedTheme) setDarkMode(savedTheme === 'true');
                else setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
            }, 0);
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
    const handleAddTrade = async (data: TradeSubmitData, imageFile: File | null) => {
        try {
            await addTrade(data, imageFile);
            showNotify('success', '기록이 저장되었습니다.');
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : '알 수 없는 오류';
            alert(`저장 실패: ${errorMessage}`);
        }
    };

    const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

    const handleUpdateTrade = async (id: string, data: TradeSubmitData, imageFile: File | null) => {
        try {
            await updateTrade(id, data, imageFile);
            showNotify('success', '수정이 완료되었습니다.');
            setEditingTrade(null);
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : '알 수 없는 오류';
            alert(`수정 실패: ${errorMessage}`);
        }
    };

    // Handler to start as guest (create empty guest data)
    const handleStartAsGuest = () => {
        if (typeof window !== 'undefined') {
            // Create empty guest data array to enable guest mode
            localStorage.setItem('stock-journal-guest-trades-v1', JSON.stringify([]));
            // Force re-render by reloading
            window.location.reload();
        }
    };

    if (authLoading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-background">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-30 rounded-full animate-pulse"></div>
                <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-primary shadow-toss-md">
                    <span className="text-primary-foreground text-2xl">📊</span>
                </div>
            </div>
            <p className="mt-4 text-muted-foreground text-sm font-medium">불러오는 중...</p>
        </div>
    );

    // Show Landing Page for guests without data
    if (!currentUser && !backupManager.hasGuestData) {
        return (
            <>
                <LandingPage
                    onStart={() => setShowLoginModal(true)}
                    onStartAsGuest={handleStartAsGuest}
                    darkMode={darkMode}
                />
                {showLoginModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={(e) => e.target === e.currentTarget && setShowLoginModal(false)}
                    >
                        <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-toss-lg ${darkMode ? 'bg-card border border-border' : 'bg-card'}`}>
                            <button
                                onClick={() => setShowLoginModal(false)}
                                aria-label="닫기"
                                className="absolute right-4 top-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                ✕
                            </button>
                            <div className="mb-6 text-center">
                                <h2 className="text-2xl font-bold text-foreground">로그인</h2>
                                <p className="text-sm mt-1 text-muted-foreground">데이터 동기화를 위해 로그인하세요</p>
                            </div>
                            <LoginForm
                                darkMode={darkMode}
                                onDone={() => setShowLoginModal(false)}
                            />
                            <div className="mt-4 text-center">
                                <button
                                    onClick={() => {
                                        setShowLoginModal(false);
                                        handleStartAsGuest();
                                    }}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    로그인 없이 게스트로 시작하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`}>

            {/* Auth Error Notification */}
            {authError && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-bold animate-in fade-in slide-in-from-top-4 bg-rose-500 text-white max-w-md">
                    <div className="flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{authError}</span>
                    </div>
                </div>
            )}

            {/* Toast Notification - Bottom center on mobile, top center on desktop */}
            {notify && (
                <div className={`fixed z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-bold animate-in fade-in duration-200
                    left-1/2 -translate-x-1/2
                    bottom-24 md:bottom-auto md:top-4
                    ${notify.type === 'success' ? 'bg-emerald-500 text-white' :
                    notify.type === 'error' ? 'bg-rose-500 text-white' :
                        'bg-blue-500 text-white'
                    }`}>
                    <div className="flex items-center gap-2">
                        <span>{notify.type === 'success' ? '✓' : notify.type === 'error' ? '✕' : 'ℹ'}</span>
                        <span>{notify.message}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="sticky top-0 z-50 flex-none w-full bg-slate-50/80 backdrop-blur-md dark:bg-slate-950/80 transition-colors duration-300 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="max-w-7xl mx-auto px-4">
                    <Header
                        darkMode={darkMode}
                        setDarkMode={setDarkMode}
                        currentUser={currentUser}
                        onLogout={handleLogout}
                        onShowLogin={() => setShowLoginModal(true)}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        onShowGuide={() => setShowGuide(true)}
                    />
                </div>

                <UserGuide
                    isOpen={showGuide}
                    onClose={() => setShowGuide(false)}
                    darkMode={darkMode}
                />

            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 pt-4 pb-8">

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
                                    <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10">
                                        <h3 className="font-bold text-amber-600 dark:text-amber-500 mb-2 text-sm">게스트 데이터 발견</h3>
                                        <p className="text-xs text-muted-foreground mb-3">로그인 전 작성한 데이터가 있습니다.</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={backupManager.handleMigrateGuestToAccount}
                                                disabled={backupManager.isMigrating}
                                                className="flex-1 py-2 bg-primary text-white text-xs font-semibold rounded-xl shadow-toss-sm hover:bg-primary/90 transition-colors"
                                            >
                                                가져오기
                                            </button>
                                            <button
                                                onClick={backupManager.handleDropGuestData}
                                                className="px-3 py-2 border border-border text-muted-foreground text-xs font-semibold rounded-xl hover:bg-muted transition-colors"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-2xl border border-border/50 bg-card shadow-toss-sm">
                                        <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">매수 합계</div>
                                        <div className="font-bold text-base">{journalStats.buy.toLocaleString()}</div>
                                    </div>
                                    <div className="p-4 rounded-2xl border border-border/50 bg-card shadow-toss-sm">
                                        <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">순손익</div>
                                        <div className={`font-bold text-base ${journalNetCash >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                                            {journalNetCash > 0 ? '+' : ''}{journalNetCash.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Trade Form */}
                                <div ref={addFormRef} className="rounded-2xl border border-border/50 bg-card shadow-toss overflow-hidden">
                                    <div className="px-4 py-3 border-b border-border/50 bg-muted/30 font-semibold text-xs flex items-center gap-2 text-foreground">
                                        <span>✍️</span> 매매 기록 작성
                                    </div>
                                    <div className="p-4">
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
                    <div className="h-full overflow-y-auto scrollbar-thin pb-4">
                        <MarketDiaryView
                            darkMode={darkMode}
                            currentUser={currentUser}
                            diaryData={diaryData}
                            trades={trades}
                        />
                    </div>
                ) : activeTab === 'reports' ? (
                    <div className="h-full overflow-y-auto scrollbar-thin pb-4">
                        <EconomicReportsView
                            darkMode={darkMode}
                            currentUser={currentUser}
                        />
                    </div>
                ) : activeTab === 'stats' ? (
                    <div className="h-full overflow-y-auto scrollbar-thin pb-4">
                        <DashboardView
                            darkMode={darkMode}
                            currentUser={currentUser}
                            statsData={dashboardStats}
                            riskData={riskData}
                            goalsData={goalsData}
                            currentPrices={currentPrices}
                            onCurrentPriceChange={handleCurrentPriceChange}
                            onSymbolClick={handleSymbolClick}
                            tagColors={tagColors}
                            exchangeRate={exchangeRate}
                            onExchangeRateChange={setExchangeRate}
                            trades={trades}
                            lastTradeDate={trades.length > 0
                                ? [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date
                                : undefined}
                        />
                    </div>
                ) : activeTab === 'settings' ? (
                    <div className="h-full overflow-y-auto scrollbar-thin pb-4">
                        <SettingsView
                            darkMode={darkMode}
                            setDarkMode={setDarkMode}
                            currentUser={currentUser}
                            backupManager={backupManager}
                            strategies={strategies}
                            onAddStrategy={addStrategy}
                            onUpdateStrategy={updateStrategy}
                            onRemoveStrategy={removeStrategy}
                            onUpdateSymbolNames={dataCorrection.updateMissingSymbolNames}
                            isUpdating={dataCorrection.isCorrecting}
                        />
                    </div>
                ) : null}

            </div>

            {/* Mobile Add Trade FAB - Toss Style */}
            {activeTab === 'journal' && (
                <button
                    onClick={() => setShowAddModal(true)}
                    aria-label="새 매매 기록 추가"
                    title="새 매매 기록 추가"
                    className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-toss-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
                >
                    <span className="text-2xl font-light">+</span>
                </button>
            )}

            {/* Login Modal - Toss Style */}
            {showLoginModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={(e) => e.target === e.currentTarget && setShowLoginModal(false)}
                >
                    <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-toss-lg ${darkMode ? 'bg-card border border-border' : 'bg-card'}`}>
                        <button
                            onClick={() => setShowLoginModal(false)}
                            aria-label="닫기"
                            className="absolute right-4 top-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            ✕
                        </button>
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-bold text-foreground">로그인</h2>
                            <p className="text-sm mt-1 text-muted-foreground">데이터 동기화를 위해 로그인하세요</p>
                        </div>
                        <LoginForm
                            darkMode={darkMode}
                            onDone={() => setShowLoginModal(false)}
                        />
                    </div>
                </div>
            )}

            {/* Add/Edit Trade Modal - Toss Style */}
            {(editingTrade || showAddModal) && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setEditingTrade(null);
                            setShowAddModal(false);
                        }
                    }}
                >
                    <div className={`relative w-full max-w-lg rounded-3xl p-0 shadow-toss-lg overflow-hidden flex flex-col max-h-[90vh] ${darkMode ? 'bg-card border border-border' : 'bg-card'}`}>
                        <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-card">
                            <h3 className="text-lg font-bold text-foreground">
                                {editingTrade ? '매매 기록 수정' : '새로운 매매 기록'}
                            </h3>
                            <button
                                onClick={() => {
                                    setEditingTrade(null);
                                    setShowAddModal(false);
                                }}
                                aria-label="닫기"
                                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <TradeForm
                                darkMode={darkMode}
                                currentUser={currentUser}
                                baseTrades={trades}
                                onAddTrade={async (data, file) => {
                                    await handleAddTrade(data, file);
                                    setShowAddModal(false);
                                }}
                                onUpdateTrade={handleUpdateTrade}
                                allTags={allTags}
                                strategies={strategies}
                                 isCompact={false}
                                 initialData={editingTrade || undefined}
                             />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}