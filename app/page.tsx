'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Types
import { NotifyType } from '@/app/types/ui';
import { Trade } from '@/app/types/trade';

// Hooks
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth';
import { useTrades } from '@/app/hooks/useTrades';
import { useTagColors } from '@/app/hooks/useTagColors';
import { useTradeFilter } from '@/app/hooks/useTradeFilter';

// Components
import { Header } from '@/app/components/Header';
import { BottomSheet } from '@/app/components/BottomSheet';
import { LoginForm } from '@/app/components/LoginForm';
import { LandingPage } from '@/app/components/LandingPage';
import { TradeForm, TradeSubmitData } from '@/app/components/TradeForm';
import { TradeListView } from '@/app/components/views/TradeListView';

// Icons
import { BarChart3, AlertTriangle } from 'lucide-react';

const THEME_KEY = 'stock-journal-theme-v1';
const OPEN_MONTHS_KEY = 'stock-journal-open-months-v1';



export default function Home() {
    // --- 인증 & 데이터 ---
    const { user: currentUser, loading: authLoading, logout: supabaseLogout, authError } = useSupabaseAuth();
    const { trades, loading: tradesLoading, addTrade, removeTrade, updateTrade } = useTrades(currentUser);

    // --- 필터 ---
    const filterState = useTradeFilter(trades);
    const { filteredTrades, allTags } = filterState;

    // --- 태그 색상 ---
    const { tagColors } = useTagColors();

    // --- UI 상태 ---
    const [darkMode, setDarkMode] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
    const [notify, setNotify] = useState<{ type: NotifyType; message: string } | null>(null);
    // 앱 진입 여부 — 비로그인 상태에서 랜딩페이지를 항상 먼저 표시
    const [enteredApp, setEnteredApp] = useState(false);

    // 월별 펼침 상태
    const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(OPEN_MONTHS_KEY);
            if (saved) {
                try { setOpenMonths(JSON.parse(saved)); } catch { }
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(OPEN_MONTHS_KEY, JSON.stringify(openMonths));
    }, [openMonths]);

    // 테마 초기화 & 동기화
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

    // --- 알림 ---
    const showNotify = (type: NotifyType, message: string) => {
        setNotify({ type, message });
        setTimeout(() => setNotify(null), 3000);
    };

    // --- 핸들러 ---
    const handleLogout = async () => {
        await supabaseLogout();
        filterState.setSelectedSymbol('');
    };

    const handleStartAsGuest = () => {
        if (typeof window !== 'undefined') {
            // 게스트 데이터가 없으면 빈 배열로 초기화
            if (!localStorage.getItem('stock-journal-guest-trades-v1')) {
                localStorage.setItem('stock-journal-guest-trades-v1', JSON.stringify([]));
            }
        }
        setEnteredApp(true);
    };

    const handleAddTrade = async (data: TradeSubmitData, imageFile: File | null) => {
        try {
            await addTrade(data, imageFile);
            showNotify('success', '기록이 저장되었습니다.');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : '알 수 없는 오류';
            alert(`저장 실패: ${msg}`);
        }
    };

    const handleUpdateTrade = async (id: string, data: TradeSubmitData, imageFile: File | null) => {
        try {
            await updateTrade(id, data, imageFile);
            showNotify('success', '수정이 완료되었습니다.');
            setEditingTrade(null);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : '알 수 없는 오류';
            alert(`수정 실패: ${msg}`);
        }
    };

    const toggleMonth = (key: string) => setOpenMonths(prev => ({ ...prev, [key]: !prev[key] }));

    // --- 로딩 ---
    if (authLoading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-background">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-30 rounded-full animate-pulse"></div>
                <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-primary shadow-toss-md">
                    <BarChart3 size={24} className="text-primary-foreground animate-pulse" />
                </div>
            </div>
            <p className="mt-4 text-muted-foreground text-sm font-medium">불러오는 중...</p>
        </div>
    );

    // --- 랜딩 페이지: 비로그인 상태이고 아직 앱에 진입하지 않은 경우 항상 표시 ---
    if (!currentUser && !enteredApp) {
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
                            <LoginForm darkMode={darkMode} onDone={() => setShowLoginModal(false)} />
                            <div className="mt-4 text-center">
                                <button
                                    onClick={() => { setShowLoginModal(false); handleStartAsGuest(); }}
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

    // --- 메인 앱 ---
    return (
        <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`}>

            {/* 인증 오류 */}
            {authError && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-bold animate-in fade-in slide-in-from-top-4 bg-rose-500 text-white max-w-md">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={18} />
                        <span>{authError}</span>
                    </div>
                </div>
            )}

            {/* 토스트 알림 */}
            {notify && (
                <div className={`fixed z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-bold animate-in fade-in duration-200
                    left-1/2 -translate-x-1/2 bottom-6
                    ${notify.type === 'success' ? 'bg-emerald-500 text-white' :
                        notify.type === 'error' ? 'bg-rose-500 text-white' :
                            'bg-blue-500 text-white'}`}>
                    <div className="flex items-center gap-2">
                        <span>{notify.type === 'success' ? '✓' : notify.type === 'error' ? '✕' : 'ℹ'}</span>
                        <span>{notify.message}</span>
                    </div>
                </div>
            )}

            {/* 헤더 */}
            <div className="sticky top-0 z-50 flex-none w-full bg-background/80 backdrop-blur-md transition-colors duration-300 border-b border-border/50">
                <div className="px-6 md:px-10">
                    <Header
                        darkMode={darkMode}
                        setDarkMode={setDarkMode}
                        currentUser={currentUser}
                        onLogout={handleLogout}
                        onShowLogin={() => setShowLoginModal(true)}
                        activeTab="journal"
                        setActiveTab={() => { }}
                        onShowGuide={() => { }}
                    />
                </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="flex-1 min-h-0 w-full pt-4 pb-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key="journal"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="h-full"
                    >
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
                            currentPrices={{}}
                            exchangeRate={1}
                            showConverted={false}
                            onToggleConverted={() => { }}
                        />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* 모바일 FAB — 매매 기록 추가 */}
            <button
                onClick={() => setShowAddModal(true)}
                aria-label="새 매매 기록 추가"
                className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-toss-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
            >
                <span className="text-2xl font-light">+</span>
            </button>

            {/* 로그인 BottomSheet */}
            <BottomSheet
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                title="로그인"
            >
                <div className="mb-4">
                    <p className="text-sm text-grey-500">데이터 동기화를 위해 로그인하세요</p>
                </div>
                <LoginForm darkMode={darkMode} onDone={() => setShowLoginModal(false)} />
                <div className="mt-6 text-center">
                    <button
                        onClick={() => { setShowLoginModal(false); handleStartAsGuest(); }}
                        className="text-sm font-bold text-grey-500 hover:text-foreground transition-colors"
                    >
                        로그인 없이 게스트로 시작하기
                    </button>
                </div>
            </BottomSheet>

            {/* 매매 추가/수정 BottomSheet */}
            <BottomSheet
                isOpen={!!(editingTrade || showAddModal)}
                onClose={() => { setEditingTrade(null); setShowAddModal(false); }}
                title={editingTrade ? '매매 기록 수정' : '새로운 매매 기록'}
            >
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
                    strategies={[]}
                    isCompact={false}
                    initialData={editingTrade || undefined}
                />
            </BottomSheet>
        </div>
    );
}