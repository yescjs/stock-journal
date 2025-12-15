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
}

export function TradeForm({
    darkMode,
    currentUser,
    baseTrades,
    onAddTrade,
    allTags,
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
        'w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ' +
        (darkMode
            ? 'bg-slate-800 border-slate-700 placeholder-slate-500 text-slate-100'
            : 'bg-white border-slate-200 placeholder-slate-400 text-slate-900');

    const labelClass = 'block mb-1.5 text-xs font-semibold tracking-wide ' + (darkMode ? 'text-slate-400' : 'text-slate-600');

    return (
        <div
            className={
                'rounded-2xl border shadow-sm p-5 md:p-6 mb-8 ' +
                (darkMode
                    ? 'bg-slate-900/50 border-slate-800 backdrop-blur-sm'
                    : 'bg-white border-white shadow-slate-200/60')
            }
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
                        <span className="text-blue-500">＋</span> New Trade
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        {currentUser
                            ? 'Saved to Cloud (Supabase)'
                            : 'Saved Locally (Guest Mode)'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Row 1: Date & Symbol */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Date */}
                    <div className="md:col-span-4">
                        <label className={labelClass}>Date</label>
                        <div className="relative flex items-center">
                            <input
                                type="date"
                                name="date"
                                value={form.date}
                                onChange={handleChange}
                                className={inputBaseClass}
                            />
                            <span
                                className={
                                    'absolute right-10 text-xs font-medium pointer-events-none ' +
                                    (darkMode ? 'text-slate-500' : 'text-slate-400')
                                }
                            >
                                {weekdayLabel}
                            </span>
                        </div>
                    </div>

                    {/* Symbol */}
                    <div className="md:col-span-5 relative">
                        <label className={labelClass}>Symbol</label>
                        <input
                            type="text"
                            name="symbol"
                            placeholder="e.g. AAPL"
                            value={form.symbol}
                            onChange={handleSymbolChange}
                            onFocus={() => {
                                if (!form.symbol.trim()) {
                                    const recent = Array.from(
                                        new Set(
                                            baseTrades
                                                .slice(0, 50)
                                                .map((t) => t.symbol)
                                                .filter(Boolean)
                                        )
                                    ).slice(0, 5);
                                    setSymbolSuggestions(recent);
                                    setShowSymbolSuggestions(recent.length > 0);
                                }
                            }}
                            className={inputBaseClass + ' uppercase'}
                            autoComplete="off"
                        />
                        {showSymbolSuggestions && symbolSuggestions.length > 0 && (
                            <div
                                className={
                                    'absolute z-10 top-full left-0 mt-1 w-full rounded-xl shadow-lg border p-2 ' +
                                    (darkMode
                                        ? 'bg-slate-800 border-slate-700'
                                        : 'bg-white border-slate-100')
                                }
                            >
                                <div className="flex flex-wrap gap-2">
                                    {symbolSuggestions.map((sym) => (
                                        <button
                                            key={sym}
                                            type="button"
                                            onClick={() => {
                                                setForm((prev) => ({ ...prev, symbol: sym }));
                                                setSymbolSuggestions([]);
                                                setShowSymbolSuggestions(false);
                                            }}
                                            className={
                                                'px-3 py-1 text-xs font-medium rounded-full transition-colors ' +
                                                (darkMode
                                                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700')
                                            }
                                        >
                                            {sym}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Side */}
                    <div className="md:col-span-3">
                        <label className={labelClass}>Side</label>
                        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, side: 'BUY' }))}
                                className={'flex-1 py-2 text-xs font-bold transition-all ' + (form.side === 'BUY' ? 'bg-red-500 text-white shadow-inner' : (darkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-50 text-slate-500 hover:text-slate-800'))}
                            >
                                BUY
                            </button>
                            <div className="w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                            <button
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, side: 'SELL' }))}
                                className={'flex-1 py-2 text-xs font-bold transition-all ' + (form.side === 'SELL' ? 'bg-blue-500 text-white shadow-inner' : (darkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-50 text-slate-500 hover:text-slate-800'))}
                            >
                                SELL
                            </button>
                        </div>
                    </div>
                </div>

                {/* Row 2: Price & Quantity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>Price</label>
                        <input
                            type="number"
                            inputMode="decimal"
                            name="price"
                            placeholder="0.00"
                            value={form.price}
                            onChange={handleChange}
                            className={inputBaseClass + ' text-right font-mono'}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Quantity</label>
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

                {/* Row 3: Tags & Memo */}
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Tags</label>
                        <input
                            type="text"
                            name="tags"
                            placeholder="strategy, mistake, setup..."
                            value={form.tags}
                            onChange={handleChange}
                            className={inputBaseClass}
                        />
                        {allTags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 animate-fade-in">
                                {allTags.slice(0, 6).map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => toggleFormTag(tag)}
                                        className={
                                            'px-2.5 py-1 text-[10px] font-medium rounded-md border transition-all ' +
                                            (parseTagString(form.tags).map(t => t.toLowerCase()).includes(tag.toLowerCase())
                                                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                                                : 'bg-transparent border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400')
                                        }
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="md:col-span-2">
                            <label className={labelClass}>Memo</label>
                            <textarea
                                name="memo"
                                placeholder="Write your thoughts..."
                                value={form.memo}
                                onChange={handleChange}
                                className={inputBaseClass + ' min-h-[80px] resize-none'}
                            />
                        </div>

                        <div className="md:col-span-1">
                            <label className={labelClass}>Chart Image</label>
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
                                    className={
                                        'w-full h-[80px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ' +
                                        (darkMode
                                            ? 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')
                                    }
                                >
                                    <span className="text-xl text-slate-400">📷</span>
                                    <span className="text-[10px] text-slate-400">Upload Image</span>
                                </button>
                            ) : (
                                <div className="relative group w-full h-[80px] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border dark:border-slate-700">
                                    <img src={chartPreview} alt="Chart" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setChartFile(null);
                                            setChartPreview(null);
                                            if (chartInputRef.current) chartInputRef.current.value = '';
                                        }}
                                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={
                        'w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98] ' +
                        (isSubmitting
                            ? 'bg-slate-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500')
                    }
                >
                    {isSubmitting ? 'Saving...' : 'Add Trade Log'}
                </button>
            </form>
        </div>
    );
}
