import React, { useMemo } from 'react';
import { Trade } from '@/app/types/trade';
import { formatNumber } from '@/app/utils/format';
import { TrendingUp, TrendingDown, DollarSign, Activity, X } from 'lucide-react';
import { StockChart } from '@/app/components/charts/StockChart';

interface SymbolDetailCardProps {
    symbol: string;
    trades: Trade[];
    currentPrice?: number;
    onClose: () => void;
    darkMode: boolean;
}

export function SymbolDetailCard({ symbol, trades, currentPrice, onClose, darkMode }: SymbolDetailCardProps) {
    const stockTrades = useMemo(() => {
        return trades.filter(t => t.symbol === symbol);
    }, [symbol, trades]);

    const stats = useMemo(() => {
        let totalBuyQty = 0;
        let totalBuyAmt = 0;
        let totalSellQty = 0;
        let totalSellAmt = 0;

        stockTrades.forEach(t => {
            const amt = t.price * t.quantity;
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
        const unrealizedPnL = positionQty * ((currentPrice || avgCost) - avgCost);

        return {
            positionQty,
            avgCost,
            realizedPnL,
            unrealizedPnL,
        };
    }, [stockTrades, currentPrice]);

    // Get stock name from trades (use first trade's symbol_name if available)
    const stockName = useMemo(() => {
        const tradeWithName = stockTrades.find(t => t.symbol_name);
        return tradeWithName?.symbol_name || symbol;
    }, [stockTrades, symbol]);

    return (
        <div className="space-y-4">
            {/* Header Card */}
            <div className={`rounded-2xl p-5 shadow-sm border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-indigo-600' : 'bg-indigo-100'}`}>
                            <Activity className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-indigo-600'}`} />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                {stockName}
                            </h2>
                            {stockName !== symbol && (
                                <p className={`text-xs font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {symbol}
                                </p>
                            )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {stockTrades.length} Trades
                        </span>
                        {currentPrice && (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold">
                                Now {formatNumber(currentPrice)}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatItem
                        label="보유 수량"
                        value={formatNumber(stats.positionQty)}
                        icon={<Activity size={14} />}
                        darkMode={darkMode}
                    />
                    <StatItem
                        label="평균 단가"
                        value={formatNumber(stats.avgCost)}
                        icon={<DollarSign size={14} />}
                        darkMode={darkMode}
                    />
                    <StatItem
                        label="실현 손익"
                        value={formatNumber(stats.realizedPnL)}
                        valueClass={stats.realizedPnL > 0 ? 'text-emerald-500' : stats.realizedPnL < 0 ? 'text-rose-500' : ''}
                        icon={<TrendingUp size={14} />}
                        darkMode={darkMode}
                    />
                    <StatItem
                        label="평가 손익"
                        value={formatNumber(stats.unrealizedPnL)}
                        valueClass={stats.unrealizedPnL > 0 ? 'text-emerald-500' : stats.unrealizedPnL < 0 ? 'text-rose-500' : ''}
                        icon={stats.unrealizedPnL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        darkMode={darkMode}
                    />
                </div>
            </div>

            {/* Stock Chart Section */}
            <StockChart
                symbol={symbol}
                darkMode={darkMode}
                trades={trades}
                compact={true}
            />
        </div>
    );
}

function StatItem({ label, value, icon, valueClass, darkMode }: any) {
    return (
        <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`flex items-center gap-1.5 text-xs mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {icon}
                <span>{label}</span>
            </div>
            <div className={`text-lg font-bold ${valueClass || (darkMode ? 'text-slate-200' : 'text-slate-900')}`}>
                {value}
            </div>
        </div>
    );
}

