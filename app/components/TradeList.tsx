import React, { useMemo, useState } from 'react';
import { Trade } from '@/app/types/trade';
import { User } from '@supabase/supabase-js';
import { formatMonthLabel, formatNumber, getKoreanWeekdayLabel } from '@/app/utils/format';

interface TradeListProps {
    trades: Trade[];
    currentUser: User | null;
    onDelete: (id: string) => void;
    onEdit: (trade: Trade) => void;
    openMonths: Record<string, boolean>;
    toggleMonth: (key: string) => void;
    darkMode: boolean;
}

export function TradeList({
    trades,
    currentUser,
    onDelete,
    onEdit,
    openMonths,
    toggleMonth,
    darkMode,
}: TradeListProps) {
    // Group by Month
    const monthGroups = useMemo(() => {
        if (trades.length === 0) return [];

        const sorted = [...trades].sort((a, b) => {
            if (a.date === b.date) return b.id.localeCompare(a.id);
            return b.date.localeCompare(a.date);
        });

        const map = new Map<string, Trade[]>();

        for (const t of sorted) {
            const key = t.date && t.date.length >= 7 ? t.date.slice(0, 7) : 'Other';
            const list = map.get(key) ?? [];
            list.push(t);
            map.set(key, list);
        }

        const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

        return keys.map((key) => ({
            key,
            label: formatMonthLabel(key),
            trades: map.get(key)!,
            count: map.get(key)!.length,
        }));
    }, [trades]);

    if (trades.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-3">
                    <span className="text-2xl">📝</span>
                </div>
                <p className="text-slate-500 font-medium">No trades recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {monthGroups.map((group) => {
                const isOpen = openMonths[group.key] ?? true;

                return (
                    <div
                        key={group.key}
                        className={
                            'rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ' +
                            (darkMode
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200 shadow-slate-200/50')
                        }
                    >
                        {/* Month Header */}
                        <div
                            onClick={() => toggleMonth(group.key)}
                            className={
                                'flex items-center justify-between px-5 py-4 cursor-pointer select-none transition-colors ' +
                                (darkMode
                                    ? 'bg-slate-800/40 hover:bg-slate-800/80'
                                    : 'bg-slate-50/50 hover:bg-slate-50')
                            }
                        >
                            <div className="flex items-center gap-3">
                                <h3 className={'text-base font-bold ' + (darkMode ? 'text-slate-100' : 'text-slate-800')}>
                                    {group.label}
                                </h3>
                                <span className={'px-2 py-0.5 rounded-full text-[10px] font-semibold ' + (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white border border-slate-200 text-slate-500')}>
                                    {group.count} Trades
                                </span>
                            </div>
                            <div className={'transition-transform duration-200 ' + (isOpen ? 'rotate-180' : 'rotate-0')}>
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {isOpen && (
                            <div>
                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className={'text-xs uppercase font-semibold text-slate-500 ' + (darkMode ? 'bg-slate-900/50 border-b border-slate-800' : 'bg-slate-50 border-b border-slate-100')}>
                                            <tr>
                                                <th className="px-5 py-3 w-32">Date</th>
                                                <th className="px-4 py-3">Symbol</th>
                                                <th className="px-4 py-3">Side</th>
                                                <th className="px-4 py-3 text-right">Price</th>
                                                <th className="px-4 py-3 text-right">Qty</th>
                                                <th className="px-4 py-3 text-right">Amount</th>
                                                <th className="px-4 py-3">Tags & Memo</th>
                                                <th className="px-4 py-3 w-24 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {group.trades.map((t) => {
                                                const amount = t.price * t.quantity;
                                                const dayOfWeek = getKoreanWeekdayLabel(t.date);

                                                return (
                                                    <tr key={t.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="px-5 py-3">
                                                            <div className="font-medium text-slate-700 dark:text-slate-300">{t.date.slice(5)}</div>
                                                            <div className="text-xs text-slate-400">{dayOfWeek}</div>
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                                                            {t.symbol}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={'px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase border ' + (t.side === 'BUY' ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-900/30 dark:text-rose-400' : 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-400')}>
                                                                {t.side}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                                                            {formatNumber(t.price)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                                                            {formatNumber(t.quantity)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                                                            {formatNumber(amount)}
                                                        </td>
                                                        <td className="px-4 py-3 max-w-[200px]">
                                                            <div className="flex flex-col gap-1">
                                                                {t.tags && t.tags.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {t.tags.map((tag) => (
                                                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded border border-slate-200 dark:border-slate-700">
                                                                                #{tag}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {t.memo && <div className="text-xs text-slate-400 truncate" title={t.memo}>{t.memo}</div>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => onEdit(t)}
                                                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => onDelete(t.id)}
                                                                    className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                                    {group.trades.map((t) => {
                                        const amount = t.price * t.quantity;
                                        const dayOfWeek = getKoreanWeekdayLabel(t.date);

                                        return (
                                            <div key={t.id} className="p-4 flex flex-col gap-3 relative">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className={'w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold border shadow-sm ' + (t.side === 'BUY' ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400' : 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400')}>
                                                            {t.side === 'BUY' ? 'B' : 'S'}
                                                        </span>
                                                        <div>
                                                            <div className="font-bold text-base flex items-center gap-2">
                                                                {t.symbol}
                                                                {t.image && <span className="text-[10px] opacity-70">📷</span>}
                                                            </div>
                                                            <div className="text-xs text-slate-400">{t.date} · {dayOfWeek}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-sm">{formatNumber(amount)}</div>
                                                        <div className="text-xs text-slate-500">{formatNumber(t.price)} × {t.quantity}</div>
                                                    </div>
                                                </div>

                                                {(t.tags && t.tags.length > 0) || t.memo ? (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                                                        {t.tags && t.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {t.tags.map((tag) => (
                                                                    <span key={tag} className="text-[10px] font-medium text-slate-500">#{tag}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {t.memo && <div className="leading-relaxed">{t.memo}</div>}
                                                    </div>
                                                ) : null}

                                                <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-50 dark:border-slate-800/50 mt-1">
                                                    <button
                                                        onClick={() => onEdit(t)}
                                                        className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => onDelete(t.id)}
                                                        className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 px-2 py-1"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
