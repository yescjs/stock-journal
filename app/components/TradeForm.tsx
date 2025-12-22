import React, { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { User } from '@supabase/supabase-js';
import { TradeSide, Trade } from '@/app/types/trade';
import { Strategy, EmotionTag, EMOTION_TAG_LABELS, EMOTION_TAG_COLORS } from '@/app/types/strategies';
import { getKoreanWeekdayLabel, parseTagString, getCurrencySymbol } from '@/app/utils/format';
import { StockSymbolInput } from '@/app/components/StockSymbolInput';
import { Zap, ChevronDown, Camera, Plus, Save } from 'lucide-react';

interface TradeFormProps {
    darkMode: boolean;
    currentUser: User | null;
    baseTrades: { symbol: string }[];
    initialData?: Trade;
    onUpdateTrade?: (id: string, data: any, imageFile: File | null) => Promise<void>;
    onAddTrade: (
        data: {
            date: string;
            symbol: string;
            symbol_name?: string;
            side: TradeSide;
            price: number;
            quantity: number;
            memo: string;
            tags: string[];
            strategy_id?: string;
            strategy_name?: string;
            entry_reason?: string;
            exit_reason?: string;
            emotion_tag?: string;
        },
        imageFile: File | null
    ) => Promise<void>;
    allTags: string[];
    strategies?: Strategy[];
    isCompact?: boolean;
}

export function TradeForm({
    darkMode,
    currentUser,
    baseTrades,
    onAddTrade,
    allTags,
    strategies = [],
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
        memo: initialData?.memo || '',
        tags: initialData?.tags?.join(', ') || '',
        strategy_id: initialData?.strategy_id || '',
        entry_reason: initialData?.entry_reason || '',
        exit_reason: initialData?.exit_reason || '',
        emotion_tag: initialData?.emotion_tag || '' as EmotionTag | '',
    });
    const [chartFile, setChartFile] = useState<File | null>(null);
    const [chartPreview, setChartPreview] = useState<string | null>(initialData?.image || null);
    const chartInputRef = useRef<HTMLInputElement | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(!!initialData?.entry_reason || !!initialData?.exit_reason);

    const weekdayLabel = getKoreanWeekdayLabel(form.date);
    const selectedStrategy = strategies.find(s => s.id === form.strategy_id);

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
                memo: initialData.memo || '',
                tags: initialData.tags?.join(', ') || '',
                strategy_id: initialData.strategy_id || '',
                entry_reason: initialData.entry_reason || '',
                exit_reason: initialData.exit_reason || '',
                emotion_tag: initialData.emotion_tag || '' as EmotionTag | '',
            });
            setChartPreview(initialData.image || null);
            setShowAdvanced(!!initialData.entry_reason || !!initialData.exit_reason);
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

    const handleChartFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setChartFile(null);
            setChartPreview(null);
            return;
        }

        const maxSize = 2000 * 1024; // 2MB
        if (file.size > maxSize) {
            alert('이미지 용량이 너무 큽니다. 2MB 이하로 줄여서 올려주세요.');
            e.target.value = '';
            setChartFile(null);
            setChartPreview(null);
            return;
        }

        setChartFile(file);
        setChartPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!form.date || !form.symbol || !form.price || !form.quantity) {
            alert('날짜, 종목, 가격, 수량은 필수입니다.');
            return;
        }

        const price = Number(form.price);
        const quantity = Number(form.quantity);
        if (Number.isNaN(price) || Number.isNaN(quantity)) {
            alert('가격과 수량은 숫자로 입력해주세요.');
            return;
        }

        const parsedTags = parseTagString(form.tags);
        const uniqueTags = Array.from(new Set(parsedTags));

        setIsSubmitting(true);
        try {
            const tradeData = {
                date: form.date,
                symbol: form.symbol.toUpperCase().trim(),
                symbol_name: form.symbol_name || undefined,
                side: form.side,
                price,
                quantity,
                memo: form.memo,
                tags: uniqueTags,
                strategy_id: form.strategy_id || undefined,
                strategy_name: selectedStrategy?.name || undefined,
                entry_reason: form.entry_reason || undefined,
                exit_reason: form.exit_reason || undefined,
                emotion_tag: form.emotion_tag || undefined,
            };

            if (initialData && onUpdateTrade) {
                await onUpdateTrade(initialData.id, tradeData, chartFile);
            } else {
                await onAddTrade(tradeData, chartFile);
            }

            if (!initialData) {
                // Reset Form only if adding
                setForm((prev) => ({
                    ...prev,
                    price: '',
                    quantity: '',
                    memo: '',
                    tags: '',
                    strategy_id: '',
                    entry_reason: '',
                    exit_reason: '',
                    emotion_tag: '' as EmotionTag | '',
                }));
                setChartFile(null);
                setChartPreview(null);
                if (chartInputRef.current) {
                    chartInputRef.current.value = '';
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Glassmorphism Styles
    const inputBaseClass = `
        w-full ${isCompact ? 'px-3 py-2' : 'px-4 py-3'} text-sm font-bold rounded-xl outline-none transition-all
        ${darkMode 
            ? 'bg-slate-800/40 text-white placeholder-slate-500 border border-slate-700/50 focus:bg-slate-800 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20'
            : 'bg-white/50 text-slate-900 placeholder-slate-400 border border-indigo-50/50 focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 shadow-sm'}
    `;

    const labelClass = `block mb-1.5 text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`;

    return (
        <div className={!isCompact ? `rounded-3xl border p-6 transition-all glass-card ${darkMode ? 'bg-slate-900/40 border-slate-700/50' : 'bg-white/60 border-white/60 shadow-xl shadow-indigo-100/20'}` : ''}>
            {!isCompact && (
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${darkMode ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20' : 'bg-white shadow-indigo-100'}`}>
                            <Plus size={20} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} strokeWidth={3} />
                        </div>
                        <div>
                            <h2 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {initialData ? '매매 기록 수정' : '새 매매 기록'}
                            </h2>
                            <p className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                오늘도 원칙을 지키는 매매 하세요!
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Date & Side */}
                <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-7">
                        <label className={labelClass}>날짜</label>
                        <input
                            type="date"
                            name="date"
                            value={form.date}
                            onChange={handleChange}
                            className={inputBaseClass + ' text-center tracking-tight font-mono'}
                        />
                    </div>
                    <div className="col-span-5">
                        <div className={`p-1 rounded-xl flex h-[46px] border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, side: 'BUY' }))}
                                className={`flex-1 rounded-lg text-xs font-black transition-all btn-press ${form.side === 'BUY' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : (darkMode ? 'text-slate-500 hover:text-rose-400' : 'text-slate-400 hover:text-rose-500')}`}
                            >
                                매수
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, side: 'SELL' }))}
                                className={`flex-1 rounded-lg text-xs font-black transition-all btn-press ${form.side === 'SELL' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : (darkMode ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-500')}`}
                            >
                                매도
                            </button>
                        </div>
                    </div>
                </div>

                {/* Row 2: Symbol with Autocomplete */}
                <div>
                    <label className={labelClass}>종목명</label>
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
                        <label className={labelClass}>
                            단가 {form.symbol && <span className={darkMode ? 'text-indigo-400' : 'text-indigo-600'}>({getCurrencySymbol(form.symbol)})</span>}
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
                                className={inputBaseClass + ' font-mono text-right ' + (form.symbol && getCurrencySymbol(form.symbol) === '$' ? 'pl-10' : '') + (form.symbol && getCurrencySymbol(form.symbol) === '원' ? ' pr-14' : '')}
                            />
                            {form.symbol && getCurrencySymbol(form.symbol) === '원' && (
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-500'}`}>원</span>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>수량</label>
                        <input
                            type="number"
                            inputMode="numeric"
                            name="quantity"
                            placeholder="0"
                            value={form.quantity}
                            onChange={handleChange}
                            className={inputBaseClass + ' text-right font-mono'}
                        />
                    </div>
                </div>

                {/* Row 4: Tags */}
                <div>
                    <label className={labelClass}>태그 (쉼표로 구분)</label>
                    <input
                        type="text"
                        name="tags"
                        placeholder="예: #뇌동매매, #불타기"
                        value={form.tags}
                        onChange={handleChange}
                        className={inputBaseClass}
                    />
                </div>

                {/* Row 4.5: Strategy Selection */}
                {strategies.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>
                                <Zap size={10} className="inline mr-1" /> 전략
                            </label>
                            <select
                                name="strategy_id"
                                value={form.strategy_id}
                                onChange={handleChange}
                                className={inputBaseClass + ' cursor-pointer appearance-none'}
                            >
                                <option value="">선택 안함</option>
                                {strategies.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>심리 상태</label>
                            <select
                                name="emotion_tag"
                                value={form.emotion_tag}
                                onChange={handleChange}
                                className={inputBaseClass + ' cursor-pointer appearance-none'}
                            >
                                <option value="">선택 안함</option>
                                {Object.entries(EMOTION_TAG_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Advanced Options Toggle */}
                {strategies.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`w-full py-2 flex items-center justify-center gap-2 text-xs font-bold transition-all rounded-xl ${darkMode ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                        <ChevronDown size={14} className={`transform transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
                        {showAdvanced ? '상세 입력 접기' : '복기 내용 추가하기 (진입/청산 사유)'}
                    </button>
                )}

                {/* Advanced Options */}
                {showAdvanced && (
                    <div className="space-y-3 animate-fade-in p-1">
                        <div>
                            <label className={labelClass}>진입 근거</label>
                            <textarea
                                name="entry_reason"
                                placeholder="진입 시점의 판단 근거를 기록하세요."
                                value={form.entry_reason}
                                onChange={handleChange}
                                className={inputBaseClass + ' min-h-[80px] resize-none leading-relaxed'}
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>청산 근거</label>
                            <textarea
                                name="exit_reason"
                                placeholder="청산 시점의 판단 또는 계획을 기록하세요."
                                value={form.exit_reason}
                                onChange={handleChange}
                                className={inputBaseClass + ' min-h-[80px] resize-none leading-relaxed'}
                                rows={2}
                            />
                        </div>
                    </div>
                )}


                {/* Row 5: Memo & Image */}
                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-9">
                        <label className={labelClass}>간단 메모</label>
                        <textarea
                            name="memo"
                            placeholder="특이사항 메모..."
                            value={form.memo}
                            onChange={handleChange}
                            className={inputBaseClass + ' min-h-[46px] resize-none leading-relaxed py-3'}
                            rows={1}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className={labelClass}>차트</label>
                        <input
                            ref={chartInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleChartFileChange}
                            className="hidden"
                        />
                        {!chartPreview ? (
                            <button
                                type="button"
                                onClick={() => chartInputRef.current?.click()}
                                className={`w-full h-[46px] rounded-xl flex items-center justify-center transition-all border border-dashed ${darkMode ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800 hover:border-slate-500 text-slate-500' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-300 text-slate-400'}`}
                            >
                                <Camera size={18} />
                            </button>
                        ) : (
                            <div className="relative w-full h-[46px] rounded-xl overflow-hidden group shadow-md cursor-pointer" onClick={() => chartInputRef.current?.click()}>
                                <img src={chartPreview} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setChartFile(null);
                                            setChartPreview(null);
                                            if (chartInputRef.current) chartInputRef.current.value = '';
                                        }}
                                        className="text-white text-[10px] font-bold uppercase tracking-wider bg-rose-500 px-2 py-1 rounded"
                                    >
                                        삭제
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={
                            `w-full py-4 rounded-xl font-black text-sm text-white transition-all transform active:scale-[0.98] btn-press flex items-center justify-center gap-2
                            ${isSubmitting
                                ? 'bg-slate-400 cursor-not-allowed'
                                : darkMode
                                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-900/40'
                                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-200'}
                            `
                        }
                    >
                                {isSubmitting ? (
                                    <>저장 중...</>
                                ) : (
                                    <>
                                        <Save size={18} strokeWidth={2.5} />
                                        {initialData ? '수정 완료' : '기록 저장하기'}
                                    </>
                                )}
                    </button>
                </div>
            </form>
        </div>
    );
}
