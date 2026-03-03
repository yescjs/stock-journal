import React, { useMemo } from 'react';
import { Trade } from '@/app/types/trade';
import { formatMonthLabel, formatQuantity, formatPrice, getKoreanWeekdayLabel } from '@/app/utils/format';
import { Pencil, Trash2, ChevronDown, Calendar, ListTodo, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';


interface TradeListProps {
    trades: Trade[];
    allTrades?: Trade[];  // All trades for calculating avg buy price (used for SELL realized P&L)
    onDelete?: (id: string) => void;
    onEdit?: (trade: Trade) => void;
    openMonths: Record<string, boolean>;
    toggleMonth: (key: string) => void;
    darkMode: boolean;
    onSymbolClick?: (symbol: string) => void;
    exchangeRate: number;
    showConverted: boolean;
    currentPrices?: Record<string, number>;
    heldSymbols?: Set<string>;
}

// Calculate profit/loss percentage
function calcPnlPercent(entryPrice: number, currentPrice: number): number {
    if (entryPrice <= 0) return 0;
    return ((currentPrice - entryPrice) / entryPrice) * 100;
}

// Calculate profit/loss amount
function calcPnlAmount(entryPrice: number, currentPrice: number, quantity: number): number {
    return (currentPrice - entryPrice) * quantity;
}

// Get PnL color class (green = profit, red = loss)
function getPnlColorClass(value: number): string {
    if (value > 0) return 'text-emerald-400';
    if (value < 0) return 'text-red-400';
    return 'text-muted-foreground';
}

// Get PnL background class for badges (green = profit, red = loss)
function getPnlBgClass(value: number): string {
    if (value > 0) return 'bg-emerald-500/10';
    if (value < 0) return 'bg-red-500/10';
    return 'bg-muted';
}

// Format PnL percentage with sign
function formatPnlPercent(pct: number): string {
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
}

// Get PnL icon
function PnlIcon({ value, size = 12 }: { value: number; size?: number }) {
    if (value > 0) return <TrendingUp size={size} />;
    if (value < 0) return <TrendingDown size={size} />;
    return <Minus size={size} />;
}

export function TradeList({
    trades,
    allTrades,
    onDelete,
    onEdit,
    openMonths,
    toggleMonth,
    darkMode,
    onSymbolClick,
    exchangeRate,
    showConverted,
    currentPrices = {},
    heldSymbols,
}: TradeListProps) {
    // Pre-compute avg buy price per symbol for SELL realized P&L
    const avgBuyPriceMap = useMemo(() => {
        const source = allTrades ?? trades;
        const map = new Map<string, { totalQty: number; totalAmount: number }>();
        for (const t of source) {
            if (t.side !== 'BUY') continue;
            const existing = map.get(t.symbol) ?? { totalQty: 0, totalAmount: 0 };
            existing.totalQty += t.quantity;
            existing.totalAmount += t.price * t.quantity;
            map.set(t.symbol, existing);
        }
        const result = new Map<string, number>();
        for (const [symbol, data] of map) {
            result.set(symbol, data.totalQty > 0 ? data.totalAmount / data.totalQty : 0);
        }
        return result;
    }, [allTrades, trades]);

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

    // Check if any BUY trade has a current price available
    const hasCurrentPrices = Object.keys(currentPrices).length > 0;

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
                                                <th className="px-4 py-3 w-[200px]">종목</th>
                                                <th className="px-4 py-3 text-right">진입가</th>
                                                {hasCurrentPrices && (
                                                    <>
                                                        <th className="px-4 py-3 text-right">현재가</th>
                                                        <th className="px-4 py-3 text-right">수익률</th>
                                                        <th className="px-4 py-3 text-right">평가손익</th>
                                                    </>
                                                )}
                                                <th className="px-4 py-3 text-right">수량</th>
                                                <th className="px-4 py-3 text-right">총액</th>
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
                                                const cp = currentPrices[t.symbol];
                                                const isBuy = t.side === 'BUY';
                                                const isSell = t.side === 'SELL';
                                                const hasCp = isBuy && cp !== undefined && cp > 0;
                                                const pnlPct = hasCp ? calcPnlPercent(t.price, cp) : 0;
                                                const pnlAmt = hasCp ? calcPnlAmount(t.price, cp, t.quantity) : 0;

                                                // SELL realized P&L
                                                const avgBuyPrice = avgBuyPriceMap.get(t.symbol) ?? 0;
                                                const hasSellPnl = isSell && avgBuyPrice > 0;
                                                const sellPnlPct = hasSellPnl ? calcPnlPercent(avgBuyPrice, t.price) : 0;
                                                const sellPnlAmt = hasSellPnl ? (t.price - avgBuyPrice) * t.quantity : 0;

                                                return (
                                                    <tr
                                                        key={t.id}
                                                        onClick={() => onSymbolClick?.(t.symbol)}
                                                        className={`group transition-colors duration-150 cursor-pointer h-14 hover:bg-muted/30 border-l-[3px] ${
                                                            t.side === 'BUY'
                                                                ? 'border-l-up bg-up/5'
                                                                : 'border-l-down bg-down/5'
                                                        }`}
                                                    >
                                                        {/* Date */}
                                                        <td className="px-4 py-3">
                                                            <div className="font-semibold tabular-nums text-sm text-foreground">
                                                                {t.date.slice(5)} <span className="text-xs font-normal text-muted-foreground">({dayOfWeek})</span>
                                                            </div>
                                                        </td>

                                                        {/* Symbol & Position */}
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-start gap-2">
                                                                {/* Position Badge */}
                                                                <span className={`
                                                                    mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap shrink-0 border
                                                                    ${t.side === 'BUY'
                                                                        ? 'bg-up/15 text-up border-up/30'
                                                                        : 'bg-down/15 text-down border-down/30'}
                                                                `}>
                                                                    {t.side === 'BUY' ? '매수' : '매도'}
                                                                </span>

                                                                <div className="flex items-center gap-1.5 flex-nowrap">
                                                                    <span className="font-semibold text-sm text-foreground">
                                                                        {t.symbol_name || t.symbol}
                                                                    </span>
                                                                    {heldSymbols?.has(t.symbol) && (
                                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 leading-none whitespace-nowrap self-center shrink-0">
                                                                            보유
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Entry Price */}
                                                        <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap text-foreground">
                                                            {displayPrice(t.price, t.symbol)}
                                                        </td>

                                                        {/* Current Price, PnL%, PnL Amount (only when prices available) */}
                                                        {hasCurrentPrices && (
                                                            <>
                                                                {/* Current Price */}
                                                                <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                                                                    {hasCp ? (
                                                                        <span className="font-semibold text-foreground">
                                                                            {displayPrice(cp, t.symbol)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-xs">—</span>
                                                                    )}
                                                                </td>

                                                                {/* PnL Percentage */}
                                                                <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                                                                    {hasCp ? (
                                                                        <span className={`font-bold text-sm ${getPnlColorClass(pnlPct)}`}>
                                                                            {formatPnlPercent(pnlPct)}
                                                                        </span>
                                                                    ) : hasSellPnl ? (
                                                                        <span className={`font-bold text-sm ${getPnlColorClass(sellPnlPct)}`}>
                                                                            {formatPnlPercent(sellPnlPct)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-xs">—</span>
                                                                    )}
                                                                </td>

                                                                {/* PnL Amount - Green(+) / Red(-) */}
                                                                <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                                                                    {hasCp ? (
                                                                        <span className={`font-bold text-sm ${getPnlColorClass(pnlAmt)}`}>
                                                                            {pnlAmt > 0 ? '+' : ''}{displayPrice(pnlAmt, t.symbol)}
                                                                        </span>
                                                                    ) : hasSellPnl ? (
                                                                        <span className={`font-bold text-sm ${getPnlColorClass(sellPnlAmt)}`}>
                                                                            {sellPnlAmt > 0 ? '+' : ''}{displayPrice(sellPnlAmt, t.symbol)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-xs">—</span>
                                                                    )}
                                                                </td>
                                                            </>
                                                        )}

                                                        {/* Quantity */}
                                                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                                                            {formatQuantity(t.quantity, t.symbol)}
                                                        </td>

                                                        {/* Total */}
                                                        <td className="px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap text-foreground">
                                                            {displayPrice(amount, t.symbol)}
                                                        </td>

                                                        {/* Actions */}
                                                        {(onDelete || onEdit) && (
                                                            <td className="px-4 py-3 sticky right-0 z-10 bg-card/95 backdrop-blur-sm">
                                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 md:max-lg:opacity-100 transition-opacity duration-150">
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
                                        const cp = currentPrices[t.symbol];
                                        const isBuy = t.side === 'BUY';
                                        const isSell = t.side === 'SELL';
                                        const hasCp = isBuy && cp !== undefined && cp > 0;
                                        const pnlPct = hasCp ? calcPnlPercent(t.price, cp) : 0;
                                        const pnlAmt = hasCp ? calcPnlAmount(t.price, cp, t.quantity) : 0;

                                        // SELL realized P&L
                                        const avgBuyPrice = avgBuyPriceMap.get(t.symbol) ?? 0;
                                        const hasSellPnl = isSell && avgBuyPrice > 0;
                                        const sellPnlPct = hasSellPnl ? calcPnlPercent(avgBuyPrice, t.price) : 0;
                                        const sellPnlAmt = hasSellPnl ? (t.price - avgBuyPrice) * t.quantity : 0;

                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => onSymbolClick?.(t.symbol)}
                                                className={`p-5 rounded-3xl border border-border/10 shadow-toss flex flex-col gap-4 transition-all active:scale-[0.98] border-l-4 ${
                                                    t.side === 'BUY'
                                                        ? 'border-l-up bg-up/5'
                                                        : 'border-l-down bg-down/5'
                                                }`}
                                            >
                                                {/* Header: Type, Stock, Price */}
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className={`
                                                            w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-extrabold shrink-0 border
                                                            ${t.side === 'BUY'
                                                                ? 'bg-up/15 text-up border-up/30'
                                                                : 'bg-down/15 text-down border-down/30'}
                                                        `}>
                                                            {t.side === 'BUY' ? '매수' : '매도'}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 flex-nowrap">
                                                                <span className="font-bold text-base leading-tight truncate text-foreground">
                                                                    {t.symbol_name || t.symbol}
                                                                </span>
                                                                {heldSymbols?.has(t.symbol) && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 leading-none whitespace-nowrap self-center shrink-0">
                                                                        보유
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs font-semibold text-grey-400 flex items-center gap-1 mt-0.5">
                                                                {t.date} <span className="w-1 h-1 rounded-full bg-current opacity-50" /> {dayOfWeek}    
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-2">
                                                        <div className="font-bold text-base text-foreground">{displayPrice(amount, t.symbol)}</div>
                                                        <div className="text-xs font-semibold text-grey-400">
                                                            {displayPrice(t.price, t.symbol)} × {formatQuantity(t.quantity, t.symbol)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* PnL Row (BUY: unrealized, SELL: realized) */}
                                                {hasCp && (
                                                    <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${getPnlBgClass(pnlPct)}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-muted-foreground">현재가</span>
                                                            <span className="text-sm font-bold text-foreground">{displayPrice(cp, t.symbol)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-sm font-bold ${getPnlColorClass(pnlPct)}`}>
                                                                {formatPnlPercent(pnlPct)}
                                                            </span>
                                                            <span className={`text-sm font-bold ${getPnlColorClass(pnlAmt)}`}>
                                                                {pnlAmt > 0 ? '+' : ''}{displayPrice(pnlAmt, t.symbol)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* SELL realized P&L */}
                                                {hasSellPnl && (
                                                    <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${getPnlBgClass(sellPnlAmt)}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-muted-foreground">실현 손익</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-sm font-bold ${getPnlColorClass(sellPnlPct)}`}>
                                                                {formatPnlPercent(sellPnlPct)}
                                                            </span>
                                                            <span className={`text-sm font-bold ${getPnlColorClass(sellPnlAmt)}`}>
                                                                {sellPnlAmt > 0 ? '+' : ''}{displayPrice(sellPnlAmt, t.symbol)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/10">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); onEdit?.(t); }}
                                                        className="h-9 px-3 rounded-xl gap-1.5 text-xs font-bold"
                                                    >
                                                        <Pencil size={14} /> 수정
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); onDelete?.(t.id); }}
                                                        className="h-9 px-3 rounded-xl gap-1.5 text-xs font-bold text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 size={14} /> 삭제
                                                    </Button>
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
