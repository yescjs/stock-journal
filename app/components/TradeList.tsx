import React, { useMemo } from 'react';
import { Trade } from '@/app/types/trade';
import { formatMonthLabel, formatQuantity, formatPrice, getKoreanWeekdayLabel } from '@/app/utils/format';
import { Pencil, Trash2, Camera, ChevronDown, Zap, Calendar, ListTodo } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';


interface TradeListProps {
    trades: Trade[];
    onDelete?: (id: string) => void;
    onEdit?: (trade: Trade) => void;
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
            <Card
                variant="default"
                className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border/50"
            >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-muted">
                    <ListTodo className="text-muted-foreground" size={32} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-foreground">아직 작성된 매매 일지가 없습니다</h3>
                <p className="text-sm text-muted-foreground">
                    우측의 &apos;일지 작성&apos; 버튼을 눌러 첫 기록을 남겨보세요!
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {monthGroups.map((group) => {
                const isOpen = openMonths[group.key] ?? true;

                return (
                    <div
                        key={group.key}
                        className="rounded-2xl border border-border/50 overflow-hidden transition-all duration-200 bg-card shadow-toss hover:shadow-toss-md"
                    >
                        {/* Month Header - Toss Style */}
                        <div
                            onClick={() => toggleMonth(group.key)}
                            className="flex items-center justify-between px-5 py-4 cursor-pointer select-none transition-colors duration-150 hover:bg-muted/50 bg-muted/30"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                                    <Calendar size={18} strokeWidth={2} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-foreground">
                                        {group.label}
                                    </h3>
                                    <span className="text-xs font-medium text-muted-foreground">
                                        총 {group.count}건의 매매 기록
                                    </span>
                                </div>
                            </div>
                            <div className={`
                                p-2 rounded-xl transition-transform duration-200 bg-muted text-muted-foreground
                                ${isOpen ? 'rotate-180' : 'rotate-0'}
                            `}>
                                <ChevronDown size={16} strokeWidth={2} />
                            </div>
                        </div>

                        {isOpen && (
                            <div className="animate-in fade-in duration-200">
                                {/* Desktop Table View - Toss Style */}
                                <div className="hidden md:block overflow-x-auto custom-scrollbar" data-testid="trade-list-desktop">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="text-xs font-semibold uppercase tracking-wide border-b border-border/50 bg-muted/20 text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-3 whitespace-nowrap w-[100px]">날짜</th>
                                                <th className="px-4 py-3 w-[250px]">종목 / 태그</th>
                                                <th className="px-4 py-3 text-right">진입가</th>
                                                <th className="px-4 py-3 text-right">수량</th>
                                                <th className="px-4 py-3 text-right">총액</th>
                                                <th className="px-4 py-3 w-[200px] hidden lg:table-cell">메모</th>
                                                {(onDelete || onEdit) && (
                                                    <th className="px-4 py-3 z-10 sticky right-0 text-center w-[80px] bg-card">관리</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {group.trades.map((t) => {
                                                const dateObj = new Date(t.date);
                                                const dayOfWeek = isNaN(dateObj.getTime()) ? '' : new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(dateObj);
                                                const amount = t.price * t.quantity;

                                                return (
                                                    <tr
                                                        key={t.id}
                                                        onClick={() => onSymbolClick?.(t.symbol)}
                                                        className="group transition-colors duration-150 cursor-pointer h-14 hover:bg-muted/30"
                                                    >
                                                        {/* Date */}
                                                        <td className="px-4 py-3">
                                                            <div className="font-semibold tabular-nums text-sm text-foreground">
                                                                {t.date.slice(5)} <span className="text-xs font-normal text-muted-foreground">({dayOfWeek})</span>
                                                            </div>
                                                        </td>

                                                        {/* Symbol & Position & Tags */}
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-start gap-2 mb-1">
                                                                {/* Position Badge - Toss Style */}
                                                                <span className={`
                                                                    mt-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0
                                                                    ${t.side === 'BUY'
                                                                        ? 'bg-color-up/10 text-color-up'
                                                                        : 'bg-color-down/10 text-color-down'}
                                                                `}>
                                                                    {t.side === 'BUY' ? '매수' : '매도'}
                                                                </span>

                                                                <div className="font-semibold text-sm text-foreground">
                                                                    {t.symbol_name || t.symbol}
                                                                </div>

                                                                {t.image && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onImagePreview?.(t.image!); }}
                                                                        className="p-1 rounded-lg transition-colors bg-muted hover:bg-muted/70 text-muted-foreground"
                                                                    >
                                                                        <Camera size={12} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-wrap gap-1">
                                                                {t.strategy_name && (
                                                                    <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded font-bold bg-primary/10 text-primary">
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
                                                        <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap text-foreground">
                                                            {displayPrice(t.price, t.symbol)}
                                                        </td>

                                                        {/* Quantity */}
                                                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                                                            {formatQuantity(t.quantity, t.symbol)}
                                                        </td>

                                                        {/* Total */}
                                                        <td className="px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap text-foreground">
                                                            {displayPrice(amount, t.symbol)}
                                                        </td>

                                                        {/* Memo */}
                                                        <td className="px-4 py-3 hidden lg:table-cell">
                                                            {t.memo ? (
                                                                <div className="text-xs line-clamp-2 leading-relaxed text-muted-foreground">
                                                                    {t.memo}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-muted-foreground/50 italic">메모 없음</span>
                                                            )}
                                                        </td>

                                                        {/* Actions */}
                                                        {(onDelete || onEdit) && (
                                                            <td className="px-4 py-3 sticky right-0 z-10 bg-card/95 backdrop-blur-sm">
                                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                                    {onEdit && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); onEdit?.(t); }}
                                                                            className="p-1.5 rounded-lg transition-colors bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground"
                                                                        >
                                                                            <Pencil size={14} />
                                                                        </button>
                                                                    )}
                                                                    {onDelete && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); onDelete?.(t.id); }}
                                                                            className="p-1.5 rounded-lg transition-colors bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className={`md:hidden p-4 space-y-4`} data-testid="trade-list-mobile">
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
                                                                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                                                        <div className={`
                                                                                                            w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0
                                                                                                            ${t.side === 'BUY'
                                                                                                                ? (darkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600')
                                                                                                                : (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600')}
                                                                                                        `}>
                                                                                                            {t.side === 'BUY' ? 'L' : 'S'}
                                                                                                        </div>
                                                                                                        <div className="min-w-0 flex-1">
                                                                                                            <div className={`font-black text-lg leading-tight truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                                                                                                {t.symbol_name || t.symbol}
                                                                                                            </div>
                                                                                                            <div className={`text-xs font-medium flex items-center gap-1 mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                                                                {t.date} <span className="w-1 h-1 rounded-full bg-current opacity-50" /> {dayOfWeek}    
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="text-right shrink-0 ml-2">                                                        <div className={`font-black text-base ${darkMode ? 'text-foreground' : 'text-slate-900'}`}>{displayPrice(amount, t.symbol)}</div>
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
                                                        onClick={(e) => { e.stopPropagation(); onEdit?.(t); }}
                                                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all ${darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}
                                                    >
                                                        <Pencil size={14} /> 수정
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDelete?.(t.id); }}
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
                        )
                        }
                    </div>
                );
            })}
        </div >
    );
}
