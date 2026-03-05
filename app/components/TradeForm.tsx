import React, { useState, useCallback, ChangeEvent, FormEvent } from 'react';
import { User } from '@supabase/supabase-js';
import { TradeSide, Trade } from '@/app/types/trade';
import { getCurrencySymbol } from '@/app/utils/format';
import { StockSymbolInput } from '@/app/components/StockSymbolInput';
import { Save, Plus, Info, PartyPopper } from 'lucide-react';
import { DatePicker } from '@/app/components/DatePicker';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { TradeChecklist } from '@/app/components/TradeChecklist';

export interface TradeSubmitData {
    date: string;
    symbol: string;
    symbol_name?: string;
    side: TradeSide;
    price: number;
    quantity: number;
    emotion_tag?: string;
}

interface TradeFormProps {
    darkMode: boolean;
    currentUser: User | null;
    baseTrades: { symbol: string }[];
    allTrades?: Trade[]; // All trades for emotion detection
    initialData?: Trade;
    onUpdateTrade?: (id: string, data: TradeSubmitData, imageFile: File | null) => Promise<void>;
    onAddTrade: (
        data: TradeSubmitData,
        imageFile: File | null
    ) => Promise<void>;
    isCompact?: boolean;
}

export function TradeForm({
    darkMode,
    baseTrades,
    allTrades = [],
    onAddTrade,
    isCompact = false,
    initialData,
    onUpdateTrade,
}: TradeFormProps) {
    const [form, setForm] = useState({
        date: initialData?.date || new Date().toISOString().slice(0, 10),
        symbol: initialData?.symbol || '',
        symbol_name: initialData?.symbol_name || '',
        side: initialData?.side || 'BUY',
        price: initialData?.price?.toString() || '',
        quantity: initialData?.quantity?.toString() || '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showChecklist, setShowChecklist] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    const isFirstTrade = baseTrades.length === 0 && !initialData;

    // Update form when initialData changes
    React.useEffect(() => {
        if (initialData) {
            setForm({
                date: initialData.date,
                symbol: initialData.symbol,
                symbol_name: initialData.symbol_name || '',
                side: initialData.side,
                price: initialData.price.toString(),
                quantity: initialData.quantity.toString(),
            });
        }
    }, [initialData]);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSymbolChange = (symbol: string, symbolName?: string) => {
        setForm((prev) => ({
            ...prev,
            symbol: symbol,
            symbol_name: symbolName || ''
        }));
    };

    // Validate form and return true/false
    const validateForm = (): boolean => {
        if (!form.date) { alert('날짜를 선택해주세요.'); return false; }
        if (!form.symbol || form.symbol.trim() === '') { alert('종목을 선택해주세요.'); return false; }
        if (!form.price || form.price.trim() === '') { alert('가격을 입력해주세요.'); return false; }
        if (!form.quantity || form.quantity.trim() === '') { alert('수량을 입력해주세요.'); return false; }
        const p = Number(form.price), q = Number(form.quantity);
        if (Number.isNaN(p) || Number.isNaN(q)) { alert('가격과 수량은 숫자로 입력해주세요.'); return false; }
        if (p <= 0) { alert('가격은 0보다 큰 값을 입력해주세요.'); return false; }
        if (q <= 0) { alert('수량은 0보다 큰 값을 입력해주세요.'); return false; }
        if (q % 1 !== 0) { alert('수량은 정수로 입력해주세요.'); return false; }
        return true;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        // For editing, skip checklist
        if (initialData && onUpdateTrade) {
            await executeSubmit();
            return;
        }

        // Show checklist modal before submitting new trade
        setShowChecklist(true);
    };

    // Called from checklist confirm or directly for updates
    const executeSubmit = useCallback(async (emotionTag?: string) => {
        const price = Number(form.price);
        const quantity = Number(form.quantity);

        setIsSubmitting(true);
        try {
            const tradeData: TradeSubmitData = {
                date: form.date,
                symbol: form.symbol.toUpperCase().trim(),
                symbol_name: form.symbol_name || undefined,
                side: form.side as TradeSide,
                price,
                quantity,
                emotion_tag: emotionTag,
            };

            if (initialData && onUpdateTrade) {
                await onUpdateTrade(initialData.id, tradeData, null);
            } else {
                await onAddTrade(tradeData, null);
            }

            if (!initialData) {
                setForm((prev) => ({ ...prev, price: '', quantity: '' }));
                if (isFirstTrade) {
                    setShowCelebration(true);
                    setTimeout(() => setShowCelebration(false), 4000);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }, [form, initialData, isFirstTrade, onAddTrade, onUpdateTrade]);

    const handleChecklistConfirm = useCallback((_disciplineScore: number, emotionTag?: string) => {
        setShowChecklist(false);
        executeSubmit(emotionTag);
    }, [executeSubmit]);

    // Toss Design System - Input Styles
    const inputBaseClass = `
        w-full ${isCompact ? 'px-3 py-2 h-10' : 'px-4 py-3 h-12'} text-sm font-semibold rounded-xl outline-none transition-all duration-150
        bg-muted/50 text-foreground placeholder:text-muted-foreground border border-border/50
        focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary/20
        dark:bg-muted/30 dark:focus:bg-muted/50
    `;

    // Toss Design System - Label Styles
    const labelClass = "block mb-1.5 text-xs font-semibold text-muted-foreground";

    return (
        <Card variant={isCompact ? "default" : "elevated"} className={!isCompact ? 'p-6' : 'border-none bg-transparent shadow-none'}>
            {/* First Trade Celebration Banner */}
            {showCelebration && (
                <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-emerald-500/10 border border-yellow-500/20 flex items-center gap-3">
                    <PartyPopper size={20} className="text-yellow-400 flex-none" />
                    <div>
                        <div className="text-sm font-bold text-white">첫 거래 기록 완료!</div>
                        <div className="text-xs text-white/50">매매 일지를 시작했어요. 꾸준히 기록하면 AI가 패턴을 분석해줍니다.</div>
                    </div>
                </div>
            )}

            {!isCompact && (
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                            <Plus size={20} strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">
                                {initialData ? '매매 기록 수정' : '새 매매 기록'}
                            </h2>
                            <p className="text-xs font-medium text-muted-foreground">
                                {isFirstTrade ? '첫 번째 매매를 기록해보세요!' : '오늘도 원칙을 지키는 매매 하세요!'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* First Trade Inline Guide */}
            {isFirstTrade && !isCompact && (
                <div className="mb-4 p-3 rounded-xl border border-blue-500/15 bg-blue-500/5 flex items-start gap-2">
                    <Info size={14} className="text-blue-400 flex-none mt-0.5" />
                    <p className="text-xs text-blue-300/70 leading-relaxed">
                        종목 티커(예: AAPL, 005930)를 검색하고, 매수/매도 구분·단가·수량을 입력하세요. 저장하면 AI가 패턴을 분석합니다.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Date & Side */}
                <div className="flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:items-end">
                    <div className="sm:col-span-7">
                        <label className={labelClass}>날짜</label>
                        <DatePicker
                            selectedDate={form.date}
                            onChange={(dateObj, dateStr) => setForm(prev => ({ ...prev, date: dateStr }))}
                            darkMode={darkMode}
                        />
                    </div>
                    <div className="sm:col-span-5">
                        <div className="flex gap-2 h-12">
                            <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, side: 'BUY' }))}
                                className={`flex-1 h-12 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
                                    form.side === 'BUY'
                                        ? 'bg-color-up text-white shadow-lg shadow-color-up/30 ring-2 ring-color-up/50'
                                        : 'bg-color-up/8 text-color-up border-2 border-color-up/25 hover:bg-color-up/15'
                                }`}
                            >
                                매수
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, side: 'SELL' }))}
                                className={`flex-1 h-12 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
                                    form.side === 'SELL'
                                        ? 'bg-color-down text-white shadow-lg shadow-color-down/30 ring-2 ring-color-down/50'
                                        : 'bg-color-down/8 text-color-down border-2 border-color-down/25 hover:bg-color-down/15'
                                }`}
                            >
                                매도
                            </button>
                        </div>
                    </div>
                </div>

                {/* Row 2: Symbol with Autocomplete */}
                <div>
                    <label className={labelClass}>
                        종목명
                        {isFirstTrade && <span className="ml-1.5 text-blue-400/60">(티커로 검색 · 예: AAPL, 005930)</span>}
                    </label>
                    <StockSymbolInput
                        value={form.symbol}
                        initialDisplayName={form.symbol_name}
                        onChange={handleSymbolChange}
                        darkMode={darkMode}
                        disabled={isSubmitting || !!initialData}
                    />
                </div>

                {/* Row 3: Price & Quantity */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass} title="1주당 매매 단가를 입력하세요">
                            단가 {form.symbol && <span className={darkMode ? 'text-indigo-400' : 'text-indigo-600'}>({getCurrencySymbol(form.symbol)})</span>}
                            {isFirstTrade && !form.symbol && <span className="ml-1 text-white/25 text-xs">↑ 종목 선택 후 입력</span>}
                        </label>
                        <div className="relative">
                            {form.symbol && getCurrencySymbol(form.symbol) === '$' && (
                                <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}>$</span>
                            )}
                            <input
                                type="number"
                                inputMode="decimal"
                                name="price"
                                placeholder="0"
                                value={form.price}
                                onChange={handleChange}
                                className={inputBaseClass + ' font-mono text-right ' + (form.symbol && getCurrencySymbol(form.symbol) === '$' ? 'pl-10' : '') + (form.symbol && getCurrencySymbol(form.symbol) === '원' ? ' pr-10' : '')}
                                title="매수/매도 단가"
                            />
                            {form.symbol && getCurrencySymbol(form.symbol) === '원' && (
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}>원</span>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className={labelClass} title="매매한 수량을 입력하세요">
                            수량
                            {isFirstTrade && <span className="ml-1 text-white/25 text-xs">(주식 수)</span>}
                        </label>
                        <input
                            type="number"
                            inputMode="numeric"
                            name="quantity"
                            placeholder="0"
                            value={form.quantity}
                            onChange={handleChange}
                            className={inputBaseClass + ' text-right font-mono'}
                            title="매수/매도 수량"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <Button
                        type="submit"
                        fullWidth
                        size="lg"
                        loading={isSubmitting}
                        className="gap-2"
                    >
                        <Save size={18} strokeWidth={2} />
                        {initialData ? '수정 완료' : '기록 저장하기'}
                    </Button>
                </div>
            </form>

            {/* Pre-trade Checklist Modal */}
            <TradeChecklist
                isOpen={showChecklist}
                onClose={() => setShowChecklist(false)}
                onConfirm={handleChecklistConfirm}
                side={form.side as 'BUY' | 'SELL'}
                symbol={form.symbol}
                symbolName={form.symbol_name}
                price={Number(form.price) || 0}
                quantity={Number(form.quantity) || 0}
                existingTrades={allTrades}
            />
        </Card>
    );
}
