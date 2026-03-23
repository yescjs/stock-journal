'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

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
import { useEventTracking } from '@/app/hooks/useEventTracking';
import { useRiskAlert } from '@/app/hooks/useRiskAlert';
import { usePreTradeCoach } from '@/app/hooks/usePreTradeCoach';
import { useAIChat } from '@/app/hooks/useAIChat';

// Components
import { BottomSheet } from '@/app/components/BottomSheet';
import { LoginForm } from '@/app/components/LoginForm';
import { TradeForm, TradeSubmitData } from '@/app/components/TradeForm';
import { TradeListView } from '@/app/components/views/TradeListView';
import { CoinBalance } from '@/app/components/CoinBalance';
import { CoinShopModal } from '@/app/components/CoinShopModal';
import { ImportModal } from '@/app/components/ImportModal';
import { GuestMigrationModal } from '@/app/components/GuestMigrationModal';
import { Footer } from '@/app/components/Footer';
import { RiskAlertToast } from '@/app/components/RiskAlertToast';
import { PreTradeChecklist } from '@/app/components/PreTradeChecklist';
import { AIChatFAB } from '@/app/components/AIChatFAB';
import { readGuestTrades, deduplicateGuestTrades, GUEST_TRADES_KEY } from '@/app/utils/migrationUtils';
import { analyzeTradesComplete } from '@/app/utils/tradeAnalysis';

// Icons
import { BarChart3, AlertTriangle, LogOut, UserCheck } from 'lucide-react';

const OPEN_MONTHS_KEY = 'stock-journal-open-months-v1';

