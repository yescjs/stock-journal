
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trade } from '@/app/types/trade';
import { formatNumber } from '@/app/utils/format';
import { X, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

interface StockInsightDrawerProps {
    symbol: string | null;
    trades: Trade[];
    currentPrice?: number;
    onClose: () => void;
    darkMode: boolean;
}

export function StockInsightDrawer({ symbol, trades, currentPrice, onClose, darkMode }: StockInsightDrawerProps) {
    
    const stockTrades = useMemo(() => {
        if (!symbol) return [];
        return trades.filter(t => t.symbol === symbol).sort((a, b) => b.date.localeCompare(a.date));
    }, [symbol, trades]);

    const stats = useMemo(() => {
        if (!symbol || stockTrades.length === 0) return null;

        let totalBuyQty = 0;
        let totalBuyAmt = 0;
        let totalSellQty = 0;
        let totalSellAmt = 0;
        let winCount = 0;
        let lossCount = 0;

        // Group by trade for win/loss? 
        // Simple logic: Realized PnL is usually calculated FIFO or Avg Cost.
        // Here we just approximate from 'Realized' logic if we had it per trade.
        // But `Trade` type doesn't store realized Pnl per trade.
        // So we will just show aggregated stats.
        
        // Let's use weighted avg for cost.
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
        
        // PnL logic for "Realized" is complex without explicit matching.
        // Simplified Realized PnL = (AvgSellPrice - AvgBuyPrice) * SoldQty
        const avgSellPrice = totalSellQty > 0 ? totalSellAmt / totalSellQty : 0;
        const realizedPnL = totalSellQty * (avgSellPrice - avgCost);

        // Unrealized
        const unrealizedPnL = positionQty * ((currentPrice || avgCost) - avgCost);
        
        return {
            positionQty,
            avgCost,
            realizedPnL,
            unrealizedPnL,
            totalBuyAmt,
            totalSellAmt,
            // Win rate is hard to calc without closing individual positions. 
            // We can skip winrate here or approximate it by monthly stats if we had them.
            // Let's omit winrate for now or add a placeholder if we want to get fancy later.
        };
    }, [stockTrades, symbol, currentPrice]);

    if (!symbol) return null;

    return (
        <AnimatePresence>
            {symbol && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={`fixed top-0 right-0 h-full w-full max-w-md shadow-2xl z-50 flex flex-col ${darkMode ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-slate-200'}`}
                    >
                        {/* Header */}
                        <div className={`p-6 border-b flex items-center justify-between ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                            <div>
                                <h2 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{symbol}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        거래 내역 {stockTrades.length}건
                                    </span>
                                    {currentPrice && (
                                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold">
                                            현재가 {formatNumber(currentPrice)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            
                            {/* Stats Grid */}
                            {stats && (
                                <div className="grid grid-cols-2 gap-4">
                                    <StatBox 
                                        label="보유 수량" 
                                        value={formatNumber(stats.positionQty)} 
                                        icon={<Activity size={16} />}
                                        darkMode={darkMode}
                                    />
                                    <StatBox 
                                        label="평균 단가" 
                                        value={formatNumber(stats.avgCost)} 
                                        icon={<DollarSign size={16} />}
                                        darkMode={darkMode}
                                    />
                                    <StatBox 
                                        label="실현 손익 (추정)" 
                                        value={formatNumber(stats.realizedPnL)} 
                                        valueClass={stats.realizedPnL > 0 ? 'text-emerald-500' : stats.realizedPnL < 0 ? 'text-rose-500' : ''}
                                        icon={<TrendingUp size={16} />}
                                        darkMode={darkMode}
                                    />
                                    <StatBox 
                                        label="평가 손익" 
                                        value={formatNumber(stats.unrealizedPnL)} 
                                        valueClass={stats.unrealizedPnL > 0 ? 'text-emerald-500' : stats.unrealizedPnL < 0 ? 'text-rose-500' : ''}
                                        icon={stats.unrealizedPnL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                        darkMode={darkMode}
                                    />
                                </div>
                            )}

                            {/* Recent Trades List */}
                            <div>
                                <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    최근 매매 기록
                                </h3>
                                <div className="space-y-3">
                                    {stockTrades.map(trade => (
                                        <div 
                                            key={trade.id} 
                                            className={`p-3 rounded-lg border flex items-center justify-between ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-xs ${trade.side === 'BUY' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                                                    {trade.side === 'BUY' ? '매수' : '매도'}
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                                        {trade.date}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {formatNumber(trade.quantity)}주 @ {formatNumber(trade.price)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-mono text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                    {formatNumber(trade.price * trade.quantity)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function StatBox({ label, value, icon, valueClass, darkMode }: { label: string, value: string, icon: React.ReactNode, valueClass?: string, darkMode: boolean }) {
    return (
        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`flex items-center gap-2 text-xs mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {icon}
                <span>{label}</span>
            </div>
            <div className={`text-lg font-bold ${valueClass || (darkMode ? 'text-slate-100' : 'text-slate-900')}`}>
                {value}
            </div>
        </div>
    );
}
