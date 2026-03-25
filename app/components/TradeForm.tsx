import React, { useState, useCallback, useMemo, ChangeEvent, FormEvent, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { User } from '@supabase/supabase-js';
import { TradeSide, Trade } from '@/app/types/trade';
import { getCurrencySymbol } from '@/app/utils/format';
import {
    EmotionWarning,
    ChecklistItem,
    DEFAULT_CHECKLIST,
    detectEmotionPatterns,
    calcDisciplineScore,
} from '@/app/utils/emotionDetector';
import { StockSymbolInput } from '@/app/components/StockSymbolInput';
import {
    Save, Plus, Info, PartyPopper, Copy, BookmarkPlus,
    ChevronDown, ChevronUp, X, Check,
    Brain, AlertTriangle, CheckCircle, Circle, Gem,
} from 'lucide-react';
import { DatePicker } from '@/app/components/DatePicker';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { useTradeTemplates, MAX_TEMPLATES } from '@/app/hooks/useTradeTemplates';

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
    allTrades?: Trade[];
    initialData?: Trade;
    onUpdateTrade?: (id: string, data: TradeSubmitData, imageFile: File | null) => Promise<void>;
    onAddTrade: (
        data: TradeSubmitData,
        imageFile: File | null
    ) => Promise<void>;
    isCompact?: boolean;
    onCoachRequest?: (symbol: string, side: string) => void;
    prefill?: {
        symbol: string;
        symbol_name?: string;
        side: TradeSide;
        quantity: number;
    };
}

