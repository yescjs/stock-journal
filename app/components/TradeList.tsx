import React, { useMemo } from 'react';
import { Trade } from '@/app/types/trade';
import { User } from '@supabase/supabase-js';
import { formatMonthLabel, formatNumber, formatQuantity, formatPrice, getCurrencySymbol, getKoreanWeekdayLabel } from '@/app/utils/format';
import { EMOTION_TAG_LABELS, EMOTION_TAG_COLORS } from '@/app/types/strategies';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Pencil, Trash2, Camera, ChevronDown, Zap } from 'lucide-react';

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
    exchangeRate: number;
    showConverted: boolean;
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
    exchangeRate,
    showConverted,
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

    // Format helper that handles conversion
    const displayPrice = (price: number, symbol: string) => {
        const isKRW = symbol.includes('.KS') || symbol.includes('.KQ') || /^\d+$/.test(symbol);

        if (isKRW) return formatPrice(price, symbol);

        if (showConverted) {
            // Convert USD to KRW
            const converted = price * exchangeRate;
            return formatPrice(converted, 'KRW'); // Pretend it's KRW for formatting
        }

        // Show original USD
        return formatPrice(price, symbol);
    };

    if (trades.length === 0) {
        return (
            <div className={'flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed transition-colors ' + (darkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200')}>
                <div className={'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ' + (darkMode ? 'bg-slate-800' : 'bg-slate-100')}>
                    <span className="text-3xl">📝</span>
                </div>
                <p className={'font-bold text-lg mb-1 ' + (darkMode ? 'text-slate-300' : 'text-slate-700')}>아직 작성된 매매 일지가 없습니다</p>
                <p className={'text-sm ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>우측의 폼에서 첫 매매 기록을 작성해 보세요!</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {monthGroups.map((group) => {
                const isOpen = openMonths[group.key] ?? true;

                return (
                    <div
                        key={group.key}
                        className={
                            'rounded-2xl border overflow-hidden transition-all duration-300 card-hover ' +
                            (darkMode
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200 shadow-sm')
                        }
                    >
                        {/* Month Header */}
                        <div
                            onClick={() => toggleMonth(group.key)}
                            className={
                                'flex items-center justify-between px-5 py-4 cursor-pointer select-none transition-all duration-200 ' +
                                (darkMode
                                    ? 'bg-slate-800/40 hover:bg-slate-800/70'
                                    : 'bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50')
                            }
                        >
                            <div className="flex items-center gap-3">
                                <div className={
                                    'w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ' +
                                    (darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600')
                                }>
                                    📅
                                </div>
                                <div>
                                    <h3 className={'text-base font-bold ' + (darkMode ? 'text-slate-100' : 'text-slate-800')}>
                                        {group.label}
                                    </h3>
                                    <span className={'text-xs font-medium ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                                        {group.count}건의 거래
                                    </span>
                                </div>
                            </div>
                            <div className={'p-2 rounded-lg transition-all duration-200 ' + (isOpen ? 'rotate-180' : 'rotate-0') + ' ' + (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}>
                                <ChevronDown size={16} />
                            </div>
                        </div>

                        {isOpen && (
                            <div>
                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-sm text-left table-fixed">
                                        <colgroup><col className="w-[100px]" /><col className="w-[70px]" /><col className="w-auto" /><col className="w-[100px]" /><col className="w-[60px]" /><col className="w-[110px]" /><col className="w-auto" /><col className="w-[70px]" /></colgroup>
                                        <thead className={
                                            'text-xs uppercase border-b ' +
                                            (darkMode ? 'bg-slate-800/50 text-slate-400 border-slate-800' : 'bg-indigo-50/80 text-indigo-600 border-indigo-100')
                                        }>
                                            <tr>
                                                <th scope="col" className="px-3 py-3 font-bold">날짜</th>
                                                <th scope="col" className="px-2 py-3 font-bold text-center">구분</th>
                                                <th scope="col" className="px-3 py-3 font-bold">종목</th>
                                                <th scope="col" className="px-2 py-3 text-right font-bold">단가</th>
                                                <th scope="col" className="px-2 py-3 text-right font-bold">수량</th>
                                                <th scope="col" className="px-2 py-3 text-right font-bold">총액</th>
                                                <th scope="col" className="px-2 py-3 font-bold">메모</th>
                                                <th scope="col" className="px-2 py-3 text-center font-bold">관리</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.trades.map((t) => {
                                                const dateObj = new Date(t.date);
                                                const dayOfWeek = isNaN(dateObj.getTime()) ? '' : new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(dateObj);

                                                return (
                                                    <tr
                                                        key={t.id}
                                                        onClick={() => onSymbolClick?.(t.symbol)}
                                                        className={'group transition-all duration-200 border-b last:border-0 cursor-pointer ' + (darkMode ? 'hover:bg-slate-800/50 border-slate-800/50' : 'hover:bg-indigo-50/30 border-slate-100')}
                                                    >
                                                        <td className="px-3 py-3 whitespace-nowrap">
                                                            <div className={'font-bold font-mono tracking-tight text-[13px] ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>{t.date}</div>
                                                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">{dayOfWeek}</div>
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className={
                                                                    'px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border ' +
                                                                    (t.side === 'BUY'
                                                                        ? (darkMode ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600')
                                                                        : (darkMode ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'))
                                                                }>
                                                                    {t.side === 'BUY' ? '매수' : '매도'}
                                                                </span>
                                                                {t.image && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onImagePreview?.(t.image!); }}
                                                                        className={'p-1.5 rounded-lg transition-all ' + (darkMode ? 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50')}
                                                                        title="이미지 보기"
                                                                    >
                                                                        <Camera size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className={'px-3 py-3 font-bold ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                                                            {t.symbol_name || t.symbol}
                                                        </td>
                                                        <td className={'px-3 py-3 text-right font-mono tabular-nums whitespace-nowrap ' + (darkMode ? 'text-slate-300' : 'text-slate-600')}>
                                                            {displayPrice(t.price, t.symbol)}
                                                        </td>
                                                        <td className={'px-3 py-3 text-right font-mono tabular-nums ' + (darkMode ? 'text-slate-300' : 'text-slate-600')}>
                                                            {formatQuantity(t.quantity, t.symbol)}
                                                        </td>
                                                        <td className={'px-3 py-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap ' + (darkMode ? 'text-slate-100' : 'text-slate-800')}>
                                                            {displayPrice(t.price * t.quantity, t.symbol)}
                                                        </td>
                                                        <td className="px-3 py-3 max-w-[180px]">
                                                            <div className="flex flex-col gap-1.5">
                                                                {/* Strategy & Emotion badges */}
                                                                {(t.strategy_name || t.emotion_tag) && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {t.strategy_name && (
                                                                            <span className={'inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ' + (darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700')}>
                                                                                <Zap size={8} />
                                                                                {t.strategy_name}
                                                                            </span>
                                                                        )}
                                                                        {t.emotion_tag && (
                                                                            <span
                                                                                className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-white"
                                                                                style={{ backgroundColor: EMOTION_TAG_COLORS[t.emotion_tag as keyof typeof EMOTION_TAG_COLORS] || '#64748b' }}
                                                                            >
                                                                                {EMOTION_TAG_LABELS[t.emotion_tag as keyof typeof EMOTION_TAG_LABELS] || t.emotion_tag}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {t.tags && t.tags.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {t.tags.map((tag) => (
                                                                            <span
                                                                                key={tag}
                                                                                className="text-[10px] px-2 py-0.5 rounded-md text-white shadow-sm font-semibold"
                                                                                style={{ backgroundColor: tagColors[tag] || '#6366f1' }}
                                                                            >
                                                                                #{tag}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {t.memo && (
                                                                    <div className={'text-xs line-clamp-2 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                                                                        {t.memo}
                                                                    </div>
                                                                )}
                                                                {/* Reasons */}
                                                                {(t.entry_reason || t.exit_reason) && (
                                                                    <div className={'space-y-1 pt-1 border-t border-dashed ' + (darkMode ? 'border-slate-800' : 'border-slate-200')}>
                                                                        {t.entry_reason && (
                                                                            <div className="flex gap-1 items-start">
                                                                                <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">IN</span>
                                                                                <span className={'text-[10px] line-clamp-1 ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>{t.entry_reason}</span>
                                                                            </div>
                                                                        )}
                                                                        {t.exit_reason && (
                                                                            <div className="flex gap-1 items-start">
                                                                                <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">OUT</span>
                                                                                <span className={'text-[10px] line-clamp-1 ' + (darkMode ? 'text-slate-400' : 'text-slate-500')}>{t.exit_reason}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                                                                    className={'p-2 rounded-lg transition-all btn-press ' + (darkMode ? 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50')}
                                                                    title="수정"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                                                                    className={'p-2 rounded-lg transition-all btn-press ' + (darkMode ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50')}
                                                                    title="삭제"
                                                                >
                                                                    <Trash2 size={14} />
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
                                            <div
                                                key={t.id}
                                                onClick={() => onSymbolClick?.(t.symbol)}
                                                className={'p-4 flex flex-col gap-3 transition-colors cursor-pointer ' + (darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50')}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className={
                                                                'w-12 h-12 flex items-center justify-center rounded-xl text-xs font-bold border shadow-sm ' +
                                                                (t.side === 'BUY'
                                                                    ? (darkMode ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600')
                                                                    : (darkMode ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'))
                                                            }>
                                                                {t.side === 'BUY' ? '매수' : '매도'}
                                                            </span>
                                                            {t.image && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onImagePreview?.(t.image!); }}
                                                                    className={'text-slate-400 hover:text-indigo-500 transition-colors'}
                                                                    title="이미지 보기"
                                                                >
                                                                    <Camera size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className={'font-bold text-base ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                                                                {t.symbol_name || t.symbol}
                                                            </div>
                                                            <div className={'text-xs font-medium ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>{t.date} · {dayOfWeek}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={'font-bold text-sm ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>{displayPrice(amount, t.symbol)}</div>
                                                        <div className={'text-xs font-medium ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>{displayPrice(t.price, t.symbol)} × {formatQuantity(t.quantity, t.symbol)}</div>
                                                    </div>
                                                </div>

                                                {(t.tags && t.tags.length > 0) || t.memo || t.strategy_name || t.emotion_tag ? (
                                                    <div className={'rounded-xl p-3 text-xs space-y-2 ' + (darkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-600')}>
                                                        {/* Strategy & Emotion badges */}
                                                        {(t.strategy_name || t.emotion_tag) && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {t.strategy_name && (
                                                                    <span className={'inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ' + (darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700')}>
                                                                        <Zap size={8} />
                                                                        {t.strategy_name}
                                                                    </span>
                                                                )}
                                                                {t.emotion_tag && (
                                                                    <span
                                                                        className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-white"
                                                                        style={{ backgroundColor: EMOTION_TAG_COLORS[t.emotion_tag as keyof typeof EMOTION_TAG_COLORS] || '#64748b' }}
                                                                    >
                                                                        {EMOTION_TAG_LABELS[t.emotion_tag as keyof typeof EMOTION_TAG_LABELS] || t.emotion_tag}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {t.tags && t.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {t.tags.map((tag) => (
                                                                    <span
                                                                        key={tag}
                                                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-white shadow-sm"
                                                                        style={{ backgroundColor: tagColors[tag] || '#6366f1' }}
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
                                                        {/* Reasons for Mobile */}
                                                        {(t.entry_reason || t.exit_reason) && (
                                                            <div className={'mt-2 pt-2 border-t border-dashed space-y-2 ' + (darkMode ? 'border-slate-700' : 'border-slate-200')}>
                                                                {t.entry_reason && (
                                                                    <div>
                                                                        <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">진입 이유</div>
                                                                        <div className={'text-xs ' + (darkMode ? 'text-slate-300' : 'text-slate-700')}>{t.entry_reason}</div>
                                                                    </div>
                                                                )}
                                                                {t.exit_reason && (
                                                                    <div>
                                                                        <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">청산 이유</div>
                                                                        <div className={'text-xs ' + (darkMode ? 'text-slate-300' : 'text-slate-700')}>{t.exit_reason}</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}

                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={'flex items-center justify-end gap-2 pt-2 border-t ' + (darkMode ? 'border-slate-800/50' : 'border-slate-100')}
                                                >
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                                                        className={'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ' + (darkMode ? 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50')}
                                                    >
                                                        <Pencil size={12} />
                                                        수정
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                                                        className={'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ' + (darkMode ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50')}
                                                    >
                                                        <Trash2 size={12} />
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
