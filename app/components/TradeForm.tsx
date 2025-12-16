import React, { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { User } from '@supabase/supabase-js';
import { TradeSide } from '@/app/types/trade';
import { getKoreanWeekdayLabel, parseTagString } from '@/app/utils/format';
import { STATIC_SYMBOLS } from '@/app/utils/constants';

interface TradeFormProps {
    darkMode: boolean;
    currentUser: User | null;
    baseTrades: { symbol: string }[];
    onAddTrade: (
        data: {
            date: string;
            symbol: string;
            side: TradeSide;
            price: number;
            quantity: number;
            memo: string;
            tags: string[];
        },
        imageFile: File | null
    ) => Promise<void>;
    allTags: string[];
    isCompact?: boolean;
}

export function TradeForm({
    darkMode,
    currentUser,
    baseTrades,
    onAddTrade,
    allTags,
    isCompact = false,
}: TradeFormProps) {
    const [form, setForm] = useState({
        date: new Date().toISOString().slice(0, 10),
        symbol: '',
        side: 'BUY' as TradeSide,
        price: '',
        quantity: '',
        memo: '',
        tags: '',
    });

    const [symbolSuggestions, setSymbolSuggestions] = useState<string[]>([]);
    const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false);
    const [chartFile, setChartFile] = useState<File | null>(null);
    const [chartPreview, setChartPreview] = useState<string | null>(null);
    const chartInputRef = useRef<HTMLInputElement | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const weekdayLabel = getKoreanWeekdayLabel(form.date);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSymbolChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setForm((prev) => ({ ...prev, symbol: value }));

        const trimmed = value.trim().toLowerCase();
        if (!trimmed) {
            setSymbolSuggestions([]);
            setShowSymbolSuggestions(false);
            return;
        }

        const fromTrades = Array.from(
            new Set(
                baseTrades
                    .map((t) => t.symbol)
                    .filter((sym) => sym && sym.toLowerCase().includes(trimmed))
            )
        );

        const fromStatic = STATIC_SYMBOLS.filter((sym) =>
            sym.toLowerCase().includes(trimmed)
        );

        const uniq = Array.from(new Set([...fromTrades, ...fromStatic])).slice(0, 5);
        setSymbolSuggestions(uniq);
        setShowSymbolSuggestions(uniq.length > 0);
    };

    const handleChartFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setChartFile(null);
            setChartPreview(null);
            return;
        }

        const maxSize = 500 * 1024; // 500KB
        if (file.size > maxSize) {

            alert('이미지 용량이 너무 큽니다. 500KB 이하로 줄여서 올려주세요.');
            e.target.value = '';
            setChartFile(null);
            setChartPreview(null);
            return;
        }

        setChartFile(file);
        setChartPreview(URL.createObjectURL(file));
    };

    const toggleFormTag = (tag: string) => {
        setForm((prev) => {
            const currentTags = parseTagString(prev.tags);
            const lower = tag.toLowerCase();
            const has = currentTags.some((t) => t.toLowerCase() === lower);
            const nextTags = has
                ? currentTags.filter((t) => t.toLowerCase() !== lower)
                : [...currentTags, tag];
            return {
                ...prev,
                tags: nextTags.join(','),
            };
        });
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
            await onAddTrade(
                {
                    date: form.date,
                    symbol: form.symbol.toUpperCase().trim(),
                    side: form.side,
                    price,
                    quantity,
                    memo: form.memo,
                    tags: uniqueTags,
                },
                chartFile
            );

            // Reset Form
            setForm((prev) => ({
                ...prev,
                price: '',
                quantity: '',
                memo: '',
                tags: '',
            }));
            setChartFile(null);
            setChartPreview(null);
            if (chartInputRef.current) {
                chartInputRef.current.value = '';
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputBaseClass =
        `w-full ${isCompact ? 'px-3 py-2' : 'px-4 py-3'} text-sm font-medium rounded-xl outline-none transition-all ` +
        (darkMode
            ? 'bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-700 focus:ring-1 focus:ring-slate-600'
            : 'bg-slate-100 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:text-slate-900');

    const labelClass = 'block mb-1 text-[11px] font-bold uppercase tracking-wider ' + (darkMode ? 'text-slate-300' : 'text-slate-600');

    return (
        <div className={!isCompact ? 'rounded-2xl border shadow-sm p-6 ' + (darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200') : ''}>
            {!isCompact && (
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + (darkMode ? 'bg-blue-500/20' : 'bg-blue-50')}>
                            <span className="text-lg">📝</span>
                        </div>
                        <div>
                            <h2 className={'text-base font-bold ' + (darkMode ? 'text-white' : 'text-slate-900')}>
                                새 기록 추가
                            </h2>
                            <p className={'text-xs ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                                매매 내역을 기록하세요
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2.5">
                {/* Row 1: Date & Side */}
                <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7">
                        <label className={labelClass}>날짜</label>
                        <input
                            type="date"
                            name="date"
                            value={form.date}
                            onChange={handleChange}
                            className={inputBaseClass + ' text-center tracking-tight'}
                        />
                    </div>
                    <div className="col-span-5">
                        <div className={(darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200') + ' border p-1 rounded-xl flex h-[38px]'}>
                            <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, side: 'BUY' }))}
                                className={'flex-1 rounded-lg text-xs font-bold transition-all ' + (form.side === 'BUY' ? 'bg-rose-500 text-white shadow-sm' : (darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'))}
                            >
                                매수
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, side: 'SELL' }))}
                                className={'flex-1 rounded-lg text-xs font-bold transition-all ' + (form.side === 'SELL' ? 'bg-blue-500 text-white shadow-sm' : (darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'))}
                            >
                                매도
                            </button>
                        </div>
                    </div>
                </div>

                {/* Row 2: Symbol */}
                <div className="relative">
                    <label className={labelClass}>종목명</label>
                    <input
                        type="text"
                        name="symbol"
                        placeholder="예: AAPL"
                        value={form.symbol}
                        onChange={handleSymbolChange}
                        className={inputBaseClass + ' uppercase font-bold tracking-wide'}
                        autoComplete="off"
                    />
                    {showSymbolSuggestions && symbolSuggestions.length > 0 && (
                        <div className={'absolute z-20 top-full left-0 mt-1 w-full p-1.5 rounded-xl shadow-xl border ' + (darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100')}>
                            <div className="flex flex-wrap gap-1">
                                {symbolSuggestions.map((sym) => (
                                    <button
                                        key={sym}
                                        type="button"
                                        onClick={() => {
                                            setForm((prev) => ({ ...prev, symbol: sym }));
                                            setSymbolSuggestions([]);
                                            setShowSymbolSuggestions(false);
                                        }}
                                        className={'px-2 py-1 text-xs font-bold rounded-lg transition-colors ' + (darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700')}
                                    >
                                        {sym}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Row 3: Price & Quantity */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={labelClass}>단가</label>
                        <input
                            type="number"
                            inputMode="decimal"
                            name="price"
                            placeholder="0"
                            value={form.price}
                            onChange={handleChange}
                            className={inputBaseClass + ' text-right font-mono'}
                        />
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
                    <label className={labelClass}>태그</label>
                    <input
                        type="text"
                        name="tags"
                        placeholder="태그 입력 (쉼표로 구분)"
                        value={form.tags}
                        onChange={handleChange}
                        className={inputBaseClass}
                    />
                </div>

                {/* Row 5: Memo & Image */}
                <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-9">
                        <label className={labelClass}>메모</label>
                        <textarea
                            name="memo"
                            placeholder="메모를 입력하세요..."
                            value={form.memo}
                            onChange={handleChange}
                            className={inputBaseClass + ' min-h-[42px] resize-none leading-relaxed'}
                            rows={1}
                        />
                    </div>
                    <div className="col-span-3">
                        <label className={labelClass}>사진</label>
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
                                className={'w-full h-[42px] rounded-xl flex items-center justify-center transition-all ' + (darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-400')}
                            >
                                <span className="text-lg">📷</span>
                            </button>
                        ) : (
                            <div className="relative w-full h-[42px] rounded-xl overflow-hidden group">
                                <img src={chartPreview} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setChartFile(null);
                                        setChartPreview(null);
                                        if (chartInputRef.current) chartInputRef.current.value = '';
                                    }}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
                                >
                                    삭제
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-1">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={
                            'w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all transform active:scale-[0.98] ' +
                            (isSubmitting
                                ? 'bg-slate-400 cursor-not-allowed'
                                : darkMode
                                    ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30'
                                    : 'bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-300')
                        }
                    >
                        {isSubmitting ? '저장 중...' : '기록 추가하기'}
                    </button>
                </div>
            </form>
        </div>
    );
}
