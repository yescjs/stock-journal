'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowRight, LineChart } from 'lucide-react';

// Types
import { NotifyType } from '@/app/types/ui';
import { Trade } from '@/app/types/trade';

// Hooks
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth';
import { useTrades } from '@/app/hooks/useTrades';
import { useCurrentPrices } from '@/app/hooks/useCurrentPrices';
import { useExchangeRate } from '@/app/hooks/useExchangeRate';
import { useTradeFilter } from '@/app/hooks/useTradeFilter';
import { useCoins } from '@/app/hooks/useCoins';
import { useStreak } from '@/app/hooks/useStreak';
import { useOnboarding } from '@/app/hooks/useOnboarding';

// Components
import { BottomSheet } from '@/app/components/BottomSheet';
import { LoginForm } from '@/app/components/LoginForm';
import { TradeForm, TradeSubmitData } from '@/app/components/TradeForm';
import { TradeListView } from '@/app/components/views/TradeListView';
import { CoinBalance } from '@/app/components/CoinBalance';
import { CoinShopModal } from '@/app/components/CoinShopModal';
import { ImportModal } from '@/app/components/ImportModal';
import { Footer } from '@/app/components/Footer';

// Icons
import { BarChart3, AlertTriangle, LogOut, UserCheck } from 'lucide-react';

const OPEN_MONTHS_KEY = 'stock-journal-open-months-v1';

