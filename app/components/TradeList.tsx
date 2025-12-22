import React, { useMemo } from 'react';
import { Trade } from '@/app/types/trade';
import { User } from '@supabase/supabase-js';
import { formatMonthLabel, formatNumber, formatQuantity, formatPrice, getCurrencySymbol, getKoreanWeekdayLabel } from '@/app/utils/format';
import { EMOTION_TAG_LABELS, EMOTION_TAG_COLORS } from '@/app/types/strategies';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Pencil, Trash2, Camera, ChevronDown, Zap, Calendar, TrendingUp, TrendingDown, Clock, Hash } from 'lucide-react';

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
        if (showConverted) return formatPrice(price * exchangeRate, 'KRW');
        return formatPrice(price, symbol);
    };

    if (trades.length === 0) {
        return (
            <div className={`
                flex flex-col items-center justify-center py-24 rounded-3xl border-2 border-dashed transition-colors
                ${darkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-slate-50/50 border-slate-200'}
            `}>
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-sm ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <span className="text-4xl">📝</span>
                </div>
                <h3 className={`font-bold text-xl mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>아직 작성된 매매 일지가 없습니다</h3>
                <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    우측의 '일지 작성' 버튼을 눌러 첫 기록을 남겨보세요!
                </p>
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
                        className={`
                            rounded-3xl border overflow-hidden transition-all duration-300 glass-card
                            ${darkMode 
                                ? 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-900/50' 
                                : 'bg-white/60 border-white/60 shadow-sm hover:shadow-lg hover:bg-white/80'}
                        `}
                    >
                        {/* Month Header */}
                        <div
                            onClick={() => toggleMonth(group.key)}
                            className={`
                                flex items-center justify-between px-6 py-5 cursor-pointer select-none transition-all duration-200
                                ${darkMode
                                    ? 'bg-slate-800/30 hover:bg-slate-800/50'
                                    : 'bg-indigo-50/30 hover:bg-indigo-50/60'}
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`
                                    w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner
                                    ${darkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white text-indigo-600 shadow-indigo-100'}
                                `}>
                                    <Calendar size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                        {group.label}
                                    </h3>
                                    <span className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                        총 {group.count}건의 매매 기록
                                    </span>
                                </div>
                            </div>
                            <div className={`
                                p-2.5 rounded-xl transition-all duration-300
                                ${isOpen ? 'rotate-180' : 'rotate-0'}
                                ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'}
                            `}>
                                <ChevronDown size={18} strokeWidth={2.5} />
                            </div>
                        </div>

                        {isOpen && (
                            <div className="animate-fade-in">
                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className={`
                                            text-xs font-bold uppercase tracking-wider border-b
                                            ${darkMode ? 'bg-slate-900/20 text-slate-500 border-slate-800' : 'bg-slate-50/50 text-slate-500 border-slate-100'}
                                        `}>
                                            <tr>
                                                <th className="px-4 py-3 whitespace-nowrap w-[100px]">날짜</th>
                                                <th className="px-4 py-3 w-[250px]">종목 / 태그</th>
                                                <th className="px-4 py-3 text-right">진입가</th>
                                                <th className="px-4 py-3 text-right">수량</th>
                                                <th className="px-4 py-3 text-right">총액</th>
                                                <th className="px-4 py-3 w-[200px] hidden lg:table-cell">메모</th>
                                                <th className={`px-4 py-3 z-10 sticky right-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] text-center w-[80px] ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>관리</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                            {group.trades.map((t) => {
                                                const dateObj = new Date(t.date);
                                                const dayOfWeek = isNaN(dateObj.getTime()) ? '' : new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(dateObj);
                                                const amount = t.price * t.quantity;

                                                return (
                                                    <tr
                                                        key={t.id}
                                                        onClick={() => onSymbolClick?.(t.symbol)}
                                                        className={`
                                                            group transition-all duration-200 cursor-pointer h-[64px]
                                                            ${darkMode ? 'hover:bg-indigo-900/10' : 'hover:bg-indigo-50/40'}
                                                        `}
                                                    >
                                                        {/* Date */}
                                                        <td className="px-4 py-3">
                                                            <div className={`font-bold tabular-nums text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                                                {t.date.slice(5)} <span className="text-xs font-normal text-slate-500">({dayOfWeek})</span>
                                                            </div>
                                                        </td>

                                                        {/* Symbol & Position & Tags */}
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {/* Position Badge (Merged) */}
                                                                <span className={`
                                                                    px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wide border shadow-sm
                                                                    ${t.side === 'BUY'
                                                                        ? (darkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-white border-rose-100 text-rose-600')
                                                                        : (darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-white border-blue-100 text-blue-600')}
                                                                `}>
                                                                    {t.side === 'BUY' ? '매수' : '매도'}
                                                                </span>
                                                                
                                                                <div className={`font-bold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                                    {t.symbol_name || t.symbol}
                                                                </div>

                                                                {t.image && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onImagePreview?.(t.image!); }}
                                                                        className={`p-1 rounded transition-colors ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                                                                    >
                                                                        <Camera size={12} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-wrap gap-1">
                                                                {t.strategy_name && (
                                                                    <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded font-bold ${darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600'}`}>
                                                                        <Zap size={8} fill="currentColor" /> {t.strategy_name}
                                                                    </span>
                                                                )}
                                                                {t.tags?.slice(0, 2).map(tag => (
                                                                    <span 
                                                                        key={tag} 
                                                                        className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white opacity-90"
                                                                        style={{ backgroundColor: tagColors[tag] || '#94a3b8' }}
                                                                    >
                                                                        #{tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>

                                                        {/* Price */}
                                                        <td className={`px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                            {displayPrice(t.price, t.symbol)}
                                                        </td>

                                                        {/* Quantity */}
                                                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                            {formatQuantity(t.quantity, t.symbol)}
                                                        </td>

                                                        {/* Total */}
                                                        <td className={`px-4 py-3 text-right font-black tabular-nums whitespace-nowrap ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                            {displayPrice(amount, t.symbol)}
                                                        </td>

                                                        {/* Memo (Hidden on smaller screens, can use responsive utilities or hidden) */}
                                                        <td className="px-4 py-3 hidden lg:table-cell">
                                                            {t.memo ? (
                                                                <div className={`text-xs line-clamp-2 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                    {t.memo}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] opacity-30 italic">메모 없음</span>
                                                            )}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className={`px-4 py-3 sticky right-0 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] ${darkMode ? 'bg-slate-900/95 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm'}`}>
                                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                                                                    className={`p-1.5 rounded-lg transition-all ${darkMode ? 'bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-400' : 'bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-500'}`}
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                                                                    className={`p-1.5 rounded-lg transition-all ${darkMode ? 'bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400' : 'bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-500'}`}
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
                                <div className={`md:hidden p-4 space-y-4`}>
                                    {group.trades.map((t) => {
                                        const amount = t.price * t.quantity;
                                        const dayOfWeek = getKoreanWeekdayLabel(t.date);

                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => onSymbolClick?.(t.symbol)}
                                                className={`
                                                    p-5 rounded-2xl border flex flex-col gap-4 transition-all active:scale-95
                                                    ${darkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-100 shadow-sm'}
                                                `}
                                            >
                                                {/* Header: Type, Stock, Price */}
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`
                                                            w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black
                                                            ${t.side === 'BUY'
                                                                ? (darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600')
                                                                : (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600')}
                                                        `}>
                                                            {t.side === 'BUY' ? 'L' : 'S'}
                                                        </div>
                                                        <div>
                                                            <div className={`font-black text-lg ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                                                {t.symbol_name || t.symbol}
                                                            </div>
                                                            <div className={`text-xs font-medium flex items-center gap-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                {t.date} <span className="w-1 h-1 rounded-full bg-current opacity-50" /> {dayOfWeek}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`font-black text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>{displayPrice(amount, t.symbol)}</div>
                                                        <div className={`text-xs font-medium ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                                            {displayPrice(t.price, t.symbol)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Tags & Reasons */}
                                                {(t.tags?.length || t.strategy_name || t.entry_reason || t.exit_reason) ? (
                                                    <div className={`p-4 rounded-xl space-y-3 ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                                        <div className="flex flex-wrap gap-2">
                                                            {t.strategy_name && (
                                                                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-bold ${darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                                                                    <Zap size={10} /> {t.strategy_name}
                                                                </span>
                                                            )}
                                                            {t.tags?.map(tag => (
                                                                <span
                                                                    key={tag}
                                                                    className="text-[10px] px-2 py-1 rounded-md font-bold text-white shadow-sm"
                                                                    style={{ backgroundColor: tagColors[tag] || '#6366f1' }}
                                                                >
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        
                                                        {(t.entry_reason || t.exit_reason) && (
                                                             <div className="flex flex-col gap-2 pt-1">
                                                                {t.entry_reason && (
                                                                    <div className="flex gap-2">
                                                                        <span className="text-[10px] font-black text-slate-400 min-w-[30px] uppercase mt-0.5">In</span>
                                                                        <span className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t.entry_reason}</span>
                                                                    </div>
                                                                )}
                                                                {t.exit_reason && (
                                                                    <div className="flex gap-2">
                                                                        <span className="text-[10px] font-black text-slate-400 min-w-[30px] uppercase mt-0.5">Out</span>
                                                                        <span className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t.exit_reason}</span>
                                                                    </div>
                                                                )}
                                                             </div>
                                                        )}
                                                    </div>
                                                ) : null}

                                                {/* Actions */}
                                                <div className={`flex items-center justify-end gap-3 pt-2 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                                                    {t.image && (
                                                         <button
                                                            onClick={(e) => { e.stopPropagation(); onImagePreview?.(t.image!); }}
                                                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-white border border-slate-200 text-slate-600'}`}
                                                        >
                                                            <Camera size={14} /> 차트
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                                                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all ${darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}
                                                    >
                                                        <Pencil size={14} /> 수정
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                                                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all ${darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600'}`}
                                                    >
                                                        <Trash2 size={14} /> 삭제
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