export default function TradePage() {
    const router = useRouter();
    const tc = useTranslations('common');
    const t = useTranslations('trade');
    const ta = useTranslations('auth');

    // --- Auth & Data ---
    const { user: currentUser, loading: authLoading, logout: supabaseLogout, authError } = useSupabaseAuth();
    const { trades, loading: tradesLoading, addTrade, removeTrade, updateTrade, importTrades, setTrades } = useTrades(currentUser);
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
    const { track } = useEventTracking(currentUser);

    // --- Risk Alerts ---
    const { alerts: riskAlerts, hasAlerts: hasRiskAlerts, acknowledge: acknowledgeRisk, dismissToday: dismissRiskToday, resetIfNeeded: resetRiskAlerts } = useRiskAlert(trades);

    // --- AI Chat (shared between FAB and AnalysisDashboard Q&A tab) ---
    const aiChat = useAIChat(currentUser, refreshBalance);
    const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);

    // --- Pre-Trade Coach ---
    const { result: coachResult, loading: coachLoading, error: coachError, generateChecklist, clear: clearCoach } = usePreTradeCoach(currentUser, refreshBalance);
    const [showCoach, setShowCoach] = useState(false);

    const handleGenerateCoach = useCallback((symbol: string, side: string) => {
        const analysis = trades.length > 0 ? analyzeTradesComplete(trades) : null;
        generateChecklist(analysis, symbol, side);
        setShowCoach(true);
    }, [trades, generateChecklist]);

    // 페이지 진입 시 스트릭 자동 기록 (거래 추가 여부와 무관하게 접속일 카운트)
    const streakRecordedRef = useRef(false);
    useEffect(() => {
        if (!streakLoading && !streakRecordedRef.current) {
            streakRecordedRef.current = true;
            recordToday();
        }
    }, [streakLoading, recordToday]);

    // 세션 시작 이벤트 (로그인 사용자, 인증 로딩 완료 후 1회)
    const sessionTrackedRef = useRef(false);
    useEffect(() => {
        if (!authLoading && currentUser && !sessionTrackedRef.current) {
            sessionTrackedRef.current = true;
            track('session_start', { page: '/trade' });
        }
    }, [authLoading, currentUser, track]);

    // --- Guest → User Migration Detection ---
    // Runs once after auth resolves. Works for both in-page login and OAuth redirects.
    // Logout clears guest data, so if user is authenticated AND guest data exists,
    // it must have been recorded in this browser session before login.
    useEffect(() => {
        if (authLoading || !currentUser || migrationCheckedRef.current) return;

        migrationCheckedRef.current = true;
        const guestTrades = readGuestTrades();
        if (guestTrades.length > 0) {
            setMigrationTrades(guestTrades);
            setShowMigrationModal(true);
        }
    }, [currentUser, authLoading]);

    const handleMigrate = async () => {
        if (migrationTrades.length === 0) return;
        setMigrationLoading(true);
        try {
            const toImport = deduplicateGuestTrades(migrationTrades, trades);
            const count = await importTrades(toImport);
            localStorage.removeItem(GUEST_TRADES_KEY);
            setShowMigrationModal(false);
            setMigrationTrades([]);
            showNotify('success', t('notify.migrated', { count }));
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : tc('unknownError');
            showNotify('error', t('notify.migrateFailed', { message: msg }));
        } finally {
            setMigrationLoading(false);
        }
    };

    const handleSkipMigration = () => {
        localStorage.removeItem(GUEST_TRADES_KEY);
        setShowMigrationModal(false);
        setMigrationTrades([]);
    };

    // --- Currency Toggle ---
    const [showConverted, setShowConverted] = useState(false);



    // --- UI State ---
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
    const [copyingTrade, setCopyingTrade] = useState<Trade | null>(null);

    // --- Undo Delete State ---
    const [pendingDelete, setPendingDelete] = useState<{
        trade: Trade;
        timerId: ReturnType<typeof setTimeout>;
    } | null>(null);
    const [notify, setNotify] = useState<{ type: NotifyType; message: string } | null>(null);
    const [showCoinShop, setShowCoinShop] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // --- Guest Migration State ---
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [migrationTrades, setMigrationTrades] = useState<Trade[]>([]);
    const [migrationLoading, setMigrationLoading] = useState(false);
    const migrationCheckedRef = useRef(false);

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
            showNotify('success', t('notify.saved'));
            track('trade_created', { symbol: data.symbol, side: data.side });
            recordToday();
            resetRiskAlerts();
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
            const msg = e instanceof Error ? e.message : tc('unknownError');
            alert(t('notify.saveFailed', { message: msg }));
        }
    };

    const handleUpdateTrade = async (id: string, data: TradeSubmitData, imageFile: File | null) => {
        try {
            await updateTrade(id, data, imageFile);
            showNotify('success', t('notify.updated'));
            setEditingTrade(null);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : tc('unknownError');
            alert(t('notify.updateFailed', { message: msg }));
        }
    };

    const toggleMonth = (key: string) => setOpenMonths(prev => ({ ...prev, [key]: !prev[key] }));

    const handleDeleteWithUndo = async (id: string) => {
        const trade = trades.find(t => t.id === id);
        if (!trade) return;

        // Commit any previously pending delete immediately before starting a new one
        if (pendingDelete) {
            clearTimeout(pendingDelete.timerId);
            removeTrade(pendingDelete.trade.id).catch(console.error);
            setPendingDelete(null);
        }

        // Optimistically remove from UI
        setTrades(prev => prev.filter(t => t.id !== id));

        const timerId = setTimeout(async () => {
            await removeTrade(id).catch(console.error);
            setPendingDelete(null);
        }, 5000);

        setPendingDelete({ trade, timerId });
    };

    const handleUndoDelete = () => {
        if (!pendingDelete) return;
        clearTimeout(pendingDelete.timerId);
        const { trade } = pendingDelete;
        setTrades(prev => {
            const restored = [...prev, trade];
            return restored.sort((a, b) => {
                if (b.date !== a.date) return b.date.localeCompare(a.date);
                return b.id.localeCompare(a.id);
            });
        });
        setPendingDelete(null);
    };

    const handleCopyTrade = (trade: Trade) => {
        setCopyingTrade(trade);
        setShowAddModal(true);
    };

    // --- Loading ---
    if (authLoading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#070a12]">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-30 rounded-full animate-pulse"></div>
                <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-primary shadow-toss-md">
                    <BarChart3 size={24} className="text-primary-foreground animate-pulse" />
                </div>
            </div>
            <p className="mt-4 text-white/40 text-sm font-medium">{tc('loading')}</p>
        </div>
    );

    // --- Main App ---
    return (
        <div className="min-h-screen flex flex-col bg-[#070a12] text-white transition-colors duration-300 pt-14 pb-16 md:pb-0">

            {/* Auth Error */}
            {authError && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-bold animate-in fade-in slide-in-from-top-4 bg-rose-500 text-white max-w-md">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={18} />
                        <span>{authError === 'AUTH_CORRUPTED' ? ta('authCorrupted') : authError === 'AUTH_CHECK_FAILED' ? ta('authCheckFailed') : authError}</span>
                    </div>
                </div>
            )}

            {/* Toast Notification — z-[58] to stay above side panel (z-[55]) */}
            {notify && (
                <div className={`fixed z-[58] px-4 py-2.5 rounded-xl shadow-lg text-sm font-bold animate-in fade-in duration-200
                    left-1/2 -translate-x-1/2 bottom-20 md:bottom-6
                    ${notify.type === 'success' ? 'bg-emerald-500 text-white' :
                        notify.type === 'error' ? 'bg-rose-500 text-white' :
                            'bg-blue-500 text-white'}`}>
                    <div className="flex items-center gap-2">
                        <span>{notify.type === 'success' ? '✓' : notify.type === 'error' ? '✕' : 'ℹ'}</span>
                        <span>{notify.message}</span>
                    </div>
                </div>
            )}

            {/* Undo Delete Toast */}
            <AnimatePresence>
                {pendingDelete && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="fixed z-[58] left-1/2 -translate-x-1/2 bottom-36 md:bottom-24 overflow-hidden rounded-xl shadow-2xl"
                    >
                        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800 border border-white/10 text-sm font-semibold text-white">
                            <span className="text-white/50">🗑</span>
                            <span>{t('notify.deleted')}</span>
                            <button
                                onClick={handleUndoDelete}
                                className="text-blue-400 hover:text-blue-300 font-bold transition-colors ml-1"
                            >
                                {tc('undo')}
                            </button>
                        </div>
                        <motion.div
                            className="absolute bottom-0 left-0 h-0.5 bg-blue-400/60 rounded-full"
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: 5, ease: 'linear' }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Risk Alert Toast */}
            {hasRiskAlerts && (
                <RiskAlertToast
                    alerts={riskAlerts}
                    onAcknowledge={acknowledgeRisk}
                    onDismissToday={dismissRiskToday}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 min-h-0 w-full">
                <div className="max-w-6xl mx-auto px-6 md:px-10 pt-6 pb-8">
                    {/* User Controls */}
                    <div className="flex items-center justify-end gap-2 mb-4">
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
                                    <LogOut size={14} /> {tc('logout')}
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/25 active:scale-95">
                                {tc('login')} <ArrowRight size={13} />
                            </button>
                        )}
                    </div>

                    <TradeListView
                                tradesLoading={tradesLoading}
                                darkMode={true}
                                currentUser={currentUser}
                                trades={trades}
                                filteredTrades={filteredTrades}
                                filterState={filterState}
                                onDelete={handleDeleteWithUndo}
                                onEdit={(t) => setEditingTrade(t)}
                                onCopy={handleCopyTrade}
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
                                sharedAIChat={currentUser ? aiChat : undefined}
                            />
                </div>
            </div>

            {/* Footer */}
            <Footer />

            {/* AI Q&A FAB — left side, logged-in only */}
            {currentUser && (
                <AIChatFAB
                    messages={aiChat.messages}
                    loading={aiChat.loading}
                    error={aiChat.error}
                    onSend={aiChat.sendMessage}
                    onClear={aiChat.clearChat}
                    trades={trades}
                    coinBalance={coinBalance}
                    onChargeCoins={() => setShowCoinShop(true)}
                    onOpenChange={setIsChatPanelOpen}
                    freeRemaining={aiChat.freeRemaining}
                    isFree={aiChat.isFree}
                />
            )}

            {/* FAB — Add Trade (right side, hidden on desktop when chat panel is open) */}
            <AnimatePresence>
                {!isChatPanelOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        onClick={() => setShowAddModal(true)}
                        aria-label={t('form.addTradeAriaLabel')}
                        className="fixed bottom-20 md:bottom-6 right-6 z-40 h-11 w-11 md:h-11 md:w-auto md:px-4 rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-2 hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
                    >
                        <span className="text-xl font-light leading-none">+</span>
                        <span className="hidden md:inline text-xs font-bold">{t('form.addTradeShort')}</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Login BottomSheet */}
            <BottomSheet
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                title={tc('login')}
            >
                <div className="mb-4">
                    <p className="text-sm text-white/40">{ta('loginModalDesc')}</p>
                </div>
                <LoginForm onDone={() => setShowLoginModal(false)} />
            </BottomSheet>

            {/* Trade Add/Edit BottomSheet */}
            <BottomSheet
                isOpen={!!(editingTrade || showAddModal)}
                onClose={() => { setEditingTrade(null); setShowAddModal(false); setCopyingTrade(null); clearCoach(); setShowCoach(false); }}
                title={editingTrade ? t('form.editTrade') : copyingTrade ? t('form.copiedTrade', { symbol: copyingTrade.symbol_name || copyingTrade.symbol }) : t('form.newTrade')}
            >
                {/* Pre-Trade AI Coach */}
                {!editingTrade && currentUser && (
                    <PreTradeChecklist
                        isOpen={showCoach}
                        checklist={coachResult?.checklist ?? null}
                        loading={coachLoading}
                        error={coachError}
                        onClose={() => { setShowCoach(false); clearCoach(); }}
                        onGenerate={() => handleGenerateCoach('', 'BUY')}
                        isLoggedIn={!!currentUser}
                        coinBalance={coinBalance}
                        onChargeCoins={() => setShowCoinShop(true)}
                    />
                )}
                <TradeForm
                    darkMode={true}
                    currentUser={currentUser}
                    baseTrades={trades}
                    allTrades={trades}
                    onCoachRequest={handleGenerateCoach}
                    onAddTrade={async (data, file) => {
                        await handleAddTrade(data, file);
                        setShowAddModal(false);
                        setCopyingTrade(null);
                    }}
                    onUpdateTrade={handleUpdateTrade}
                    isCompact={false}
                    initialData={editingTrade || undefined}
                    prefill={copyingTrade ? {
                        symbol: copyingTrade.symbol,
                        symbol_name: copyingTrade.symbol_name,
                        side: copyingTrade.side,
                        quantity: copyingTrade.quantity,
                    } : undefined}
                />
            </BottomSheet>

            {/* Import Modal */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                existingTrades={trades}
                onImport={async (newTrades) => {
                    const count = await importTrades(newTrades);
                    showNotify('success', t('notify.migrated', { count }));
                    track('import_completed', { trade_count: count });
                    return count;
                }}
            />

            {/* Guest Migration Modal */}
            <GuestMigrationModal
                isOpen={showMigrationModal}
                tradeCount={migrationTrades.length}
                loading={migrationLoading}
                onMigrate={handleMigrate}
                onSkip={handleSkipMigration}
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
