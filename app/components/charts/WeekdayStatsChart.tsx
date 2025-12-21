'use client';

import React from 'react';
import { WeekdayStats } from '@/app/types/stats';
import { formatNumber } from '@/app/utils/format';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';

interface WeekdayStatsChartProps {
    data: WeekdayStats[];
    darkMode: boolean;
}

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export function WeekdayStatsChart({ data, darkMode }: WeekdayStatsChartProps) {
    if (data.length === 0) {
        return (
            <div className={'rounded-2xl border p-6 flex flex-col items-center justify-center ' + (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}>
                <Calendar size={24} className="text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">데이터가 부족합니다</p>
            </div>
        );
    }

    const maxTradeCount = Math.max(...data.map(d => d.tradeCount));
    const maxPnL = Math.max(...data.map(d => Math.abs(d.totalPnL)));

    // 최고/최저 요일 찾기
    const bestDay = [...data].sort((a, b) => b.totalPnL - a.totalPnL)[0];
    const worstDay = [...data].sort((a, b) => a.totalPnL - b.totalPnL)[0];

    const cardClass = 'rounded-2xl border ' + (darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm');
    const labelClass = 'text-[10px] font-bold uppercase tracking-wider ' + (darkMode ? 'text-slate-500' : 'text-slate-400');

    return (
        <div className={cardClass + ' p-6'}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className={'text-lg font-bold flex items-center gap-2 ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                        <Calendar size={20} className={darkMode ? 'text-cyan-400' : 'text-cyan-600'} />
                        요일별 성과
                    </h3>
                    <p className={'text-xs mt-1 ' + (darkMode ? 'text-slate-500' : 'text-slate-400')}>
                        어떤 요일에 수익이 좋은지 분석합니다
                    </p>
                </div>

                {/* Best/Worst indicators */}
                <div className="flex gap-3">
                    {bestDay && bestDay.totalPnL > 0 && (
                        <div className={'flex items-center gap-2 px-3 py-1.5 rounded-lg ' + (darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50')}>
                            <TrendingUp size={14} className="text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-500">
                                {WEEKDAY_NAMES[bestDay.dayIndex]}요일 최고
                            </span>
                        </div>
                    )}
                    {worstDay && worstDay.totalPnL < 0 && (
                        <div className={'flex items-center gap-2 px-3 py-1.5 rounded-lg ' + (darkMode ? 'bg-rose-500/10' : 'bg-rose-50')}>
                            <TrendingDown size={14} className="text-rose-500" />
                            <span className="text-xs font-bold text-rose-500">
                                {WEEKDAY_NAMES[worstDay.dayIndex]}요일 주의
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Weekday Bars */}
            <div className="grid grid-cols-7 gap-2">
                {data.map((day) => {
                    const pnlPercent = maxPnL > 0 ? Math.abs(day.totalPnL) / maxPnL * 100 : 0;
                    const isPositive = day.totalPnL >= 0;
                    const isBest = bestDay && day.dayIndex === bestDay.dayIndex && day.totalPnL > 0;
                    const isWorst = worstDay && day.dayIndex === worstDay.dayIndex && day.totalPnL < 0;

                    return (
                        <div
                            key={day.dayIndex}
                            className={
                                'rounded-xl p-3 text-center transition-all ' +
                                (isBest
                                    ? (darkMode ? 'bg-emerald-500/20 ring-2 ring-emerald-500/50' : 'bg-emerald-50 ring-2 ring-emerald-300')
                                    : isWorst
                                        ? (darkMode ? 'bg-rose-500/20 ring-2 ring-rose-500/50' : 'bg-rose-50 ring-2 ring-rose-300')
                                        : (darkMode ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'))
                            }
                        >
                            {/* Weekday Name */}
                            <div className={
                                'text-sm font-black mb-2 ' +
                                (day.dayIndex === 0 ? 'text-rose-500' : day.dayIndex === 6 ? 'text-blue-500' : (darkMode ? 'text-slate-300' : 'text-slate-700'))
                            }>
                                {WEEKDAY_NAMES[day.dayIndex]}
                            </div>

                            {/* Trade count */}
                            <div className={labelClass}>거래</div>
                            <div className={'text-lg font-bold mb-2 ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                                {day.tradeCount}
                            </div>

                            {/* Win Rate Bar */}
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mb-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${day.winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    style={{ width: `${day.winRate}%` }}
                                />
                            </div>
                            <div className={`text-xs font-bold ${day.winRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {day.winRate.toFixed(0)}%
                            </div>

                            {/* PnL */}
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <div className={labelClass}>손익</div>
                                <div className={
                                    'text-sm font-bold tabular-nums ' +
                                    (isPositive ? 'text-emerald-500' : 'text-rose-500')
                                }>
                                    {isPositive ? '+' : ''}{formatNumber(day.totalPnL)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary Stats */}
            <div className={'grid grid-cols-3 gap-4 mt-6 pt-6 border-t ' + (darkMode ? 'border-slate-800' : 'border-slate-100')}>
                <div className="text-center">
                    <div className={labelClass}>총 거래</div>
                    <div className={'text-xl font-black ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                        {data.reduce((sum, d) => sum + d.tradeCount, 0)}
                    </div>
                </div>
                <div className="text-center">
                    <div className={labelClass}>평균 승률</div>
                    <div className={'text-xl font-black ' + (darkMode ? 'text-slate-100' : 'text-slate-900')}>
                        {(data.reduce((sum, d) => sum + d.winRate, 0) / data.filter(d => d.tradeCount > 0).length || 0).toFixed(0)}%
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
            </div>
        </div>
    );
}