const EMOTION_OPTION_META = [
    { value: 'PLANNED', emoji: '📋', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { value: 'FOMO', emoji: '😰', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    { value: 'FEAR', emoji: '😨', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    { value: 'GREED', emoji: '🤑', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { value: 'REVENGE', emoji: '😤', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    { value: 'IMPULSE', emoji: '⚡', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
];

export function TradeForm({
    darkMode,
    baseTrades,
    allTrades = [],
    onAddTrade,
    isCompact = false,
    initialData,
    onUpdateTrade,
    prefill,
    currentUser,
    onCoachRequest,
}: TradeFormProps) {
    const t = useTranslations('trade.form');
    const tc = useTranslations('common');
    const te = useTranslations('emotion');
    const tRoot = useTranslations();

    const EMOTION_OPTIONS = useMemo(() =>
        EMOTION_OPTION_META.map(opt => ({
            ...opt,
            label: `${opt.emoji} ${te(opt.value as 'PLANNED' | 'FOMO' | 'FEAR' | 'GREED' | 'REVENGE' | 'IMPULSE')}`,
        })),
    [te]);

    const [form, setForm] = useState({
        date: initialData?.date || new Date().toISOString().slice(0, 10),
        symbol: initialData?.symbol || prefill?.symbol || '',
        symbol_name: initialData?.symbol_name || prefill?.symbol_name || '',
        side: (initialData?.side || prefill?.side || 'BUY') as TradeSide,
        price: initialData?.price?.toString() || '',
        quantity: initialData?.quantity?.toString() || prefill?.quantity?.toString() || '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    // 심화 기록 섹션 상태
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [checklist, setChecklist] = useState<ChecklistItem[]>(
        DEFAULT_CHECKLIST.map(item => ({ ...item, checked: false }))
    );
    const [selectedEmotion, setSelectedEmotion] = useState<string>(
        initialData?.emotion_tag ?? 'PLANNED'
    );

    // Template state
    const { templates, saveTemplate, deleteTemplate } = useTradeTemplates(currentUser ?? null);
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
    const [savingTemplateName, setSavingTemplateName] = useState<string | null>(null);
    const templateNameInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isFirstTrade = baseTrades.length === 0 && !initialData;

    // Recent symbols for quick entry
    const recentSymbols = useMemo(() => {
        if (initialData || isCompact) return [];
        const seen = new Set<string>();
        const result: { symbol: string; symbol_name: string }[] = [];
        const sorted = [...allTrades].sort((a, b) => b.date.localeCompare(a.date));
        for (const trade of sorted) {
            if (seen.has(trade.symbol)) continue;
            seen.add(trade.symbol);
            result.push({ symbol: trade.symbol, symbol_name: trade.symbol_name || trade.symbol });
            if (result.length >= 5) break;
        }
        return result;
    }, [allTrades, initialData, isCompact]);

    const [priceFetching, setPriceFetching] = useState(false);

    const handleRecentSymbolClick = useCallback(async (sym: string, symName: string) => {
        setForm(prev => ({
            ...prev,
            symbol: sym,
            symbol_name: symName,
        }));
        // Auto-fetch current price
        setPriceFetching(true);
        try {
            const res = await fetch(`/api/stock-price?symbol=${encodeURIComponent(sym)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.price) {
                    setForm(prev => ({ ...prev, price: String(data.price) }));
                }
            }
        } catch {
            // silently fail - user can enter price manually
        } finally {
            setPriceFetching(false);
        }
    }, []);

    // showAdvanced가 열릴 때만 패턴 계산 (성능 최적화)
    const emotionWarnings = useMemo<EmotionWarning[]>(() => {
        if (!showAdvanced) return [];
        return detectEmotionPatterns(
            allTrades,
            form.side as 'BUY' | 'SELL',
            form.symbol,
            (Number(form.price) || 0) * (Number(form.quantity) || 0)
        );
    }, [showAdvanced, allTrades, form.side, form.symbol, form.price, form.quantity]);

    const disciplineScore = useMemo(
        () => calcDisciplineScore(checklist),
        [checklist]
    );

    const toggleChecklistItem = (id: string) => {
        setChecklist(prev =>
            prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
        );
    };

    // Close dropdown on outside click
    React.useEffect(() => {
        if (!showTemplateDropdown) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowTemplateDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showTemplateDropdown]);

    const handleApplyTemplate = (templateId: string) => {
        const tpl = templates.find(t => t.id === templateId);
        if (!tpl) return;
        setForm(prev => ({
            ...prev,
            symbol: tpl.symbol,
            symbol_name: tpl.symbol_name || '',
            side: tpl.side,
            quantity: tpl.quantity.toString(),
        }));
        setShowTemplateDropdown(false);
    };

    const handleInitiateSaveTemplate = () => {
        if (!form.symbol) return;
        const defaultName = t('defaultTemplateName', { symbol: form.symbol_name || form.symbol, side: form.side === 'BUY' ? tc('buy') : tc('sell') });
        setSavingTemplateName(defaultName);
        setTimeout(() => templateNameInputRef.current?.focus(), 50);
    };

    const handleConfirmSaveTemplate = async () => {
        if (!savingTemplateName?.trim()) return;
        const ok = await saveTemplate({
            name: savingTemplateName.trim(),
            symbol: form.symbol.toUpperCase().trim(),
            symbol_name: form.symbol_name || undefined,
            side: form.side as TradeSide,
            quantity: Number(form.quantity) || 1,
        });
        setSavingTemplateName(null);
        if (!ok) alert(t('templateMaxAlert', { max: MAX_TEMPLATES }));
    };

    // Update form when initialData changes (편집 모드 - emotion_tag 포함)
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
            setSelectedEmotion(initialData.emotion_tag ?? 'PLANNED');
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
        if (!form.date) { alert(t('validateDate')); return false; }
        if (!form.symbol || form.symbol.trim() === '') { alert(t('validateSymbol')); return false; }
        if (!form.price || form.price.trim() === '') { alert(t('validatePrice')); return false; }
        if (!form.quantity || form.quantity.trim() === '') { alert(t('validateQuantity')); return false; }
        const p = Number(form.price), q = Number(form.quantity);
        if (Number.isNaN(p) || Number.isNaN(q)) { alert(t('validateNumber')); return false; }
        if (p <= 0) { alert(t('validatePricePositive')); return false; }
        if (q <= 0) { alert(t('validateQuantityPositive')); return false; }
        if (q % 1 !== 0) { alert(t('validateQuantityInteger')); return false; }
        return true;
    };

    // 단순화된 handleSubmit — 모달 없이 바로 저장
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        await executeSubmit(showAdvanced ? selectedEmotion : undefined);
    };

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
                // 심화 기록 섹션 초기화
                setShowAdvanced(false);
                setChecklist(DEFAULT_CHECKLIST.map(item => ({ ...item, checked: false })));
                setSelectedEmotion('PLANNED');
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
                        <div className="text-sm font-bold text-white">{t('celebrationTitle')}</div>
                        <div className="text-xs text-white/50">{t('celebrationDesc')}</div>
                    </div>
                </div>
            )}

            {!isCompact && (
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                            {prefill ? <Copy size={20} strokeWidth={2} /> : <Plus size={20} strokeWidth={2} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">
                                {initialData ? t('editTrade') : t('newTrade')}
                            </h2>
                            <p className="text-xs font-medium text-muted-foreground">
                                {prefill
                                    ? t('copiedTrade', { symbol: prefill.symbol_name || prefill.symbol })
                                    : isFirstTrade
                                    ? t('firstTradeGuide')
                                    : t('dailyMessage')}
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
                        {t('firstTradeHelp')}
                    </p>
                </div>
            )}

            {/* Template Loader */}
            {templates.length > 0 && !initialData && (
                <div className="mb-3 relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setShowTemplateDropdown(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/8 transition-all"
                    >
                        <ChevronDown size={13} className={`transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} />
                        {t('templateLoad')}
                    </button>
                    {showTemplateDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-64 z-20 rounded-xl border border-white/10 bg-card shadow-toss-lg overflow-hidden">
                            {templates.map(tpl => (
                                <div key={tpl.id} className="flex items-center group hover:bg-white/5 transition-colors">
                                    <button
                                        type="button"
                                        onClick={() => handleApplyTemplate(tpl.id)}
                                        className="flex-1 flex items-center gap-2 px-3 py-2.5 text-left"
                                    >
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-none ${tpl.side === 'BUY' ? 'bg-color-up/10 text-color-up' : 'bg-color-down/10 text-color-down'}`}>
                                            {tpl.side === 'BUY' ? tc('buy') : tc('sell')}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-white truncate">{tpl.name}</div>
                                            {tpl.symbol_name && tpl.symbol_name !== tpl.name && (
                                                <div className="text-[10px] text-white/40 truncate">{tpl.symbol} · {tpl.quantity.toLocaleString()} {tc('shares')}</div>
                                            )}
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteTemplate(tpl.id)}
                                        className="p-2 text-white/20 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 mr-1"
                                        title={tc('delete')}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Symbols Quick Select */}
            {recentSymbols.length > 0 && !initialData && (
                <div className="mb-3">
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">{t('recentSymbols')}</div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                        {recentSymbols.map(rs => (
                            <button
                                key={rs.symbol}
                                type="button"
                                onClick={() => handleRecentSymbolClick(rs.symbol, rs.symbol_name)}
                                disabled={priceFetching}
                                className={`flex-none px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                                    form.symbol === rs.symbol
                                        ? 'bg-primary/15 text-primary border-primary/30'
                                        : 'text-white/50 bg-white/5 border-white/8 hover:text-white/70 hover:bg-white/8'
                                }`}
                            >
                                {rs.symbol_name}
                            </button>
                        ))}
                        {priceFetching && (
                            <span className="text-[10px] text-white/30 ml-1">{t('fetchingPrice')}</span>
                        )}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Date & Side */}
                <div className="flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:items-end">
                    <div className="sm:col-span-7">
                        <label className={labelClass}>{t('dateLabel')}</label>
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
                                {tc('buy')}
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
                                {tc('sell')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Row 2: Symbol with Autocomplete */}
                <div>
                    <label className={labelClass}>
                        {t('symbolLabel')}
                        {isFirstTrade && <span className="ml-1.5 text-blue-400/60">{t('symbolFirstTradeHint')}</span>}
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
                        <label className={labelClass} title={t('priceTitle')}>
                            {t('priceLabel')} {form.symbol && <span className={darkMode ? 'text-indigo-400' : 'text-indigo-600'}>({getCurrencySymbol(form.symbol)})</span>}
                            {isFirstTrade && !form.symbol && <span className="ml-1 text-white/25 text-xs">{t('priceAfterSymbol')}</span>}
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
                                title={t('buyPriceTitle')}
                            />
                            {form.symbol && getCurrencySymbol(form.symbol) === '원' && (
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}>원</span>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className={labelClass} title={t('quantityTitle')}>
                            {t('quantityLabel')}
                            {isFirstTrade && <span className="ml-1 text-white/25 text-xs">{t('quantityHint')}</span>}
                        </label>
                        <input
                            type="number"
                            inputMode="numeric"
                            name="quantity"
                            placeholder="0"
                            value={form.quantity}
                            onChange={handleChange}
                            className={inputBaseClass + ' text-right font-mono'}
                            title={t('buyQuantityTitle')}
                        />
                    </div>
                </div>

                <div className="pt-2 space-y-2">
                    {/* 심화 기록 토글 */}
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-white/25 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/40 transition-all text-white/65 hover:text-white/85"
                    >
                        <div className="flex items-center gap-2">
                            <Brain size={13} className="text-white/50 flex-none" />
                            <span className="text-xs font-semibold">{t('advancedToggle')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-white/35 border border-white/15 rounded-md px-1.5 py-0.5">{t('advancedOptional')}</span>
                            {showAdvanced
                                ? <ChevronUp size={14} />
                                : <ChevronDown size={14} />
                            }
                        </div>
                    </button>

                    {/* 인라인 펼침 섹션 */}
                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
                                    <div className="px-4 py-3 space-y-4">

                                        {/* 감정 패턴 경고 */}
                                        {emotionWarnings.length > 0 && (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <AlertTriangle size={13} className="text-yellow-400" />
                                                    <span className="text-xs font-bold text-yellow-400">{t('detectedPatterns')}</span>
                                                </div>
                                                {emotionWarnings.map((w, i) => (
                                                    <div
                                                        key={i}
                                                        className={`px-3 py-2 rounded-lg border text-xs leading-relaxed ${
                                                            w.severity === 'critical'
                                                                ? 'bg-red-500/5 border-red-500/15 text-red-300'
                                                                : w.severity === 'warning'
                                                                    ? 'bg-yellow-500/5 border-yellow-500/15 text-yellow-300'
                                                                    : 'bg-blue-500/5 border-blue-500/15 text-blue-300'
                                                        }`}
                                                    >
                                                        <span className="font-bold">{w.icon} {tRoot(w.titleKey)}</span>
                                                        <p className="text-white/40 mt-0.5">{tRoot(w.descriptionKey, w.descriptionParams)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 체크리스트 */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <Brain size={13} className="text-indigo-400" />
                                                    <span className="text-xs font-bold text-white">{t('checklist')}</span>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    disciplineScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                                                    disciplineScore >= 60 ? 'bg-yellow-500/10 text-yellow-400' :
                                                    'bg-red-500/10 text-red-400'
                                                }`}>
                                                    {t('checklistProgress', { checked: checklist.filter(c => c.checked).length, total: checklist.length })}
                                                </span>
                                            </div>
                                            {checklist.map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => toggleChecklistItem(item.id)}
                                                    className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border transition-all text-left ${
                                                        item.checked
                                                            ? 'bg-emerald-500/5 border-emerald-500/15'
                                                            : 'bg-white/2 border-white/5 hover:border-white/10'
                                                    }`}
                                                >
                                                    {item.checked
                                                        ? <CheckCircle size={14} className="text-emerald-400 flex-none mt-0.5" />
                                                        : <Circle size={14} className="text-white/15 flex-none mt-0.5" />
                                                    }
                                                    <div className="min-w-0">
                                                        <div className={`text-xs font-bold ${item.checked ? 'text-emerald-400' : 'text-white/60'}`}>
                                                            {tRoot(item.labelKey)}
                                                        </div>
                                                        <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{tRoot(item.descriptionKey)}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        {/* 심리 태그 */}
                                        <div className="space-y-1.5">
                                            <span className="text-xs font-bold text-white">{t('psychologyTag')}</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {EMOTION_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setSelectedEmotion(opt.value)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                            selectedEmotion === opt.value
                                                                ? opt.color + ' ring-1 ring-current'
                                                                : 'text-white/30 bg-white/3 border-white/5 hover:border-white/10'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* AI Coach Button — BUY trades, logged-in, not editing */}
                    {!initialData && form.side === 'BUY' && currentUser && onCoachRequest && (
                        <button
                            type="button"
                            onClick={() => onCoachRequest(form.symbol, form.side)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-300 text-sm font-semibold hover:bg-indigo-500/10 transition-colors"
                        >
                            <Brain size={16} />
                            {tRoot('trade.preCoach.title')}
                            <span className="flex items-center gap-0.5 text-xs text-amber-400/80">
                                <Gem size={10} /> 1
                            </span>
                        </button>
                    )}

                    <Button
                        type="submit"
                        fullWidth
                        size="lg"
                        loading={isSubmitting}
                        className="gap-2"
                    >
                        <Save size={18} strokeWidth={2} />
                        {initialData ? t('updateButton') : t('saveButton')}
                    </Button>

                    {/* Template Save */}
                    {!initialData && form.symbol && (
                        savingTemplateName !== null ? (
                            <div className="flex items-center gap-2">
                                <input
                                    ref={templateNameInputRef}
                                    type="text"
                                    value={savingTemplateName}
                                    onChange={e => setSavingTemplateName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') { e.preventDefault(); handleConfirmSaveTemplate(); }
                                        if (e.key === 'Escape') setSavingTemplateName(null);
                                    }}
                                    placeholder={t('templateName')}
                                    className="flex-1 px-3 py-2 h-9 text-xs font-semibold rounded-xl outline-none bg-muted/50 text-foreground border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20"
                                />
                                <button
                                    type="button"
                                    onClick={handleConfirmSaveTemplate}
                                    className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                    title={tc('save')}
                                >
                                    <Check size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSavingTemplateName(null)}
                                    className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white transition-colors"
                                    title={tc('cancel')}
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        ) : (
                            templates.length < MAX_TEMPLATES && (
                                <button
                                    type="button"
                                    onClick={handleInitiateSaveTemplate}
                                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-white/30 hover:text-white/60 hover:bg-white/5 transition-all border border-dashed border-white/10 hover:border-white/20"
                                >
                                    <BookmarkPlus size={13} />
                                    {t('templateSave')}
                                </button>
                            )
                        )
                    )}
                </div>
            </form>
        </Card>
    );
}
