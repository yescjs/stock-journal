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
    const cardClass = `relative overflow-hidden p-5 rounded-2xl border transition-all hover:shadow-md ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`;

    // Helper to render the header (Icon Box + Title)
    const renderHeader = (icon: React.ReactNode, title: string, colorClass: string, bgClass: string) => (
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${bgClass} ${colorClass}`}>
                {icon}
            </div>
            <span className={`text-xs font-bold tracking-tight ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {title}
            </span>
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
            {/* Best Day */}
            <div className={cardClass}>
                {renderHeader(
                    <Calendar size={18} strokeWidth={2.5} />,
                    '최고의 요일',
                    darkMode ? 'text-indigo-400' : 'text-indigo-600',
                    darkMode ? 'bg-indigo-500/20' : 'bg-indigo-50'
                )}
                <div className={`text-2xl font-black tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {insights.bestDay || '-'}
                </div>
            </div>

            {/* Best Tag */}
            <div className={cardClass}>
                {renderHeader(
                    <Tag size={18} strokeWidth={2.5} />,
                    '최고의 전략',
                    darkMode ? 'text-purple-400' : 'text-purple-600',
                    darkMode ? 'bg-purple-500/20' : 'bg-purple-50'
                )}
                <div className={`text-xl font-black tracking-tight truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {insights.bestTag ? `#${insights.bestTag}` : '-'}
                </div>
            </div>

            {/* Win Rate (Long) */}
            <div className={cardClass}>
                {renderHeader(
                    <Target size={18} strokeWidth={2.5} />,
                    '매수 승률',
                    darkMode ? 'text-emerald-400' : 'text-emerald-600',
                    darkMode ? 'bg-emerald-500/20' : 'bg-emerald-50'
                )}
                <div className={`text-2xl font-black tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {insights.longWinRate.toFixed(1)}%
                </div>
            </div>

            {/* Current Streak */}
            <div className={cardClass}>
                {renderHeader(
                    <Flame size={18} strokeWidth={2.5} />,
                    '현재 연속',
                    insights.currentStreak.type === 'win' ? (darkMode ? 'text-orange-400' : 'text-orange-600') : (darkMode ? 'text-slate-400' : 'text-slate-500'),
                    insights.currentStreak.type === 'win' ? (darkMode ? 'bg-orange-500/20' : 'bg-orange-50') : (darkMode ? 'bg-slate-700/50' : 'bg-slate-100')
                )}
                <div className={`text-2xl font-black tracking-tight flex items-center gap-1 ${insights.currentStreak.type === 'win' ? 'text-emerald-500' : insights.currentStreak.type === 'loss' ? 'text-rose-500' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                    {insights.currentStreak.count > 0 ? (
                        <>
                            {insights.currentStreak.count}연{insights.currentStreak.type === 'win' ? '승' : '패'}
                            {insights.currentStreak.type === 'win' && <span className="text-lg">🔥</span>}
                        </>
                    ) : '-'}
                </div>
            </div>

            {/* Max Win Streak */}
            <div className={cardClass}>
                {renderHeader(
                    <Award size={18} strokeWidth={2.5} />,
                    '최대 연승',
                    darkMode ? 'text-amber-400' : 'text-amber-600',
                    darkMode ? 'bg-amber-500/20' : 'bg-amber-50'
                )}
                <div className="text-2xl font-black tracking-tight text-amber-500">
                    {insights.maxWinStreak > 0 ? `${insights.maxWinStreak}연승` : '-'}
                </div>
            </div>

            {/* Max Win */}
            <div className={cardClass}>
                {renderHeader(
                    <TrendingUp size={18} strokeWidth={2.5} />,
                    '최대 수익',
                    darkMode ? 'text-teal-400' : 'text-teal-600',
                    darkMode ? 'bg-teal-500/20' : 'bg-teal-50'
                )}
                <div className="text-2xl font-black tracking-tight text-teal-500">
                    +{formatNumber(insights.maxWin)}
                </div>
            </div>

            {/* Max Loss */}
            <div className={cardClass}>
                {renderHeader(
                    <TrendingDown size={18} strokeWidth={2.5} />,
                    '최대 손실',
                    darkMode ? 'text-rose-400' : 'text-rose-600',
                    darkMode ? 'bg-rose-500/20' : 'bg-rose-50'
                )}
                <div className="text-2xl font-black tracking-tight text-rose-500">
                    {insights.maxLoss === 0 ? '-' : formatNumber(insights.maxLoss)}
                </div>
            </div>

            {/* Max Drawdown */}
            <div className={cardClass}>
                {renderHeader(
                    <AlertTriangle size={18} strokeWidth={2.5} />,
                    '최대 드로다운',
                    darkMode ? 'text-red-400' : 'text-red-600',
                    darkMode ? 'bg-red-500/20' : 'bg-red-50'
                )}
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black tracking-tight text-red-500">
                        {insights.maxDrawdown === 0 ? '-' : formatNumber(insights.maxDrawdown)}
                    </span>
                    {insights.maxDrawdownPercent !== 0 && (
                        <span className="text-xs font-bold text-red-400">
                            ({insights.maxDrawdownPercent.toFixed(1)}%)
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

