import React, { useMemo, useState, useEffect } from 'react';
import { Trade } from '@/app/types/trade';
import { formatNumber, formatQuantity, isKRWSymbol } from '@/app/utils/format';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart2 } from 'lucide-react';
import { StockChart } from '@/app/components/charts/StockChart';
import { TradeList } from '@/app/components/TradeList';

interface SymbolDetailCardProps {
    symbol: string;
    trades: Trade[];
    currentPrice?: number;
    onClose: () => void;
    darkMode: boolean;
    exchangeRate: number;
    showConverted: boolean;
}

export function SymbolDetailCard({ symbol, trades, currentPrice: initialPrice, onClose, darkMode, exchangeRate, showConverted }: SymbolDetailCardProps) {
    const [dynamicPrice, setDynamicPrice] = useState<number | undefined>(initialPrice);
    const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (initialPrice) {
            setTimeout(() => setDynamicPrice(initialPrice), 0);
        }
    }, [initialPrice]);

    const stockTrades = useMemo(() => {
        return trades.filter(t => t.symbol === symbol);
    }, [symbol, trades]);

    // Currency Conversion Logic
    const isKRW = isKRWSymbol(symbol);
    const shouldConvert = !isKRW && showConverted;
    const activeExchangeRate = shouldConvert ? exchangeRate : 1;
    const currencyUnit = isKRW || shouldConvert ? '원' : '$';

    const displayedPrice = dynamicPrice ? dynamicPrice * activeExchangeRate : undefined;

    // ... stats calculation code ...
    const stats = useMemo(() => {
        let totalBuyQty = 0;
        let totalBuyAmt = 0;
        let totalSellQty = 0;
        let totalSellAmt = 0;

        stockTrades.forEach(t => {
            const dateStr = t.date; // or use timestamp if available, but assuming daily rate isn't per-transaction here for simplicity, or we use current rate for simplicity in this view
            // For PnL calculation in summary, we usually use the current active exchange rate for consistency with "Current Value"

            const price = t.price * activeExchangeRate;
            const amt = price * t.quantity;

            if (t.side === 'BUY') {
                totalBuyQty += t.quantity;
                totalBuyAmt += amt;
            } else {
                totalSellQty += t.quantity;
                totalSellAmt += amt;
            }
        });

        const positionQty = totalBuyQty - totalSellQty;
        const avgCost = totalBuyQty > 0 ? totalBuyAmt / totalBuyQty : 0;
        const avgSellPrice = totalSellQty > 0 ? totalSellAmt / totalSellQty : 0;
        const realizedPnL = totalSellQty * (avgSellPrice - avgCost);

        // Unrealized PnL: (Current Price - Avg Cost) * Held Qty
        // displayedPrice is the converted current price
        const currentVal = displayedPrice || avgCost;
        const unrealizedPnL = positionQty * (currentVal - avgCost);

        return {
            positionQty,
            avgCost,
            realizedPnL,
            unrealizedPnL,
        };
    }, [stockTrades, displayedPrice, activeExchangeRate]);

    const stockName = useMemo(() => {
        const tradeWithName = stockTrades.find(t => t.symbol_name);
        return tradeWithName?.symbol_name || symbol;
    }, [stockTrades, symbol]);

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className={`
                rounded-3xl p-6 border transition-all glass-card
                ${darkMode ? 'bg-slate-900/60 border-slate-700/50 shadow-2xl shadow-black/20' : 'bg-white/80 border-white/60 shadow-xl shadow-indigo-100/40'}
            `}>
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className={`
                            w-14 h-14 rounded-2xl flex items-center justify-center text-indigo-500 shadow-inner
                            ${darkMode ? 'bg-indigo-500/10' : 'bg-white shadow-indigo-100'}
                        `}>
                            <BarChart2 size={28} strokeWidth={1.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {stockName}
                                </h2>
                                {displayedPrice && (
                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                        현재가 {currencyUnit === '$' ? '$' : ''}{formatNumber(displayedPrice)}{currencyUnit === '원' ? '원' : ''}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-mono font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {symbol}
                                </span>
                                <span className={`w-1 h-1 rounded-full bg-current opacity-30 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                    총 {stockTrades.length}건의 거래
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatItem
                        label="보유 수량"
                        value={formatQuantity(stats.positionQty, isKRW ? symbol : undefined)} // Keep qty format native
                        icon={<Activity size={16} />}
                        colorClass={darkMode ? 'text-blue-400' : 'text-blue-600'}
                        bgClass={darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}
                        darkMode={darkMode}
                    />
                    <StatItem
                        label="평균 단가"
                        value={(currencyUnit === '$' ? '$' : '') + formatNumber(stats.avgCost) + (currencyUnit === '원' ? '원' : '')}
                        icon={<DollarSign size={16} />}
                        colorClass={darkMode ? 'text-amber-400' : 'text-amber-600'}
                        bgClass={darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}
                        darkMode={darkMode}
                    />
                    <StatItem
                        label="실현 손익"
                        value={stats.realizedPnL !== 0 ? (currencyUnit === '$' ? '$' : '') + formatNumber(stats.realizedPnL) + (currencyUnit === '원' ? '원' : '') : '-'}
                        valueClass={stats.realizedPnL > 0 ? 'text-emerald-500' : stats.realizedPnL < 0 ? 'text-rose-500' : ''}
                        icon={<TrendingUp size={16} />}
                        colorClass={darkMode ? 'text-emerald-400' : 'text-emerald-600'}
                        bgClass={darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}
                        darkMode={darkMode}
                    />
                    <StatItem
                        label="평가 손익"
                        value={stats.positionQty !== 0 ? (currencyUnit === '$' ? '$' : '') + formatNumber(stats.unrealizedPnL) + (currencyUnit === '원' ? '원' : '') : '-'}
                        valueClass={stats.unrealizedPnL > 0 ? 'text-emerald-500' : stats.unrealizedPnL < 0 ? 'text-rose-500' : ''}
                        icon={stats.unrealizedPnL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        colorClass={stats.unrealizedPnL >= 0 ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-rose-400' : 'text-rose-600')}
                        bgClass={stats.unrealizedPnL >= 0 ? (darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50') : (darkMode ? 'bg-rose-500/10' : 'bg-rose-50')}
                        darkMode={darkMode}
                    />
                </div>
            </div>

            {/* Content Section */}
            <div className={`rounded-3xl p-1 border overflow-hidden min-h-[400px] ${darkMode ? 'bg-slate-900/40 border-slate-700/50' : 'bg-white/60 border-white/60'}`}>
                <div className="space-y-4">
                    <StockChart
                        symbol={symbol}
                        darkMode={darkMode}
                        trades={trades}
                        compact={true}
                        onCurrentPriceLoad={(price) => setDynamicPrice(price)}
                    />
                    <div className="px-2 pb-2">
                         <TradeList
                             trades={stockTrades}
                             toggleMonth={(key) => setOpenMonths(prev => ({ ...prev, [key]: !prev[key] }))}
                             darkMode={darkMode}
                             exchangeRate={exchangeRate}
                             showConverted={showConverted}
                             openMonths={openMonths}
                         />

                    </div>
                </div>
            </div>
        </div>
    );
}


function StatItem({ label, value, icon, valueClass, colorClass, bgClass, darkMode }: any) {
    return (
        <div className={`
            p-4 rounded-2xl border transition-all flex flex-col justify-between
            ${darkMode ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50' : 'bg-white/50 border-white hover:bg-white hover:shadow-md'}
        `}>
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${bgClass} ${colorClass}`}>
                    {icon}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {label}
                </span>
            </div>
            <div className={`text-xl font-bold ${valueClass || (darkMode ? 'text-slate-200' : 'text-slate-800')}`}>
                {value}
            </div>
        </div>
    );
}
