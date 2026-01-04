'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Trade, TradeSide } from '@/app/types/trade';
import { Strategy, EmotionTag, EMOTION_TAG_LABELS } from '@/app/types/strategies';
import { getCurrencySymbol } from '@/app/utils/format';
import { X, Save, Calendar, Tag, DollarSign, Hash, FileText, Zap, ChevronDown } from 'lucide-react';

interface EditTradeFormProps {
    trade: Trade;
    darkMode: boolean;
    strategies: Strategy[];
    onSave: (id: string, data: Trade) => Promise<void>;
    onCancel: () => void;
}

export function EditTradeForm({
    trade,
    darkMode,
    strategies,
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
        strategy_id: trade.strategy_id || '',
        emotion_tag: (trade.emotion_tag as EmotionTag) || '',
        entry_reason: trade.entry_reason || '',
        exit_reason: trade.exit_reason || '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(!!(trade.entry_reason || trade.exit_reason));

    useEffect(() => {
        setForm({
            date: trade.date,
            symbol: trade.symbol,
            side: trade.side,
            price: trade.price,
            quantity: trade.quantity,
            memo: trade.memo || '',
            tags: Array.isArray(trade.tags) ? trade.tags.join(', ') : trade.tags || '',
            strategy_id: trade.strategy_id || '',
            emotion_tag: (trade.emotion_tag as EmotionTag) || '',
            entry_reason: trade.entry_reason || '',
            exit_reason: trade.exit_reason || '',
        });
        setShowAdvanced(!!(trade.entry_reason || trade.exit_reason));
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

            const selectedStrategy = strategies.find(s => s.id === form.strategy_id);

            const updatedTrade: Trade = {
                ...trade,
                date: form.date,
                symbol: form.symbol,
                side: form.side,
                price: Number(form.price),
                quantity: Number(form.quantity),
                memo: form.memo,
                tags: tags,
                strategy_id: form.strategy_id || undefined,
                strategy_name: selectedStrategy?.name || undefined,
                emotion_tag: form.emotion_tag || undefined,
                entry_reason: form.entry_reason || undefined,
                exit_reason: form.exit_reason || undefined,
            };

            await onSave(trade.id, updatedTrade);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputBaseClass =
        `w-full px-4 py-3 text-sm font-medium rounded-xl outline-none transition-all ` +
        (darkMode
            ? 'bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-700 focus:ring-1 focus:ring-slate-600'
            : 'bg-slate-100 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:text-slate-900');

    const labelClass = `flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'
        }`;

    return (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
                <div className={`flex-none flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'
                    }`}>
                    <div>
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            매매 기록 수정
                        </h2>
                        <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {trade.symbol_name || trade.symbol} · {trade.date}
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
                    <div className="p-6 space-y-4">
                        {/* Row 1: Date & Side */}
                        <div className="grid grid-cols-12 gap-3 items-end">
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
                                <label className={labelClass}>구분</label>
                                <div className={(darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200') + ' border p-1 rounded-xl flex h-[46px]'}>
                                    <button
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, side: 'BUY' as TradeSide }))}
                                        className={'flex-1 rounded-lg text-xs font-bold transition-all ' + (form.side === 'BUY' ? 'bg-rose-500 text-white shadow-sm' : (darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'))}
                                    >
                                        매수
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, side: 'SELL' as TradeSide }))}
                                        className={'flex-1 rounded-lg text-xs font-bold transition-all ' + (form.side === 'SELL' ? 'bg-blue-500 text-white shadow-sm' : (darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'))}
                                    >
                                        매도
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Symbol (Read Only) */}
                        <div>
                            <label className={labelClass}>종목명</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={trade.symbol_name || trade.symbol}
                                    readOnly
                                    className={inputBaseClass + ' font-bold pr-24 ' + (darkMode ? 'bg-slate-800/50 text-slate-300 cursor-not-allowed' : 'bg-slate-100/50 text-slate-600 cursor-not-allowed')}
                                />
                                <span className={'absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono pointer-events-none ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                                    {trade.symbol}
                                </span>
                            </div>
                        </div>

                        {/* Row 3: Price & Quantity */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>
                                    단가 {form.symbol && <span className={darkMode ? 'text-indigo-400' : 'text-indigo-600'}>({getCurrencySymbol(form.symbol)})</span>}
                                </label>
                                <div className="relative">
                                    {/* 미국 주식: $ 앞에 표시 */}
                                    {getCurrencySymbol(form.symbol) === '$' && (
                                        <span className={'absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold ' + (darkMode ? 'text-indigo-400' : 'text-indigo-500')}>
                                            $
                                        </span>
                                    )}
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        name="price"
                                        value={form.price}
                                        onChange={handleChange}
                                        className={inputBaseClass + ' font-mono text-right ' + (getCurrencySymbol(form.symbol) === '$' ? 'pl-10' : '') + (getCurrencySymbol(form.symbol) === '원' ? ' pr-14' : '')}
                                    />
                                    {/* 한국 주식: 원 뒤에 표시 */}
                                    {getCurrencySymbol(form.symbol) === '원' && (
                                        <span className={'absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold ' + (darkMode ? 'text-indigo-400' : 'text-indigo-500')}>
                                            원
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>수량</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    name="quantity"
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
                                value={form.tags}
                                onChange={handleChange}
                                className={inputBaseClass}
                                placeholder="쉼표로 구분 (예: 스윙, 단타)"
                            />
                        </div>

                        {/* Strategy & Emotion */}
                        {strategies.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>
                                        <Zap size={10} className="inline mr-1" />
                                        전략
                                    </label>
                                    <select
                                        name="strategy_id"
                                        value={form.strategy_id}
                                        onChange={handleChange}
                                        className={inputBaseClass + ' cursor-pointer'}
                                    >
                                        <option value="">선택 (선택사항)</option>
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
                                        className={inputBaseClass + ' cursor-pointer'}
                                    >
                                        <option value="">선택 (선택사항)</option>
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
                                className={'flex items-center gap-1.5 text-xs font-bold transition-colors ' + (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800')}
                            >
                                <ChevronDown size={14} className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                                {showAdvanced ? '간단히 보기' : '복기 메모 추가'}
                            </button>
                        )}

                        {/* Advanced Options (Reasons) */}
                        {showAdvanced && (
                            <div className="space-y-3 pt-1 animate-fade-in-down">
                                <div>
                                    <label className={labelClass}>진입 이유</label>
                                    <textarea
                                        name="entry_reason"
                                        placeholder="왜 이 시점에 진입했는가?"
                                        value={form.entry_reason}
                                        onChange={handleChange}
                                        className={inputBaseClass + ' min-h-[80px] resize-none leading-relaxed'}
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>청산 이유</label>
                                    <textarea
                                        name="exit_reason"
                                        placeholder="왜 이 시점에 청산했는가? (매도 시 기록)"
                                        value={form.exit_reason}
                                        onChange={handleChange}
                                        className={inputBaseClass + ' min-h-[80px] resize-none leading-relaxed'}
                                        rows={3}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Memo */}
                        <div>
                            <label className={labelClass}>메모</label>
                            <textarea
                                name="memo"
                                value={form.memo}
                                onChange={handleChange}
                                className={inputBaseClass + ' resize-none min-h-[100px] leading-relaxed'}
                                placeholder="매매 이유, 복기 내용 등을 기록하세요..."
                                rows={4}
                            />
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className={`flex-none px-6 py-4 border-t ${darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-white/90'
                    } backdrop-blur-sm`}>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${darkMode
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                }`}
                        >
                            취소
                        </button>
                        <button
                            type="button"
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
