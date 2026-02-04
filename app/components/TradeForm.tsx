import React, { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { User } from '@supabase/supabase-js';
import { TradeSide, Trade } from '@/app/types/trade';
import { Strategy, EmotionTag, EMOTION_TAG_LABELS, EMOTION_TAG_COLORS } from '@/app/types/strategies';
import { getKoreanWeekdayLabel, parseTagString, getCurrencySymbol } from '@/app/utils/format';
import { StockSymbolInput } from '@/app/components/StockSymbolInput';
import { Zap, ChevronDown, Image as ImageIcon, Plus, Save, Info } from 'lucide-react';
import { DatePicker } from '@/app/components/DatePicker';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';

export interface TradeSubmitData {
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
}

interface TradeFormProps {
    darkMode: boolean;
    currentUser: User | null;
    baseTrades: { symbol: string }[];
    initialData?: Trade;
    onUpdateTrade?: (id: string, data: TradeSubmitData, imageFile: File | null) => Promise<void>;
    onAddTrade: (
        data: TradeSubmitData,
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

        // 필수 필드 검증
        if (!form.date) {
            alert('날짜를 선택해주세요.');
            return;
        }

        if (!form.symbol || form.symbol.trim() === '') {
            alert('종목을 선택해주세요.');
            return;
        }

        if (!form.price || form.price.trim() === '') {
            alert('가격을 입력해주세요.');
            return;
        }

        if (!form.quantity || form.quantity.trim() === '') {
            alert('수량을 입력해주세요.');
            return;
        }

        // 숫자 형식 검증
        const price = Number(form.price);
        const quantity = Number(form.quantity);

        if (Number.isNaN(price) || Number.isNaN(quantity)) {
            alert('가격과 수량은 숫자로 입력해주세요.');
            return;
        }

        // 양수 검증
        if (price <= 0) {
            alert('가격은 0보다 큰 값을 입력해주세요.');
            return;
        }

        if (quantity <= 0) {
            alert('수량은 0보다 큰 값을 입력해주세요.');
            return;
        }

        // 합리적인 범위 검증 (선택적)
        if (quantity % 1 !== 0) {
            alert('수량은 정수로 입력해주세요.');
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
                                오늘도 원칙을 지키는 매매 하세요!
                            </p>
                        </div>
                    </div>
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
                            <Button
                                type="button"
                                fullWidth
                                onClick={() => setForm(prev => ({ ...prev, side: 'BUY' }))}
                                variant={form.side === 'BUY' ? 'primary' : 'secondary'}
                                className={form.side === 'BUY' ? 'bg-color-up hover:bg-color-up/90 text-white border-none' : ''}
                            >
                                매수
                            </Button>
                            <Button
                                type="button"
                                fullWidth
                                onClick={() => setForm(prev => ({ ...prev, side: 'SELL' }))}
                                variant={form.side === 'SELL' ? 'primary' : 'secondary'}
                                className={form.side === 'SELL' ? 'bg-color-down hover:bg-color-down/90 text-white border-none' : ''}
                            >
                                매도
                            </Button>
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
                        <label className={labelClass} title="1주당 매매 단가를 입력하세요">
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

                {/* Advanced Options Toggle - Toss Style */}
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-150 rounded-xl border border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    >
                        <ChevronDown size={14} className={`transform transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                        {showAdvanced ? '간단히 보기' : '태그/전략/메모 입력하기'}
                    </button>
                </div>

                {/* Advanced Fields Section */}
                {showAdvanced && (
                    <div className="space-y-4 animate-fade-in pt-1">
                        {/* Tags */}
                        <div>
                            <label className={labelClass} title="나중에 분석할 수 있도록 태그를 달아보세요 (예: 뇌동매매)">
                                태그 (쉼표로 구분) <Info size={10} className="inline opacity-50 ml-1" />
                            </label>
                            <input
                                type="text"
                                name="tags"
                                placeholder="예: #뇌동매매, #불타기"
                                value={form.tags}
                                onChange={handleChange}
                                className={inputBaseClass}
                                title="태그 입력"
                            />
                        </div>

                        {/* Strategy & Emotion */}
                        {strategies.length > 0 && (
                            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass} title="사용된 매매 전략을 선택하세요">
                                        <Zap size={10} className="inline mr-1" /> 전략
                                    </label>

                                    <select
                                        name="strategy_id"
                                        value={form.strategy_id}
                                        onChange={handleChange}
                                        className={inputBaseClass + ' cursor-pointer appearance-none'}
                                        title="전략 선택"
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
                                    <label className={labelClass} title="매매 당시의 심리 상태를 기록세요">
                                        심리 상태
                                    </label>
                                    <select
                                        name="emotion_tag"
                                        value={form.emotion_tag}
                                        onChange={handleChange}
                                        className={inputBaseClass + ' cursor-pointer appearance-none'}
                                        title="심리 상태 선택"
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

                        {/* Reasons */}
                        <div className="space-y-3">
                            <div>
                                <label className={labelClass} title="왜 진입했나요? 근거를 남겨주세요">
                                    진입 근거
                                </label>
                                <textarea
                                    name="entry_reason"
                                    placeholder="진입 시점의 판단 근거를 기록하세요."
                                    value={form.entry_reason}
                                    onChange={handleChange}
                                    className={inputBaseClass + ' min-h-[60px] resize-none leading-relaxed'}
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className={labelClass} title="어떻게 청산할 계획인가요?">
                                    청산 근거
                                </label>
                                <textarea
                                    name="exit_reason"
                                    placeholder="청산 시점의 판단 또는 계획을 기록하세요."
                                    value={form.exit_reason}
                                    onChange={handleChange}
                                    className={inputBaseClass + ' min-h-[60px] resize-none leading-relaxed'}
                                    rows={2}
                                />
                            </div>
                        </div>

                        {/* Memo & Image */}
                        <div className="flex flex-col sm:grid sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-9">
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
                            <div className="sm:col-span-3">
                                <label className={labelClass} title="차트 이미지를 업로드하세요">차트</label>

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
                                        className="w-full h-12 rounded-xl flex items-center justify-center transition-all duration-150 border border-dashed border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        title="이미지 업로드"
                                    >
                                        <ImageIcon size={18} />
                                    </button>
                                ) : (
                                    <div className="relative w-full h-12 rounded-xl overflow-hidden group shadow-toss-sm cursor-pointer" onClick={() => chartInputRef.current?.click()}>
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
                                                className="text-white text-xs font-semibold bg-destructive px-2.5 py-1 rounded-lg"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
        </Card>
    );
}
