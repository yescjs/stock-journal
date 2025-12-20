'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { StockChartData, ChartPeriod } from '@/app/types/stock';
import { Trade } from '@/app/types/trade';
import { fetchStockChart } from '@/app/utils/stockApi';
import { TrendingUp, Loader2, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface StockChartProps {
    symbol: string;
    darkMode: boolean;
    trades?: Trade[];
    compact?: boolean;
}

const PERIOD_OPTIONS: Array<{ label: string; value: ChartPeriod }> = [
    { label: '1일', value: '1d' },
    { label: '1주', value: '5d' },
    { label: '1개월', value: '1mo' },
    { label: '3개월', value: '3mo' },
    { label: '1년', value: '1y' },
];

// 이동평균 계산 함수
function calculateMA(data: StockChartData[], period: number): (number | null)[] {
    return data.map((_, index) => {
        if (index < period - 1) return null;
        const sum = data.slice(index - period + 1, index + 1).reduce((acc, d) => acc + d.close, 0);
        return sum / period;
    });
}

export function StockChart({ symbol, darkMode, trades = [], compact = false }: StockChartProps) {
    const [period, setPeriod] = useState<ChartPeriod>('1y');
    const [chartData, setChartData] = useState<StockChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showMA, setShowMA] = useState({ ma5: true, ma20: true, ma60: true });

    useEffect(() => {
        loadChartData();
    }, [symbol, period]);

    // 이동평균선과 범위 데이터가 포함된 차트 데이터
    const chartDataWithMA = useMemo(() => {
        if (chartData.length === 0) return [];

        const ma5 = calculateMA(chartData, 5);
        const ma20 = calculateMA(chartData, 20);
        const ma60 = calculateMA(chartData, 60);

        return chartData.map((d, i) => ({
            ...d,
            ma5: ma5[i],
            ma20: ma20[i],
            ma60: ma60[i],
            // Range for candlestick wick (low to high)
            priceRange: [d.low, d.high] as [number, number],
        }));
    }, [chartData]);

    // Calculate average buy price
    const averageBuyPrice = useMemo(() => {
        const symbolTrades = trades.filter(t => t.symbol === symbol);
        const buyTrades = symbolTrades.filter(t => t.side === 'BUY');
        if (buyTrades.length === 0) return null;

        const totalAmount = buyTrades.reduce((sum, t) => sum + (t.price * t.quantity), 0);
        const totalQuantity = buyTrades.reduce((sum, t) => sum + t.quantity, 0);

        return totalQuantity > 0 ? totalAmount / totalQuantity : null;
    }, [trades, symbol]);

    const loadChartData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetchStockChart(symbol, period);
            setChartData(response.prices);

        } catch (err: any) {
            console.error('Chart loading error:', err);
            setError(err.message || '차트 데이터를 불러올 수 없습니다');
            setChartData([]);
        } finally {
            setLoading(false);
        }
    };

    // Candlestick Shape using range data [low, high]
    const Candlestick = (props: any) => {
        const { x, y, width, height, payload } = props;

        if (!payload || payload.open == null || payload.close == null || payload.high == null || payload.low == null) {
            return null;
        }

        const { open, close, high, low } = payload;
        const isUp = close > open;
        const color = isUp ? '#10b981' : '#ef4444';

        // y is the top of the bar (high), height is the distance from low to high
        const wickTop = y;
        const wickBottom = y + height;
        const wickHeight = height;
        const priceRange = high - low;

        if (priceRange === 0 || wickHeight === 0) {
            const wickX = x + width / 2;
            return (
                <g>
                    <line x1={wickX} y1={wickTop} x2={wickX} y2={wickBottom} stroke={color} strokeWidth={1} />
                </g>
            );
        }

        const pixelsPerPrice = wickHeight / priceRange;

        // Body Y positions
        const bodyTop = wickTop + (high - Math.max(open, close)) * pixelsPerPrice;
        const bodyBottom = wickTop + (high - Math.min(open, close)) * pixelsPerPrice;
        const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

        const wickX = x + width / 2;
        const candleWidth = Math.min(width * 0.7, compact ? 5 : 8);
        const candleX = x + (width - candleWidth) / 2;

        return (
            <g>
                {/* Upper wick */}
                <line x1={wickX} y1={wickTop} x2={wickX} y2={bodyTop} stroke={color} strokeWidth={1} />
                {/* Lower wick */}
                <line x1={wickX} y1={bodyBottom} x2={wickX} y2={wickBottom} stroke={color} strokeWidth={1} />
                {/* Body */}
                <rect
                    x={candleX}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={color}
                    stroke={color}
                    strokeWidth={1}
                />
            </g>
        );
    };

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload[0]) return null;

        const data = payload[0].payload;

        if (data.side) {
            const { date, price, side, quantity } = data;
            return (
                <div className={`rounded-lg p-3 shadow-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className={`text-xs font-bold mb-2 ${side === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {side === 'BUY' ? '매수 ▲' : '매도 ▼'}
                    </div>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between gap-4">
                            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>날짜:</span>
                            <span className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                {format(new Date(date), 'yyyy-MM-dd')}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>수량:</span>
                            <span className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                {quantity.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>가격:</span>
                            <span className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                {price.toLocaleString()}원
                            </span>
                        </div>
                    </div>
                </div>
            );
        }

        const { date, open, high, low, close, volume, ma5, ma20, ma60 } = data;

        return (
            <div className={`rounded-lg p-3 shadow-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`text-xs font-bold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {format(new Date(date), 'yyyy-MM-dd HH:mm')}
                </div>
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between gap-4">
                        <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>시가:</span>
                        <span className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                            {open?.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>고가:</span>
                        <span className="font-bold text-emerald-500">{high?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>저가:</span>
                        <span className="font-bold text-rose-500">{low?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>종가:</span>
                        <span className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                            {close?.toLocaleString()}
                        </span>
                    </div>
                    {volume && (
                        <div className="flex justify-between gap-4 pt-1 border-t border-slate-700/50">
                            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>거래량:</span>
                            <span className={`font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                {(volume / 1000).toFixed(0)}K
                            </span>
                        </div>
                    )}
                    {(ma5 || ma20 || ma60) && (
                        <div className="pt-1 border-t border-slate-700/50 space-y-0.5">
                            {ma5 && showMA.ma5 && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-blue-400">MA5:</span>
                                    <span className="font-bold text-blue-400">{ma5.toLocaleString()}</span>
                                </div>
                            )}
                            {ma20 && showMA.ma20 && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-orange-400">MA20:</span>
                                    <span className="font-bold text-orange-400">{ma20.toLocaleString()}</span>
                                </div>
                            )}
                            {ma60 && showMA.ma60 && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-purple-400">MA60:</span>
                                    <span className="font-bold text-purple-400">{ma60.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const formatXAxis = (timestamp: number) => {
        const date = new Date(timestamp);
        if (period === '1d') {
            return format(date, 'HH:mm');
        } else if (period === '5d') {
            return format(date, 'MM/dd HH:mm');
        }
        return format(date, 'MM/dd');
    };

    const mainChartHeight = compact ? 220 : 300;
    const volumeChartHeight = compact ? 60 : 100;

    if (loading) {
        return (
            <div className={`rounded-2xl p-6 border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`flex flex-col items-center justify-center ${compact ? 'py-8' : 'py-12'}`}>
                    <Loader2 className={`w-6 h-6 animate-spin mb-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        차트 데이터를 불러오는 중...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        // 거래 기록 기반 요약 정보 계산
        const symbolTrades = trades.filter(t => t.symbol === symbol);
        const buyTrades = symbolTrades.filter(t => t.side === 'BUY');
        const sellTrades = symbolTrades.filter(t => t.side === 'SELL');
        const totalBuyQty = buyTrades.reduce((sum, t) => sum + t.quantity, 0);
        const totalSellQty = sellTrades.reduce((sum, t) => sum + t.quantity, 0);
        const holdingQty = totalBuyQty - totalSellQty;

        return (
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-2">
                        <TrendingUp className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        <h3 className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            주가 차트
                        </h3>
                    </div>
                </div>

                {/* 차트 미지원 안내 */}
                <div className={`flex flex-col items-center justify-center ${compact ? 'py-6' : 'py-10'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <TrendingUp className={`w-6 h-6 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    </div>
                    <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        차트 데이터를 지원하지 않는 종목입니다
                    </p>
                    <p className={`text-xs text-center px-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        Yahoo Finance에서 제공하지 않는 종목이거나<br />
                        일시적인 연결 문제일 수 있습니다
                    </p>
                </div>

                {/* 거래 요약 정보 */}
                {symbolTrades.length > 0 && (
                    <div className={`px-4 pb-4`}>
                        <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                            <div className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                📊 거래 기록 요약
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center">
                                    <div className={`text-xs mb-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>매수</div>
                                    <div className={`text-sm font-bold ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                                        {buyTrades.length}건
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-xs mb-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>매도</div>
                                    <div className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                        {sellTrades.length}건
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-xs mb-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>보유</div>
                                    <div className={`text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                                        {holdingQty.toLocaleString()}주
                                    </div>
                                </div>
                            </div>
                            {averageBuyPrice && holdingQty > 0 && (
                                <div className={`mt-3 pt-3 border-t text-center ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                    <div className={`text-xs mb-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>평균 매수가</div>
                                    <div className={`text-sm font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                        {Math.round(averageBuyPrice).toLocaleString()}원
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 다시 시도 버튼 */}
                <div className={`px-4 pb-4 flex justify-center`}>
                    <button
                        onClick={loadChartData}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${darkMode
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                    >
                        🔄 다시 시도
                    </button>
                </div>
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className={`rounded-2xl p-6 border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`flex flex-col items-center justify-center ${compact ? 'py-6' : 'py-12'}`}>
                    <TrendingUp className={`w-6 h-6 mb-2 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        해당 기간의 데이터가 없습니다
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2">
                    <TrendingUp className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <h3 className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        주가 차트
                    </h3>
                    {averageBuyPrice && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                            평균단가 {averageBuyPrice.toLocaleString()}
                        </span>
                    )}
                </div>

                <div className={`flex gap-0.5 p-0.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    {PERIOD_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setPeriod(option.value)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${period === option.value
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : darkMode
                                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* MA Toggle */}
            <div className={`flex items-center gap-2 px-4 py-2 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <span className={`text-[10px] font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>이동평균:</span>
                <button
                    onClick={() => setShowMA(prev => ({ ...prev, ma5: !prev.ma5 }))}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${showMA.ma5
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : darkMode ? 'text-slate-500 border border-slate-700' : 'text-slate-400 border border-slate-200'
                        }`}
                >
                    MA5
                </button>
                <button
                    onClick={() => setShowMA(prev => ({ ...prev, ma20: !prev.ma20 }))}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${showMA.ma20
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : darkMode ? 'text-slate-500 border border-slate-700' : 'text-slate-400 border border-slate-200'
                        }`}
                >
                    MA20
                </button>
                <button
                    onClick={() => setShowMA(prev => ({ ...prev, ma60: !prev.ma60 }))}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${showMA.ma60
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : darkMode ? 'text-slate-500 border border-slate-700' : 'text-slate-400 border border-slate-200'
                        }`}
                >
                    MA60
                </button>
            </div>

            {/* Candlestick Chart */}
            <div className="px-2">
                <ResponsiveContainer width="100%" height={mainChartHeight}>
                    <ComposedChart data={chartDataWithMA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={darkMode ? '#334155' : '#e2e8f0'}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatXAxis}
                            tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 10 }}
                            stroke={darkMode ? '#475569' : '#cbd5e1'}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[
                                (dataMin: number) => dataMin * 0.98,
                                (dataMax: number) => dataMax * 1.02
                            ]}
                            tickCount={5}
                            tickFormatter={(value) => Math.round(value).toLocaleString()}
                            tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 10 }}
                            stroke={darkMode ? '#475569' : '#cbd5e1'}
                            tickLine={false}
                            orientation="right"
                            width={55}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        {averageBuyPrice && (
                            <ReferenceLine
                                y={averageBuyPrice}
                                stroke="#3b82f6"
                                strokeDasharray="5 5"
                                strokeWidth={1.5}
                                label={{
                                    value: `평균 ${Math.round(averageBuyPrice).toLocaleString()}`,
                                    position: 'insideBottomRight',
                                    fill: '#3b82f6',
                                    fontSize: 10,
                                    fontWeight: 'bold',
                                    dy: -5
                                }}
                            />
                        )}

                        {/* Candlestick using range [low, high] */}
                        <Bar
                            dataKey="priceRange"
                            shape={<Candlestick />}
                            isAnimationActive={false}
                        />

                        {showMA.ma5 && (
                            <Line
                                type="monotone"
                                dataKey="ma5"
                                stroke="#3b82f6"
                                dot={false}
                                strokeWidth={1.5}
                                isAnimationActive={false}
                            />
                        )}
                        {showMA.ma20 && (
                            <Line
                                type="monotone"
                                dataKey="ma20"
                                stroke="#f97316"
                                dot={false}
                                strokeWidth={1.5}
                                isAnimationActive={false}
                            />
                        )}
                        {showMA.ma60 && (
                            <Line
                                type="monotone"
                                dataKey="ma60"
                                stroke="#a855f7"
                                dot={false}
                                strokeWidth={1.5}
                                isAnimationActive={false}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Volume Chart */}
            <div className={`px-2 pt-2 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className={`flex items-center gap-1.5 px-2 mb-1`}>
                    <Activity className={`w-3 h-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        거래량
                    </span>
                </div>
                <ResponsiveContainer width="100%" height={volumeChartHeight}>
                    <ComposedChart data={chartDataWithMA} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatXAxis}
                            tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 9 }}
                            stroke={darkMode ? '#475569' : '#cbd5e1'}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 9 }}
                            stroke={darkMode ? '#475569' : '#cbd5e1'}
                            tickLine={false}
                            axisLine={false}
                            orientation="right"
                            width={45}
                            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                        />
                        <Bar dataKey="volume" radius={[2, 2, 0, 0]}>
                            {chartDataWithMA.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.close >= entry.open ? '#10b981' : '#ef4444'}
                                    opacity={0.6}
                                />
                            ))}
                        </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
