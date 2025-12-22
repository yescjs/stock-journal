'use client';

import React from 'react';
import { HoldingPeriodStats } from '@/app/types/stats';
import { formatNumber } from '@/app/utils/format';
import { Clock, TrendingUp, TrendingDown, Timer } from 'lucide-react';

interface HoldingPeriodChartProps {
    data: HoldingPeriodStats[];
    darkMode: boolean;
}

export function HoldingPeriodChart({ data, darkMode }: HoldingPeriodChartProps) {
    if (data.length === 0) {
        return (
            <div className={'rounded-2xl border p-6 flex flex-col items-center justify-center ' + (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}>
                <Clock size={24} className="text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">보유 기간 데이터가 부족합니다</p>
            </div>
        );
    }

    const maxTradeCount = Math.max(...data.map(d => d.tradeCount));
    const maxPnL = Math.max(...data.map(d => Math.abs(d.totalPnL)));

    // 최고/최저 기간 찾기
    const bestPeriod = [...data].sort((a, b) => b.winRate - a.winRate)[0];
    const worstPeriod = [...data].sort((a, b) => a.winRate - b.winRate)[0];

    const cardClass = 'rounded-2xl border ' + (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm');
    const labelClass = 'text-[10px] font-bold uppercase tracking-wider ' + (darkMode ? 'text-slate-500' : 'text-slate-400');

    return (
        <div className={cardClass + ' p-6'}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className={'text-lg font-bold flex items-center gap-2 ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                        <Timer size={20} className={darkMode ? 'text-amber-400' : 'text-amber-600'} />
                        보유 기간별 성과
                    </h3>
                    <p className={'text-xs mt-1 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                        단타 vs 스윙 vs 중장기 성과 비교
                    </p>
                </div>

                {/* Best/Worst indicators */}
                <div className="flex gap-3">
                    {bestPeriod && bestPeriod.winRate > 50 && (
                        <div className={'flex items-center gap-2 px-3 py-1.5 rounded-lg ' + (darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50')}>
                            <TrendingUp size={14} className="text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-500">
                                {bestPeriod.period} 최고 ({bestPeriod.winRate.toFixed(0)}%)
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Periods Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {data.map((period) => {
                    const isBest = bestPeriod && period.period === bestPeriod.period && period.winRate > 50;
                    const isPositive = period.totalPnL >= 0;

                    return (
                        <div
                            key={period.periodKey}
                            className={
                                'rounded-xl p-2.5 transition-all ' +
                                (isBest
                                    ? (darkMode ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50' : 'bg-emerald-50 ring-1 ring-emerald-300')
                                    : (darkMode ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'))
                            }
                        >
                            {/* Period Name */}
                            <div className={'text-xs font-black mb-2 text-center ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                                {period.period}
                            </div>

                            {/* Stats */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">거래</span>
                                    <span className={'text-xs font-bold ' + (darkMode ? 'text-slate-200' : 'text-slate-700')}>
                                        {period.tradeCount}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">승률</span>
                                    <span className={`text-xs font-bold ${period.winRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {period.winRate.toFixed(0)}%
                                    </span>
                                </div>

                                {/* Win Rate Bar */}
                                <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${period.winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                        style={{ width: `${Math.min(100, period.winRate)}%` }}
                                    />
                                </div>

                                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">손익</span>
                                    <span className={
                                        'text-[10px] font-bold tabular-nums ' +
                                        (isPositive ? 'text-emerald-500' : 'text-rose-500')
                                    }>
                                        {isPositive ? '+' : ''}{formatNumber(period.totalPnL)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className={'grid grid-cols-4 gap-4 mt-6 pt-6 border-t ' + (darkMode ? 'border-slate-800' : 'border-slate-100')}>
                <div className="text-center">
                    <div className={labelClass}>총 거래</div>
                    <div className={'text-xl font-black ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                        {data.reduce((sum, d) => sum + d.tradeCount, 0)}
                    </div>
                </div>
                <div className="text-center">
                    <div className={labelClass}>평균 승률</div>
                    <div className={'text-xl font-black ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                        {(data.reduce((sum, d) => sum + d.winRate * d.tradeCount, 0) /
                            Math.max(1, data.reduce((sum, d) => sum + d.tradeCount, 0))).toFixed(0)}%
                    </div>
                </div>
                <div className="text-center">
                    <div className={labelClass}>총 손익</div>
                    <div className={
                        'text-xl font-black ' +
                        (data.reduce((sum, d) => sum + d.totalPnL, 0) >= 0 ? 'text-emerald-500' : 'text-rose-500')
                    }>
                        {formatNumber(data.reduce((sum, d) => sum + d.totalPnL, 0))}
                    </div>
                </div>
                <div className="text-center">
                    <div className={labelClass}>첫 거래</div>
                    <div className={'text-xl font-black ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                        {data[0]?.period || '-'}
                    </div>
                </div>
            </div>
        </div>
    );
}