export default function TradePage() {
    const router = useRouter();

    // --- Auth & Data ---
    const { user: currentUser, loading: authLoading, logout: supabaseLogout, authError } = useSupabaseAuth();
    const { trades, addTrade, removeTrade, updateTrade, importTrades } = useTrades(currentUser);
    const { currentPrices, refresh: refreshPrices, loading: pricesLoading } = useCurrentPrices(trades);
    const { exchangeRate } = useExchangeRate();

    // --- Filter ---
    const filterState = useTradeFilter(trades);
    const { filteredTrades } = filterState;

    // --- Coins ---
    const { balance: coinBalance, transactions: coinTransactions, loading: coinsLoading, refreshBalance } = useCoins(currentUser);

    // --- Streak & Onboarding ---
    const { streak, loading: streakLoading, recordToday } = useStreak(currentUser);
    const onboarding = useOnboarding(currentUser);

    // 페이지 진입 시 스트릭 자동 기록 (거래 추가 여부와 무관하게 접속일 카운트)
    const streakRecordedRef = useRef(false);
    useEffect(() => {
        if (!streakLoading && !streakRecordedRef.current) {
            streakRecordedRef.current = true;
            recordToday();
        }
    }, [streakLoading, recordToday]);

    // --- Currency Toggle ---
    const [showConverted, setShowConverted] = useState(false);



    // --- UI State ---
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
    const [notify, setNotify] = useState<{ type: NotifyType; message: string } | null>(null);
    const [showCoinShop, setShowCoinShop] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Monthly expand state
    const [openMonths, setOpenMonths] = useState<Record<string, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(OPEN_MONTHS_KEY);
            if (saved) {
                try { return JSON.parse(saved); } catch { /* ignore */ }
            }
        }
        return {};
    });

    useEffect(() => {
        localStorage.setItem(OPEN_MONTHS_KEY, JSON.stringify(openMonths));
    }, [openMonths]);

    // --- Notify ---
    const showNotify = (type: NotifyType, message: string) => {
        setNotify({ type, message });
        setTimeout(() => setNotify(null), 3000);
    };


    // --- Handlers ---
    const handleLogout = async () => {
        await supabaseLogout();
        filterState.setSelectedSymbol('');
        router.push('/');
    };

    const handleAddTrade = async (data: TradeSubmitData, imageFile: File | null) => {
        try {
            await addTrade(data, imageFile);
            showNotify('success', '기록이 저장되었습니다.');
            recordToday();
            onboarding.completeStep('firstTrade');

            // buySellCycle 체크: 같은 종목에 BUY+SELL이 모두 존재하는지
            if (!onboarding.steps.buySellCycle) {
                const symbol = data.symbol;
                const sides = new Set(
                    trades.filter(t => t.symbol === symbol).map(t => t.side)
                );
                sides.add(data.side);
                if (sides.has('BUY') && sides.has('SELL')) {
                    onboarding.completeStep('buySellCycle');
                }
            }
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

    // --- Loading ---
    if (authLoading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#070a12]">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-30 rounded-full animate-pulse"></div>
                <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-primary shadow-toss-md">
                    <BarChart3 size={24} className="text-primary-foreground animate-pulse" />
                </div>
            </div>
            <p className="mt-4 text-white/40 text-sm font-medium">불러오는 중...</p>
        </div>
    );

    // --- Main App ---
    return (
        <div className="min-h-screen flex flex-col bg-[#070a12] text-white transition-colors duration-300">

            {/* Auth Error */}
            {authError && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-bold animate-in fade-in slide-in-from-top-4 bg-rose-500 text-white max-w-md">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={18} />
                        <span>{authError}</span>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
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

            {/* Navigation - Matching Landing Page Design */}
            <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#070a12]/85 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-6 md:px-10 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/30">
                            <LineChart size={15} className="text-white" strokeWidth={2.5} />
                        </div>
                        <span className="font-logo font-extrabold text-base tracking-tight"><span className="text-blue-400">Stock</span>Journal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {currentUser ? (
                            <>
                                <CoinBalance
                                    balance={coinBalance}
                                    onChargeClick={() => setShowCoinShop(true)}
                                    loading={coinsLoading}
                                />
                                <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10" title={currentUser.email}>
                                    <UserCheck size={14} className="text-emerald-400" />
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white/40 hover:text-white/80 text-sm font-semibold transition-colors"
                                >
                                    <LogOut size={14} /> 로그아웃
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/25 active:scale-95">
                                    로그인 <ArrowRight size={13} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex-1 min-h-0 w-full">
                <div className="max-w-6xl mx-auto px-6 md:px-10 pt-6 pb-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="journal"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="h-full"
                        >
                            <TradeListView
                                darkMode={true}
                                currentUser={currentUser}
                                trades={trades}
                                filteredTrades={filteredTrades}
                                filterState={filterState}
                                onDelete={removeTrade}
                                onEdit={(t) => setEditingTrade(t)}
                                openMonths={openMonths}
                                toggleMonth={toggleMonth}

                                currentPrices={currentPrices}
                                exchangeRate={exchangeRate}
                                showConverted={showConverted}
                                onToggleConverted={(v) => setShowConverted(v)}
                                onRefreshPrices={refreshPrices}
                                pricesLoading={pricesLoading}

                                coinBalance={coinBalance}
                                onChargeCoins={() => setShowCoinShop(true)}
                                onCoinsConsumed={refreshBalance}
                                onImport={() => setShowImportModal(true)}

                                streak={streak}
                                streakLoading={streakLoading}
                                onboardingSteps={onboarding.steps}
                                onboardingCompletedCount={onboarding.completedCount}
                                onboardingTotalSteps={onboarding.totalSteps}
                                onboardingVisible={onboarding.isVisible}
                                onDismissOnboarding={onboarding.dismiss}
                                onCompleteOnboardingStep={onboarding.completeStep}
                                onOpenAddTrade={() => setShowAddModal(true)}
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer */}
            <Footer />

            {/* Mobile FAB — Add Trade */}
            <button
                onClick={() => setShowAddModal(true)}
                aria-label="새 매매 기록 추가"
                className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-600/30 flex items-center justify-center hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
            >
                <span className="text-2xl font-light">+</span>
            </button>

            {/* Login BottomSheet */}
            <BottomSheet
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                title="로그인"
            >
                <div className="mb-4">
                    <p className="text-sm text-white/40">데이터 동기화를 위해 로그인하세요</p>
                </div>
                <LoginForm onDone={() => setShowLoginModal(false)} />
            </BottomSheet>

            {/* Trade Add/Edit BottomSheet */}
            <BottomSheet
                isOpen={!!(editingTrade || showAddModal)}
                onClose={() => { setEditingTrade(null); setShowAddModal(false); }}
                title={editingTrade ? '매매 기록 수정' : '새로운 매매 기록'}
            >
                <TradeForm
                    darkMode={true}
                    currentUser={currentUser}
                    baseTrades={trades}
                    allTrades={trades}
                    onAddTrade={async (data, file) => {
                        await handleAddTrade(data, file);
                        setShowAddModal(false);
                    }}
                    onUpdateTrade={handleUpdateTrade}

                    isCompact={false}
                    initialData={editingTrade || undefined}
                />
            </BottomSheet>

            {/* Import Modal */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                existingTrades={trades}
                onImport={async (newTrades) => {
                    const count = await importTrades(newTrades);
                    showNotify('success', `${count}건의 거래가 추가되었습니다.`);
                    return count;
                }}
            />

            {/* Coin Shop Modal */}
            <CoinShopModal
                isOpen={showCoinShop}
                onClose={() => setShowCoinShop(false)}
                balance={coinBalance}
                transactions={coinTransactions}
            />
        </div>
    );
}
