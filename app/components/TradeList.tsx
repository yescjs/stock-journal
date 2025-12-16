import React, { useMemo, useState } from 'react';
import { Trade } from '@/app/types/trade';
import { User } from '@supabase/supabase-js';
import { formatMonthLabel, formatNumber, getKoreanWeekdayLabel } from '@/app/utils/format';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TradeListProps {
    trades: Trade[];
    currentUser: User | null;
    onDelete: (id: string) => void;
    onEdit: (trade: Trade) => void;
    openMonths: Record<string, boolean>;
    toggleMonth: (key: string) => void;
    darkMode: boolean;
    tagColors?: Record<string, string>;
    onSymbolClick?: (symbol: string) => void;
    onImagePreview?: (imageUrl: string) => void;
}

export function TradeList({
    trades,
    currentUser,
    onDelete,
    onEdit,
    openMonths,
    toggleMonth,
    darkMode,
    tagColors = {},
    onSymbolClick,
    onImagePreview,
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
            <div className={'flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed ' + (darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200')}>
                <div className={'p-4 rounded-full mb-3 ' + (darkMode ? 'bg-slate-800' : 'bg-slate-100')}>
                    <span className="text-2xl">📝</span>
                </div>
                <p className="text-slate-500 font-medium">아직 작성된 매매 일지가 없습니다.</p>
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
                                    {group.count}건
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
                                    <table className="w-full text-sm text-left table-fixed">
                                        <thead className={'text-xs uppercase border-b ' + (darkMode ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-indigo-50 text-indigo-900 border-indigo-100')}>
                                            <tr>
                                                <th scope="col" className="px-5 py-3 w-36 font-bold">날짜</th>
                                                <th scope="col" className="px-4 py-3 w-20 font-bold">구분</th>
                                                <th scope="col" className="px-4 py-3 font-bold">종목</th>
                                                <th scope="col" className="px-4 py-3 text-right w-28 font-bold">단가</th>
                                                <th scope="col" className="px-4 py-3 text-right w-20 font-bold">수량</th>
                                                <th scope="col" className="px-4 py-3 text-right w-28 font-bold">총액</th>
                                                <th scope="col" className="px-4 py-3 w-auto min-w-[150px] font-bold">태그</th>
                                                <th scope="col" className="px-4 py-3 text-center w-20 font-bold">편집</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.trades.map((t) => {
                                                const dateObj = new Date(t.date);
                                                const dayOfWeek = isNaN(dateObj.getTime()) ? '' : new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(dateObj);

                                                return (
                                                    <tr key={t.id} className={'group transition-colors border-b last:border-0 ' + (darkMode ? 'hover:bg-slate-800/40 border-slate-800/50' : 'hover:bg-slate-50 border-slate-100')}>
                                                        <td className="px-5 py-4 whitespace-nowrap">
                                                            <div className={'font-bold font-mono tracking-tight text-[13px] ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>{t.date}</div>
                                                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">{dayOfWeek}</div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className={'px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border ' + (t.side === 'BUY' ? (darkMode ? 'bg-rose-900/20 border-rose-900/30 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-700') : (darkMode ? 'bg-blue-900/20 border-blue-900/30 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'))}>
                                                                    {t.side === 'BUY' ? '매수' : '매도'}
                                                                </span>
                                                                {t.image && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onImagePreview?.(t.image!); }}
                                                                        className="text-sm hover:scale-110 transition-all cursor-pointer"
                                                                        title="이미지 보기"
                                                                    >
                                                                        📷
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className={'px-4 py-4 font-bold ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onSymbolClick?.(t.symbol); }}
                                                                className={'transition-colors text-left font-display ' + (darkMode ? 'hover:text-blue-400' : 'hover:text-blue-600')}
                                                            >
                                                                {t.symbol}
                                                            </button>
                                                        </td>
                                                        <td className={'px-4 py-4 text-right font-mono ' + (darkMode ? 'text-slate-300' : 'text-slate-600')}>
                                                            {formatNumber(t.price)}
                                                        </td>
                                                        <td className={'px-4 py-4 text-right font-mono ' + (darkMode ? 'text-slate-300' : 'text-slate-600')}>
                                                            {formatNumber(t.quantity)}
                                                        </td>
                                                        <td className={'px-4 py-4 text-right font-mono font-medium ' + (darkMode ? 'text-slate-200' : 'text-slate-800')}>
                                                            {formatNumber(t.price * t.quantity)}
                                                        </td>
                                                        <td className="px-4 py-4 max-w-[200px]">
                                                            <div className="flex flex-col gap-1">
                                                                {t.tags && t.tags.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {t.tags.map((tag) => (
                                                                            <span
                                                                                key={tag}
                                                                                className="text-[10px] px-1.5 py-0.5 rounded border border-transparent text-white shadow-sm font-medium"
                                                                                style={{ backgroundColor: tagColors[tag] || '#64748b' }}
                                                                            >
                                                                                #{tag}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {t.memo && (
                                                                    <div className="text-xs text-slate-500 markdown-preview line-clamp-2">
                                                                        {t.memo}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => onEdit(t)}
                                                                    className={'p-1.5 rounded text-slate-500 transition-colors ' + (darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200')}
                                                                    title="Edit"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onClick={() => onDelete(t.id)}
                                                                    className={'p-1.5 rounded text-rose-500 transition-colors ' + (darkMode ? 'hover:bg-rose-900/40' : 'hover:bg-rose-100')}
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
                                <div className={'md:hidden divide-y ' + (darkMode ? 'divide-slate-800' : 'divide-slate-100')}>
                                    {group.trades.map((t) => {
                                        const amount = t.price * t.quantity;
                                        const dayOfWeek = getKoreanWeekdayLabel(t.date);

                                        return (
                                            <div key={t.id} className="p-4 flex flex-col gap-3 relative">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={'w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold border shadow-sm ' + (t.side === 'BUY' ? (darkMode ? 'bg-rose-900/20 border-rose-800 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-600') : (darkMode ? 'bg-blue-900/20 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'))}>
                                                                {t.side === 'BUY' ? '매수' : '매도'}
                                                            </span>
                                                            {t.image && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onImagePreview?.(t.image!); }}
                                                                    className="text-sm hover:scale-110 transition-all cursor-pointer"
                                                                    title="이미지 보기"
                                                                >
                                                                    📷
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-base">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onSymbolClick?.(t.symbol); }}
                                                                    className={'transition-colors ' + (darkMode ? 'hover:text-blue-400' : 'hover:text-blue-600')}
                                                                >
                                                                    {t.symbol}
                                                                </button>
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
                                                    <div className={'rounded-lg p-2.5 text-xs space-y-1.5 ' + (darkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-600')}>
                                                        {t.tags && t.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {t.tags.map((tag) => (
                                                                    <span
                                                                        key={tag}
                                                                        className="text-[10px] font-medium px-1.5 py-0.5 rounded text-white shadow-sm"
                                                                        style={{ backgroundColor: tagColors[tag] || '#64748b' }}
                                                                    >
                                                                        #{tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {t.memo && (
                                                            <div className={'prose prose-sm max-w-none text-xs leading-relaxed ' + (darkMode ? 'prose-invert' : '')}>
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                    {t.memo}
                                                                </ReactMarkdown>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}

                                                <div className={'flex items-center justify-end gap-3 pt-1 border-t mt-1 ' + (darkMode ? 'border-slate-800/50' : 'border-slate-50')}>
                                                    <button
                                                        onClick={() => onEdit(t)}
                                                        className={'flex items-center gap-1 text-xs font-medium px-2 py-1 ' + (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')}
                                                    >
                                                        수정
                                                    </button>
                                                    <button
                                                        onClick={() => onDelete(t.id)}
                                                        className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 px-2 py-1"
                                                    >
                                                        삭제
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
