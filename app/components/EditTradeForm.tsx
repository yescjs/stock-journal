import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Trade, TradeSide } from '@/app/types/trade';

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
        memo: trade.memo,
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
            memo: trade.memo,
            tags: Array.isArray(trade.tags) ? trade.tags.join(', ') : trade.tags || '',
        })
    }, [trade])

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
            alert('필수 항목을 입력해주세요.');
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

    return (
        <div
            className={
                'border rounded-lg p-3 space-y-3 ' +
                (darkMode
                    ? 'border-amber-500/60 bg-slate-900'
                    : 'border-amber-400/60 bg-amber-50')
            }
        >
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                    선택한 기록 수정: {trade.symbol} ({trade.date})
                </span>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                    수정 취소
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs md:text-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-slate-500">날짜</label>
                        <input
                            type="date"
                            name="date"
                            value={form.date}
                            onChange={handleChange}
                            className={
                                'border rounded px-2 py-1 text-xs bg-transparent ' +
                                (darkMode ? 'border-slate-600' : '')
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-slate-500">종목</label>
                        <input
                            type="text"
                            name="symbol"
                            value={form.symbol}
                            onChange={handleChange}
                            className={
                                'border rounded px-2 py-1 text-xs bg-transparent ' +
                                (darkMode ? 'border-slate-600' : '')
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-slate-500">구분</label>
                        <select
                            name="side"
                            value={form.side}
                            onChange={handleChange}
                            className={
                                'border rounded px-2 py-1 text-xs bg-transparent ' +
                                (darkMode ? 'border-slate-600' : '')
                            }
                        >
                            <option value="BUY">매수</option>
                            <option value="SELL">매도</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-slate-500">가격</label>
                        <input
                            type="number"
                            inputMode="numeric"
                            name="price"
                            value={form.price}
                            onChange={handleChange}
                            className={
                                'border rounded px-2 py-1 text-xs text-right bg-transparent ' +
                                (darkMode ? 'border-slate-600' : '')
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-slate-500">수량</label>
                        <input
                            type="number"
                            inputMode="numeric"
                            name="quantity"
                            value={form.quantity}
                            onChange={handleChange}
                            className={
                                'border rounded px-2 py-1 text-xs text-right bg-transparent ' +
                                (darkMode ? 'border-slate-600' : '')
                            }
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-slate-500">태그</label>
                        <input
                            type="text"
                            name="tags"
                            value={form.tags}
                            onChange={handleChange}
                            className={
                                'border rounded px-2 py-1 text-xs bg-transparent ' +
                                (darkMode ? 'border-slate-600' : '')
                            }
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">메모</label>
                    <textarea
                        name="memo"
                        value={form.memo}
                        onChange={handleChange}
                        className={
                            'border rounded px-2 py-1 text-xs bg-transparent resize-none ' +
                            (darkMode ? 'border-slate-600' : '')
                        }
                        rows={2}
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-xs rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={
                            'px-4 py-2 text-xs rounded font-semibold text-white ' +
                            (isSubmitting
                                ? 'bg-slate-400'
                                : 'bg-blue-600 hover:bg-blue-700')
                        }
                    >
                        {isSubmitting ? '저장 중...' : '수정 완료'}
                    </button>
                </div>
            </form>
        </div>
    );
}
