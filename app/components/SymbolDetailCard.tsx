import React, { useMemo, useState, useEffect } from 'react';
import { Trade } from '@/app/types/trade';
import { formatNumber, formatQuantity, isKRWSymbol } from '@/app/utils/format';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart2 } from 'lucide-react';
import { StockChart } from '@/app/components/charts/StockChart';
import { TradeList } from '@/app/components/TradeList';
import { ChartPeriod } from '@/app/types/stock';
import { useTranslations, useLocale } from 'next-intl';

interface SymbolDetailCardProps {
    symbol: string;
    trades: Trade[];
    currentPrice?: number;
    onClose: () => void;
    darkMode: boolean;
    exchangeRate: number;
    showConverted: boolean;
}

export function SymbolDetailCard({ symbol, trades, currentPrice: initialPrice, darkMode, exchangeRate, showConverted }: SymbolDetailCardProps) {
    const t = useTranslations('symbolDetail');
    const locale = useLocale();
    const numLocale = locale === 'ko' ? 'ko-KR' : 'en-US';
    const [dynamicPrice, setDynamicPrice] = useState<number | undefined>(initialPrice);
    const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
    const [analysisPeriod, setAnalysisPeriod] = useState<ChartPeriod>('1y');

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
    const isUSD = !isKRW && !shouldConvert;
    const formatCurrencyValue = (value: number) => {
        if (isUSD) return `${value < 0 ? '-' : ''}$${formatNumber(Math.abs(value), undefined, numLocale)}`;
        return formatNumber(value, undefined, numLocale);
    };

    const displayedPrice = dynamicPrice ? dynamicPrice * activeExchangeRate : undefined;

    // 이동평균법으로 현재 보유 포지션의 평균 단가 및 손익 계산
    const stats = useMemo(() => {
        // 날짜순 정렬
        const sortedTrades = [...stockTrades].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        let holdingQty = 0;
        let holdingAmt = 0; // 보유 총 원가 (평균단가 = holdingAmt / holdingQty)
        let realizedPnL = 0;

        sortedTrades.forEach(t => {
            const price = t.price * activeExchangeRate;

            if (t.side === 'BUY') {
                holdingAmt += price * t.quantity;
                holdingQty += t.quantity;
            } else {
                // SELL: 현재 평균 단가 기준으로 실현 손익 계산
                const currentAvgCost = holdingQty > 0 ? holdingAmt / holdingQty : 0;
                realizedPnL += (price - currentAvgCost) * t.quantity;
                // 원가 기준으로 보유 금액 차감
                holdingAmt = Math.max(0, holdingAmt - currentAvgCost * t.quantity);
                holdingQty -= t.quantity;
            }
        });

        const positionQty = holdingQty;
        const avgCost = holdingQty > 0 ? holdingAmt / holdingQty : 0;

        // 평가 손익: 현재가 기준 (현재가 없으면 0 표시)
        const unrealizedPnL = displayedPrice && positionQty > 0
            ? positionQty * (displayedPrice - avgCost)
            : 0;

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
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div className={`
                            w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-indigo-500 shadow-inner shrink-0
                            ${darkMode ? 'bg-indigo-500/10' : 'bg-white shadow-indigo-100'}
                        `}>
                            <BarChart2 size={24} strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h2 className={`text-xl md:text-2xl font-bold truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {stockName}
                                </h2>
                                {displayedPrice && (
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-bold shrink-0 ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {t('currentPrice')} {formatCurrencyValue(displayedPrice)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs md:text-sm font-mono font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {symbol}
                                </span>
                                <span className={`w-1 h-1 rounded-full bg-current opacity-30 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                                <span className={`text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-md ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                    {t('totalTrades', { count: stockTrades.length })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatItem
                        label={t('holdingQty')}
                        value={formatQuantity(stats.positionQty, isKRW ? symbol : undefined, numLocale)}
                        icon={<Activity size={16} />}
                        colorClass={darkMode ? 'text-blue-400' : 'text-blue-600'}
                        bgClass={darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}
                        darkMode={darkMode}
                    />
                    <StatItem
                        label={t('avgCost')}
                        value={formatCurrencyValue(stats.avgCost)}
                        icon={<DollarSign size={16} />}
                        colorClass={darkMode ? 'text-amber-400' : 'text-amber-600'}
                        bgClass={darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}
                        darkMode={darkMode}
                    />
                    <StatItem
                        label={t('realizedPnl')}
                        value={stats.realizedPnL !== 0 ? formatCurrencyValue(stats.realizedPnL) : '-'}
                        valueClass={stats.realizedPnL > 0 ? 'text-emerald-500' : stats.realizedPnL < 0 ? 'text-rose-500' : ''}
                        icon={<TrendingUp size={16} />}
                        colorClass={darkMode ? 'text-emerald-400' : 'text-emerald-600'}
                        bgClass={darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}
                        darkMode={darkMode}
                    />
                    <StatItem
                        label={t('unrealizedPnl')}
                        value={stats.positionQty !== 0 ? formatCurrencyValue(stats.unrealizedPnL) : '-'}
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
                        period={analysisPeriod}
                        onPeriodChange={setAnalysisPeriod}
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


interface StatItemProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    valueClass?: string;
    colorClass: string;
    bgClass: string;
    darkMode: boolean;
}

function StatItem({ label, value, icon, valueClass, colorClass, bgClass, darkMode }: StatItemProps) {
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
            <div className={`text-lg md:text-xl font-bold truncate ${valueClass || (darkMode ? 'text-slate-200' : 'text-slate-800')}`}>
                {value}
            </div>
        </div>
    );
}
