'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Trade, TradeSide } from '@/app/types/trade';
import { X, Save, Calendar, Tag, DollarSign, Hash, FileText } from 'lucide-react';

interface EditTradeFormProps {
    trade: Trade;
    darkMode: boolean;
    onSave: (id: string, data: Trade) => Promise<void>;
    onCancel: () => void;
}

export function EditTradeForm({
    trade,
    darkMode,
    onSave,
    onCancel,
}: EditTradeFormProps) {
    const [form, setForm] = useState({
        date: trade.date,
        symbol: trade.symbol,
        side: trade.side,
        price: trade.price,
        quantity: trade.quantity,
        memo: trade.memo || '',
        tags: Array.isArray(trade.tags) ? trade.tags.join(', ') : trade.tags || '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setForm({
            date: trade.date,
            symbol: trade.symbol,
            side: trade.side,
            price: trade.price,
            quantity: trade.quantity,
            memo: trade.memo || '',
            tags: Array.isArray(trade.tags) ? trade.tags.join(', ') : trade.tags || '',
        });
    }, [trade]);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.date || !form.symbol || !form.price || !form.quantity) {
            return;
        }

        setIsSubmitting(true);
        try {
            const tags = form.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);

            const updatedTrade: Trade = {
                ...trade,
                date: form.date,
                symbol: form.symbol,
                side: form.side,
                price: Number(form.price),
                quantity: Number(form.quantity),
                memo: form.memo,
                tags: tags,
            };

            await onSave(trade.id, updatedTrade);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = `w-full px-4 py-3 text-sm font-medium rounded-xl outline-none transition-all ${darkMode
            ? 'bg-slate-800 text-white placeholder-slate-500 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
            : 'bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
        }`;

    const labelClass = `flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'
        }`;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                onClick={onCancel}
            />

            {/* Drawer Panel */}
            <div
                className={`relative w-full max-w-md h-full flex flex-col animate-slide-in-right ${darkMode
                        ? 'bg-slate-900 border-l border-slate-800'
                        : 'bg-white border-l border-slate-200'
                    }`}
            >
                {/* Header */}
                <div className={`flex-none flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                    <div>
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            매매 기록 수정
                        </h2>
                        <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {trade.symbol} · {trade.date}
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className={`p-2 rounded-full transition-colors ${darkMode
                                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                            }`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-5">
                        {/* Date */}
                        <div>
                            <label className={labelClass}>
                                <Calendar size={14} />
                                날짜
                            </label>
                            <input
                                type="date"
                                name="date"
                                value={form.date}
                                onChange={handleChange}
                                className={inputClass}
                            />
                        </div>

                        {/* Symbol */}
                        <div>
                            <label className={labelClass}>
                                <Hash size={14} />
                                종목명
                            </label>
                            <input
                                type="text"
                                name="symbol"
                                value={form.symbol}
                                onChange={handleChange}
                                className={inputClass + ' uppercase font-bold'}
                                placeholder="예: AAPL"
                            />
                        </div>

                        {/* Side Toggle */}
                        <div>
                            <label className={labelClass}>
                                구분
                            </label>
                            <div className={`p-1.5 rounded-xl flex gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'
                                }`}>
                                <button
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, side: 'BUY' as TradeSide }))}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${form.side === 'BUY'
                                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                                            : darkMode
                                                ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                                        }`}
                                >
                                    매수 (BUY)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, side: 'SELL' as TradeSide }))}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${form.side === 'SELL'
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                            : darkMode
                                                ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                                        }`}
                                >
                                    매도 (SELL)
                                </button>
                            </div>
                        </div>

                        {/* Price & Quantity */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>
                                    <DollarSign size={14} />
                                    가격
                                </label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    name="price"
                                    value={form.price}
                                    onChange={handleChange}
                                    className={inputClass + ' text-right font-mono'}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    수량
                                </label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    name="quantity"
                                    value={form.quantity}
                                    onChange={handleChange}
                                    className={inputClass + ' text-right font-mono'}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className={labelClass}>
                                <Tag size={14} />
                                태그
                            </label>
                            <input
                                type="text"
                                name="tags"
                                value={form.tags}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="쉼표로 구분 (예: 스윙, 단타)"
                            />
                        </div>

                        {/* Memo */}
                        <div>
                            <label className={labelClass}>
                                <FileText size={14} />
                                메모
                            </label>
                            <textarea
                                name="memo"
                                value={form.memo}
                                onChange={handleChange}
                                className={inputClass + ' resize-none min-h-[100px]'}
                                placeholder="매매 이유, 복기 내용 등을 기록하세요..."
                                rows={4}
                            />
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className={`flex-none px-6 py-4 border-t ${darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-white/80'
                    } backdrop-blur-sm`}>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${darkMode
                                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                }`}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 ${isSubmitting
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30'
                                }`}
                        >
                            <Save size={16} />
                            {isSubmitting ? '저장 중...' : '수정 완료'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
