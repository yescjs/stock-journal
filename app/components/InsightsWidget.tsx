'use client';

import React from 'react';
import { InsightData } from '@/app/types/stats';
import { formatNumber } from '@/app/utils/format';
import { TrendingUp, TrendingDown, Calendar, Tag, Target, Flame, Award, AlertTriangle } from 'lucide-react';

interface InsightsWidgetProps {
    insights: InsightData;
    darkMode: boolean;
}

export function InsightsWidget({ insights, darkMode }: InsightsWidgetProps) {
    const cardClass = `glass-card p-5 rounded-2xl border transition-all hover:-translate-y-1 duration-300 ${
        darkMode ? 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/60' : 'bg-white/60 border-white/60 shadow-sm hover:shadow-lg hover:bg-white/80'
    }`;

    // Helper to render the header (Icon Box + Title)
    const renderHeader = (icon: React.ReactNode, title: string, colorClass: string, bgClass: string) => (
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner ${bgClass} ${colorClass}`}>
                {icon}
            </div>
            <span className={`text-xs font-bold tracking-wider uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {title}
            </span>
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-5 mb-8">
            {/* Best Day */}
            <div className={cardClass}>
                {renderHeader(
                    <Calendar size={20} strokeWidth={2.5} />,
                    '최고의 요일',
                    darkMode ? 'text-indigo-300' : 'text-indigo-600',
                    darkMode ? 'bg-indigo-500/20' : 'bg-indigo-50'
                )}
                <div className={`text-2xl font-black tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {insights.bestDay || '-'}
                </div>
            </div>

            {/* Best Tag */}
            <div className={cardClass}>
                {renderHeader(
                    <Tag size={20} strokeWidth={2.5} />,
                    '최고의 전략',
                    darkMode ? 'text-purple-300' : 'text-purple-600',
                    darkMode ? 'bg-purple-500/20' : 'bg-purple-50'
                )}
                <div className={`text-xl font-black tracking-tight truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {insights.bestTag ? `#${insights.bestTag}` : '-'}
                </div>
            </div>

            {/* Win Rate (Long) */}
            <div className={cardClass}>
                {renderHeader(
                    <Target size={20} strokeWidth={2.5} />,
                    '매수 승률',
                    darkMode ? 'text-emerald-300' : 'text-emerald-600',
                    darkMode ? 'bg-emerald-500/20' : 'bg-emerald-50'
                )}
                <div className={`text-2xl font-black tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {insights.longWinRate.toFixed(1)}%
                </div>
            </div>

            {/* Current Streak */}
            <div className={cardClass}>
                {renderHeader(
                    <Flame size={20} strokeWidth={2.5} />,
                    '현재 연속',
                    insights.currentStreak.type === 'win' ? (darkMode ? 'text-orange-300' : 'text-orange-600') : (darkMode ? 'text-slate-400' : 'text-slate-500'),
                    insights.currentStreak.type === 'win' ? (darkMode ? 'bg-orange-500/20' : 'bg-orange-50') : (darkMode ? 'bg-slate-700/50' : 'bg-slate-100')
                )}
                <div className={`text-2xl font-black tracking-tight flex items-center gap-1 ${insights.currentStreak.type === 'win' ? 'text-emerald-500' : insights.currentStreak.type === 'loss' ? 'text-rose-500' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                    {insights.currentStreak.count > 0 ? (
                        <>
                            {insights.currentStreak.count}연{insights.currentStreak.type === 'win' ? '승' : '패'}
                            {insights.currentStreak.type === 'win' && <Flame size={18} className="animate-pulse" />}
                        </>
                    ) : '-'}
                </div>
            </div>

            {/* Max Win Streak */}
            <div className={cardClass}>
                {renderHeader(
                    <Award size={20} strokeWidth={2.5} />,
                    '최대 연승',
                    darkMode ? 'text-amber-300' : 'text-amber-600',
                    darkMode ? 'bg-amber-500/20' : 'bg-amber-50'
                )}
                <div className="text-2xl font-black tracking-tight text-amber-500">
                    {insights.maxWinStreak > 0 ? `${insights.maxWinStreak}연승` : '-'}
                </div>
            </div>

            {/* Max Win */}
            <div className={cardClass}>
                {renderHeader(
                    <TrendingUp size={20} strokeWidth={2.5} />,
                    '최대 수익',
                    darkMode ? 'text-teal-300' : 'text-teal-600',
                    darkMode ? 'bg-teal-500/20' : 'bg-teal-50'
                )}
                <div className="text-2xl font-black tracking-tight text-teal-500">
                    +{formatNumber(insights.maxWin)}
                </div>
            </div>

            {/* Max Loss */}
            <div className={cardClass}>
                {renderHeader(
                    <TrendingDown size={20} strokeWidth={2.5} />,
                    '최대 손실',
                    darkMode ? 'text-rose-300' : 'text-rose-600',
                    darkMode ? 'bg-rose-500/20' : 'bg-rose-50'
                )}
                <div className="text-2xl font-black tracking-tight text-rose-500">
                    {insights.maxLoss === 0 ? '-' : formatNumber(insights.maxLoss)}
                </div>
            </div>

            {/* Max Drawdown */}
            <div className={cardClass}>
                {renderHeader(
                    <AlertTriangle size={20} strokeWidth={2.5} />,
                    '최대 드로다운',
                    darkMode ? 'text-red-300' : 'text-red-600',
                    darkMode ? 'bg-red-500/20' : 'bg-red-50'
                )}
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black tracking-tight text-red-500">
                        {insights.maxDrawdown === 0 ? '-' : formatNumber(insights.maxDrawdown)}
                    </span>
                    {insights.maxDrawdownPercent !== 0 && (
                        <span className="text-xs font-bold text-red-400 opacity-80">
                            ({insights.maxDrawdownPercent.toFixed(1)}%)
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
